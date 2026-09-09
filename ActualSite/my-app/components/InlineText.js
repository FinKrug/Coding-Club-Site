// Tiny inline-markdown renderer for resource copy: understands `code`,
// **bold**, and [label](url) — nothing else. Keeps data/resourcesData.js
// readable without pulling in a markdown library for three tokens.

const TOKEN_RE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export default function InlineText({ text }) {
  const parts = text.split(TOKEN_RE).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      const isExternal = /^https?:\/\//.test(url);
      return (
        <a key={index} href={url} {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}>
          {label}
        </a>
      );
    }

    return part;
  });
}
