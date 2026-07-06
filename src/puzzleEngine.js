const MODES = {
  Classic: {
    label: "Classic",
    size: 7,
    estimate: "10-14 min",
    description: "Balanced daily logic"
  },
  Mini: {
    label: "Mini",
    size: 6,
    estimate: "3-5 min",
    description: "A quick warm-up"
  },
  Expert: {
    label: "Expert",
    size: 8,
    estimate: "18-25 min",
    description: "Deeper eliminations"
  },
  "Weekend Monster": {
    label: "Weekend Monster",
    size: 9,
    estimate: "35-45 min",
    description: "The long-form ritual"
  },
  Lightning: {
    label: "Lightning",
    size: 6,
    estimate: "5 min",
    description: "Beat the clock"
  }
};

function hashSeed(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getLayout(size, variant) {
  const grid = Array.from({ length: size }, () => Array(size).fill(false));
  const playableArea = size - 1;
  const blocked = new Set();

  for (let row = 1; row < size; row += 1) {
    for (let col = 1; col < size; col += 1) {
      const diagonal = (row + col + variant) % 5 === 0;
      const staggered = size > 7 && row > 2 && col > 2 && (row * 2 + col + variant) % 7 === 0;
      const miniGap = size <= 6 && row === playableArea && col === playableArea;
      if (diagonal || staggered || miniGap) {
        blocked.add(`${row},${col}`);
      }
    }
  }

  for (let row = 1; row < size; row += 1) {
    for (let col = 1; col < size; col += 1) {
      if (blocked.has(`${row},${col}`)) continue;
      const leftBlocked = col === 1 || blocked.has(`${row},${col - 1}`);
      const rightBlocked = col === playableArea || blocked.has(`${row},${col + 1}`);
      const upBlocked = row === 1 || blocked.has(`${row - 1},${col}`);
      const downBlocked = row === playableArea || blocked.has(`${row + 1},${col}`);
      const isolatedAcross = leftBlocked && rightBlocked;
      const isolatedDown = upBlocked && downBlocked;

      if (isolatedAcross || isolatedDown) {
        blocked.delete(`${row},${col - 1}`);
        blocked.delete(`${row - 1},${col}`);
      }
    }
  }

  for (let row = 1; row < size; row += 1) {
    for (let col = 1; col < size; col += 1) {
      grid[row][col] = !blocked.has(`${row},${col}`);
    }
  }

  return grid;
}

function buildSolution(layout, random) {
  const size = layout.length;
  const base = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const solution = Array.from({ length: size }, () => Array(size).fill(null));

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!layout[row][col]) continue;
      solution[row][col] = base[(row + col) % 9];
    }
  }

  return solution;
}

function runCells(layout, row, col, direction) {
  const cells = [];
  let nextRow = row;
  let nextCol = col;

  while (layout[nextRow]?.[nextCol]) {
    cells.push({ row: nextRow, col: nextCol });
    if (direction === "across") nextCol += 1;
    else nextRow += 1;
  }

  return cells;
}

function buildClues(layout, solution) {
  const size = layout.length;
  const clues = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ across: null, down: null }))
  );

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (layout[row][col]) continue;

      const across = runCells(layout, row, col + 1, "across");
      const down = runCells(layout, row + 1, col, "down");

      if (across.length > 1) {
        clues[row][col].across = across.reduce((total, cell) => total + solution[cell.row][cell.col], 0);
      }

      if (down.length > 1) {
        clues[row][col].down = down.reduce((total, cell) => total + solution[cell.row][cell.col], 0);
      }
    }
  }

  return clues;
}

export function generatePuzzle(modeName = "Classic", date = new Date(), offset = 0) {
  const mode = MODES[modeName] ?? MODES.Classic;
  const day = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
  const seed = hashSeed(`${modeName}:${day}:${offset}`);
  const random = mulberry32(seed);
  const layout = getLayout(mode.size, seed % 13);
  const solution = buildSolution(layout, random);
  const clues = buildClues(layout, solution);

  return {
    id: `${modeName.toLowerCase().replaceAll(" ", "-")}-${day}-${offset}`,
    title: `${mode.label} Daily`,
    date: day,
    seed,
    mode,
    layout,
    solution,
    clues
  };
}

