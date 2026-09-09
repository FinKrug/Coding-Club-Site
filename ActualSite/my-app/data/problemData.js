// Single source of truth for every coding challenge: both /problems (the
// weekly list) and /problems/[id] (the detail + editor page) read from this
// array, so a problem's title/difficulty/week only needs to be set once.
//
// `week` groups challenges on the /problems list (in first-seen order);
// omit it and a problem falls into "Week 1".

const problems = [
  {
    id: 1,
    title: "Hello World",
    difficulty: "Easy",
    week: "Week 1",
    description:
      "Write a function that returns 'Hello World'.",
    examples: [
      {
        input: "()",
        output: "Hello World"
      }
    ]
  },
  {
    id: 2,
    title: "Sum Two Numbers",
    difficulty: "Easy",
    week: "Week 1",
    description:
      "Return the sum of two integers.",
    examples: [
      {
        input: "(2, 3)",
        output: "5"
      }
    ]
  }
];

export default problems;
