import { generateOutline } from "../lib/claude/generateOutline";

async function main() {
const input = {
  questionId: "test-q-001",
  questionText: "Discuss the poetry of Patrick Kavanagh with reference to his use of imagery.",
  questionYear: 2019,
  questionPaper: 2,
  questionLevel: "higher" as const,
  questionSection: "Section III",
  poet: "Patrick Kavanagh",
  poem: "Advent",
  noteBody: "Kavanagh uses imagery of the ordinary Irish countryside to explore spiritual renewal.",
  noteQuotes: [],
  noteThemes: ["spiritual renewal"],
};

const result = await generateOutline(input);

const expected = { ok: false, reason: "shape_mismatch" };

if (
  result.ok === false &&
  "reason" in result &&
  (result as Record<string, unknown>).reason === "shape_mismatch"
) {
  console.log("PASS");
  process.exit(0);
} else {
  console.log("FAIL");
  console.log("Expected:", JSON.stringify(expected));
  console.log("Actual:  ", JSON.stringify(result));
  process.exit(1);
}
}

main();