export function validatePuzzle(puzzle) {
  const issues = [];
  const { layout, solution, clues } = puzzle;

  for (let row = 0; row < layout.length; row += 1) {
    for (let col = 0; col < layout.length; col += 1) {
      if (!layout[row][col]) continue;
      const value = solution[row][col];
      if (!Number.isInteger(value) || value < 1 || value > 9) {
        issues.push(`Invalid digit at ${row},${col}`);
      }
    }
  }

  for (let row = 0; row < layout.length; row += 1) {
    for (let col = 0; col < layout.length; col += 1) {
      if (layout[row][col]) continue;
      for (const direction of ["across", "down"]) {
        const startRow = direction === "down" ? row + 1 : row;
        const startCol = direction === "across" ? col + 1 : col;
        const cells = runCells(layout, startRow, startCol, direction);
        const clue = clues[row][col][direction];

        if (cells.length > 1 && clue == null) {
          issues.push(`Missing ${direction} clue at ${row},${col}`);
        }

        if (cells.length > 1 && clue != null) {
          const values = cells.map((cell) => solution[cell.row][cell.col]);
          const sum = values.reduce((total, value) => total + value, 0);
          const uniqueValues = new Set(values);

          if (sum !== clue) issues.push(`Bad ${direction} sum at ${row},${col}`);
          if (uniqueValues.size !== values.length) issues.push(`Duplicate in ${direction} run at ${row},${col}`);
        }
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function getPlayableCells(puzzle) {
  const cells = [];
  puzzle.layout.forEach((rowCells, row) => {
    rowCells.forEach((playable, col) => {
      if (playable) cells.push({ row, col, key: `${row}-${col}` });
    });
  });
  return cells;
}

export function getRunForCell(puzzle, selected, direction) {
  if (!selected) return null;
  let { row, col } = selected;

  while (puzzle.layout[row]?.[col]) {
    if (direction === "across") col -= 1;
    else row -= 1;
  }

  const clueRow = row;
  const clueCol = col;
  const cells = runCells(
    puzzle.layout,
    direction === "down" ? clueRow + 1 : clueRow,
    direction === "across" ? clueCol + 1 : clueCol,
    direction
  );

  if (cells.length <= 1) return null;

  return {
    direction,
    clue: puzzle.clues[clueRow][clueCol][direction],
    clueCell: { row: clueRow, col: clueCol },
    cells
  };
}

export function combinationsFor(length, total, used = []) {
  const usedSet = new Set(used.filter(Boolean));
  const results = [];

  function visit(start, combo, sum) {
    if (combo.length === length) {
      if (sum === total) results.push(combo);
      return;
    }

    for (let value = start; value <= 9; value += 1) {
      if (usedSet.has(value)) continue;
      if (sum + value > total) continue;
      visit(value + 1, [...combo, value], sum + value);
    }
  }

  visit(1, [], 0);
  return results;
}

export function candidatesForCell(puzzle, values, cell) {
  const runs = ["across", "down"]
    .map((direction) => getRunForCell(puzzle, cell, direction))
    .filter(Boolean);

  const runCandidates = runs.map((run) => {
    const placed = run.cells
      .filter((runCell) => runCell.row !== cell.row || runCell.col !== cell.col)
      .map((runCell) => values[`${runCell.row}-${runCell.col}`])
      .filter(Boolean);
    const remainingSlots = run.cells.length - placed.length;
    const remainingTotal = run.clue - placed.reduce((total, value) => total + value, 0);
    const combos = combinationsFor(remainingSlots, remainingTotal, placed);
    return new Set(combos.flat());
  });

  if (runCandidates.length === 0) return [];

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) =>
    runCandidates.every((set) => set.has(digit))
  );
}

export function modes() {
  return Object.values(MODES);
}
