"use client";

// Lightweight browser-side LSP client: talks JSON-RPC directly over a plain
// WebSocket to our lsp-gateway, and binds the results into Monaco's own
// completion/hover/diagnostics APIs. Deliberately avoids monaco-languageclient
// (whose API has shifted significantly across versions and pulls in a full
// VS Code service emulation layer) in favor of something small and direct.

// Hosted gateway, used unless the visitor has pointed the site at a
// gateway of their own (see Run Settings / lib/runnerSettings.js).
const DEFAULT_LSP_GATEWAY_HOST = "wss://lsp.neumontcoding.club";

// Languages that need a real backend language server. JS/TS are excluded —
// Monaco's built-in worker already provides full IntelliSense for those
// with zero backend involvement.
const BACKEND_LANGUAGES = new Set(["python", "c", "cpp", "rust", "go", "java"]);

export function languageNeedsBackend(lang) {
  return BACKEND_LANGUAGES.has(lang);
}

function toLspPosition(monacoPosition) {
  return {
    line: monacoPosition.lineNumber - 1,
    character: monacoPosition.column - 1
  };
}

function toMonacoRange(monaco, lspRange) {
  return new monaco.Range(
    lspRange.start.line + 1,
    lspRange.start.character + 1,
    lspRange.end.line + 1,
    lspRange.end.character + 1
  );
}

// LSP CompletionItemKind -> monaco.languages.CompletionItemKind, mapped
// explicitly by meaning rather than assumed to line up numerically.
function completionKind(monaco, lspKind) {
  const map = {
    1: monaco.languages.CompletionItemKind.Text,
    2: monaco.languages.CompletionItemKind.Method,
    3: monaco.languages.CompletionItemKind.Function,
    4: monaco.languages.CompletionItemKind.Constructor,
    5: monaco.languages.CompletionItemKind.Field,
    6: monaco.languages.CompletionItemKind.Variable,
    7: monaco.languages.CompletionItemKind.Class,
    8: monaco.languages.CompletionItemKind.Interface,
    9: monaco.languages.CompletionItemKind.Module,
    10: monaco.languages.CompletionItemKind.Property,
    11: monaco.languages.CompletionItemKind.Unit,
    12: monaco.languages.CompletionItemKind.Value,
    13: monaco.languages.CompletionItemKind.Enum,
    14: monaco.languages.CompletionItemKind.Keyword,
    15: monaco.languages.CompletionItemKind.Snippet,
    16: monaco.languages.CompletionItemKind.Color,
    17: monaco.languages.CompletionItemKind.File,
    18: monaco.languages.CompletionItemKind.Reference,
    19: monaco.languages.CompletionItemKind.Folder,
    20: monaco.languages.CompletionItemKind.EnumMember,
    21: monaco.languages.CompletionItemKind.Constant,
    22: monaco.languages.CompletionItemKind.Struct,
    23: monaco.languages.CompletionItemKind.Event,
    24: monaco.languages.CompletionItemKind.Operator,
    25: monaco.languages.CompletionItemKind.TypeParameter
  };
  return map[lspKind] || monaco.languages.CompletionItemKind.Text;
}

function severityToMonaco(monaco, lspSeverity) {
  // LSP: 1=Error, 2=Warning, 3=Information, 4=Hint
  switch (lspSeverity) {
    case 1: return monaco.MarkerSeverity.Error;
    case 2: return monaco.MarkerSeverity.Warning;
    case 3: return monaco.MarkerSeverity.Info;
    case 4: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Info;
  }
}

