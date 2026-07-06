import { mkdir, writeFile } from "node:fs/promises";
import { generatePuzzle, getPlayableCells, validatePuzzle } from "../src/puzzleEngine.js";

const modeNames = ["Classic", "Mini", "Expert", "Weekend Monster", "Lightning"];
const target = 5000;
const startDate = new Date("2026-01-01T00:00:00.000Z");
const manifest = [];

for (let index = 0; index < target; index += 1) {
  const date = new Date(startDate);
  date.setUTCDate(startDate.getUTCDate() + Math.floor(index / modeNames.length));
  const mode = modeNames[index % modeNames.length];
  const puzzle = generatePuzzle(mode, date, index);
  const validation = validatePuzzle(puzzle);

  if (!validation.ok) {
    throw new Error(`${puzzle.id} failed validation: ${validation.issues.join(", ")}`);
  }

  manifest.push({
    id: puzzle.id,
    date: puzzle.date,
    mode: puzzle.mode.label,
    cells: getPlayableCells(puzzle).length,
    seed: puzzle.seed
  });
}

await mkdir("public", { recursive: true });
await writeFile("public/puzzle-library.json", `${JSON.stringify({ generatedAt: new Date().toISOString(), puzzles: manifest }, null, 2)}\n`);

console.log(`Exported ${manifest.length.toLocaleString()} validated puzzle records to public/puzzle-library.json.`);
