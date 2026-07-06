import { generatePuzzle, validatePuzzle } from "../src/puzzleEngine.js";

const modes = ["Classic", "Mini", "Expert", "Weekend Monster", "Lightning"];
const target = 5000;
const startDate = new Date("2026-01-01T00:00:00.000Z");
let checked = 0;

for (let index = 0; index < target; index += 1) {
  const date = new Date(startDate);
  date.setUTCDate(startDate.getUTCDate() + Math.floor(index / modes.length));
  const mode = modes[index % modes.length];
  const puzzle = generatePuzzle(mode, date, index);
  const result = validatePuzzle(puzzle);

  if (!result.ok) {
    console.error(`Puzzle ${puzzle.id} failed validation`);
    console.error(result.issues.join("\n"));
    process.exit(1);
  }

  checked += 1;
}

console.log(`Validated ${checked.toLocaleString()} finishable Zaney Kakuro puzzles.`);