// Connects `model` (for the given `lang`) to the matching backend language
// server, registering Monaco providers scoped to that language. Returns a
// handle with dispose() to tear everything down (call this before
// connecting a new language, and on unmount).
export function connectLanguageServer({ monaco, model, lang, onStatusChange, gatewayUrl }) {
  if (!languageNeedsBackend(lang)) {
    onStatusChange?.("not-applicable");
    return { dispose() {} };
  }

  let ws;
  let nextId = 1;
  const pending = new Map();
  let disposed = false;
  const disposables = [];
  const documentUri = `inmemory://model/${lang}`;
  let documentVersion = 1;
  let reconnectTimer = null;

  function send(method, params) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ jsonrpc: "2.0", method, params }));
  }

  function request(method, params) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  function handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      console.error("Failed to parse LSP message:", err);
      return;
    }

    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(message.error);
      } else {
        resolve(message.result);
      }
      return;
    }

    if (message.method === "textDocument/publishDiagnostics") {
      const diagnostics = message.params?.diagnostics || [];
      const markers = diagnostics.map((d) => ({
        severity: severityToMonaco(monaco, d.severity),
        message: d.message,
        startLineNumber: d.range.start.line + 1,
        startColumn: d.range.start.character + 1,
        endLineNumber: d.range.end.line + 1,
        endColumn: d.range.end.character + 1
      }));
      monaco.editor.setModelMarkers(model, "lsp", markers);
    }
  }

  function connect() {
    onStatusChange?.("connecting");
    const gatewayHost = (gatewayUrl || DEFAULT_LSP_GATEWAY_HOST).replace(/\/$/, "");
    ws = new WebSocket(`${gatewayHost}/?lang=${encodeURIComponent(lang)}`);

    ws.addEventListener("open", async () => {
      try {
        await request("initialize", {
          processId: null,
          rootUri: null,
          capabilities: {
            textDocument: {
              completion: { completionItem: { snippetSupport: false } },
              hover: { contentFormat: ["plaintext", "markdown"] },
              publishDiagnostics: {}
            }
          }
        });
        send("initialized", {});
        send("textDocument/didOpen", {
          textDocument: {
            uri: documentUri,
            languageId: lang,
            version: documentVersion,
            text: model.getValue()
          }
        });
        onStatusChange?.("connected");
      } catch (err) {
        console.error("LSP initialize failed:", err);
        onStatusChange?.("error");
      }
    });

    ws.addEventListener("message", handleMessage);

    ws.addEventListener("close", () => {
      if (disposed) return;
      onStatusChange?.("disconnected");
      reconnectTimer = setTimeout(connect, 3000);
    });

    ws.addEventListener("error", () => {
      onStatusChange?.("error");
    });
  }

  connect();

  const changeListener = model.onDidChangeContent(() => {
    documentVersion++;
    send("textDocument/didChange", {
      textDocument: { uri: documentUri, version: documentVersion },
      contentChanges: [{ text: model.getValue() }]
    });
  });
  disposables.push(changeListener);

  const completionProvider = monaco.languages.registerCompletionItemProvider(lang, {
    triggerCharacters: [".", ":", "<", '"', "'", "/", "@"],
    provideCompletionItems: async (m, position) => {
      try {
        const result = await request("textDocument/completion", {
          textDocument: { uri: documentUri },
          position: toLspPosition(position)
        });
        const items = Array.isArray(result) ? result : result?.items || [];
        const word = m.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        );
        return {
          suggestions: items.map((item) => ({
            label: item.label,
            kind: completionKind(monaco, item.kind),
            insertText: item.insertText || item.label,
            detail: item.detail,
            documentation: item.documentation,
            range
          }))
        };
      } catch (err) {
        return { suggestions: [] };
      }
    }
  });
  disposables.push(completionProvider);

  const hoverProvider = monaco.languages.registerHoverProvider(lang, {
    provideHover: async (m, position) => {
      try {
        const result = await request("textDocument/hover", {
          textDocument: { uri: documentUri },
          position: toLspPosition(position)
        });
        if (!result || !result.contents) return null;
        const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
        return {
          range: result.range ? toMonacoRange(monaco, result.range) : undefined,
          contents: contents.map((c) => ({
            value: typeof c === "string" ? c : c.value || ""
          }))
        };
      } catch (err) {
        return null;
      }
    }
  });
  disposables.push(hoverProvider);

  return {
    dispose() {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      disposables.forEach((d) => d.dispose());
      monaco.editor.setModelMarkers(model, "lsp", []);
      if (ws) {
        try { ws.close(); } catch (err) {}
      }
    }
  };
}
