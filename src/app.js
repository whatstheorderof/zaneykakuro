import {
  candidatesForCell,
  combinationsFor,
  generatePuzzle,
  getPlayableCells,
  getRunForCell,
  modes
} from "./puzzleEngine.js";

const app = document.querySelector("#root");
const modeNames = modes().map((mode) => mode.label);
const today = new Date();

const state = {
  activeMode: "Classic",
  puzzle: generatePuzzle("Classic", today),
  selected: null,
  values: {},
  notesOn: true,
  mistakes: 0,
  hints: 0,
  elapsed: 0,
  completed: false,
  explainOn: true,
  toast: "",
  wrongKeys: new Set(),
  stats: loadStats()
};

state.selected = getPlayableCells(state.puzzle)[0];

setInterval(() => {
  if (!state.completed) {
    state.elapsed += 1;
    updateTimerAndStats();
  }
}, 1000);

window.addEventListener("keydown", (event) => {
  if (!state.selected) return;
  if (/^[1-9]$/.test(event.key)) inputValue(Number(event.key));
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") inputValue(null);
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    moveSelection(event.key);
  }
});

render();

function keyFor(cell) {
  return `${cell.row}-${cell.col}`;
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem("zaney-kakuro-stats")) ?? {};
  } catch {
    return {};
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function icon(name) {
  const paths = {
    hint: "M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Zm-3 18h6m-5 3h4",
    check: "m4 12 5 5L20 6",
    notes: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    share: "M16 6 8 12l8 6V6ZM8 12H4",
    timer: "M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[name]}"></path></svg>`;
}

function resetPuzzle(mode) {
  state.activeMode = mode;
  state.puzzle = generatePuzzle(mode, today);
  state.selected = getPlayableCells(state.puzzle)[0];
  state.values = {};
  state.mistakes = 0;
  state.hints = 0;
  state.elapsed = 0;
  state.completed = false;
  state.explainOn = true;
  state.toast = "";
  state.wrongKeys = new Set();
  render();
}

function inputValue(value) {
  const selected = state.selected;
  if (!selected || !state.puzzle.layout[selected.row][selected.col]) return;
  const selectedKey = keyFor(selected);
  state.wrongKeys.delete(selectedKey);
  if (value == null) delete state.values[selectedKey];
  else state.values[selectedKey] = value;
  renderBoardAndPanels();
}

function moveSelection(key) {
  const selected = state.selected;
  const size = state.puzzle.layout.length;
  const delta = {
    ArrowRight: [0, 1],
    ArrowLeft: [0, -1],
    ArrowDown: [1, 0],
    ArrowUp: [-1, 0]
  }[key];

  let row = selected.row;
  let col = selected.col;
  for (let step = 0; step < size; step += 1) {
    row = Math.max(1, Math.min(size - 1, row + delta[0]));
    col = Math.max(1, Math.min(size - 1, col + delta[1]));
    if (state.puzzle.layout[row][col]) {
      state.selected = { row, col };
      renderBoardAndPanels();
      return;
    }
  }
}

function checkPuzzle() {
  const playable = getPlayableCells(state.puzzle);
  const wrong = playable.filter((cell) => {
    const value = state.values[keyFor(cell)];
    return value && value !== state.puzzle.solution[cell.row][cell.col];
  });
  const complete = playable.every((cell) => state.values[keyFor(cell)] === state.puzzle.solution[cell.row][cell.col]);

  if (wrong.length) {
    state.mistakes += wrong.length;
    state.wrongKeys = new Set(wrong.map(keyFor));
    showToast(`${wrong.length} square${wrong.length === 1 ? " needs" : "s need"} another look.`);
    renderBoardAndPanels();
    updateTimerAndStats();
    return;
  }

  state.wrongKeys = new Set();

  if (complete) {
    state.completed = true;
    state.stats = {
      fastest: state.stats.fastest ? Math.min(state.stats.fastest, state.elapsed) : state.elapsed,
      solved: (state.stats.solved ?? 0) + 1
    };
    localStorage.setItem("zaney-kakuro-stats", JSON.stringify(state.stats));
    showToast("Solved. That was tidy.");
    updateTimerAndStats();
    return;
  }

  showToast("No mistakes in filled squares.");
}

function explainHint() {
  state.hints += 1;
  const candidates = state.selected ? candidatesForCell(state.puzzle, state.values, state.selected) : [];
  const run = getBestRun();
  const detail = run ? describeRun(run) : null;
  const message = detail?.combos.length
    ? `Try one of these remaining combinations: ${detail.combos
        .slice(0, 3)
        .map((combo) => combo.join("+"))
        .join(", ")}.`
    : candidates.length
      ? `This square can still be ${candidates.join(", ")}.`
      : "Pick a square with open possibilities.";
  showToast(message);
  updateTimerAndStats();
}

async function shareProgress() {
  const progress = getPlayableCells(state.puzzle).filter((cell) => state.values[keyFor(cell)]).length;
  const total = getPlayableCells(state.puzzle).length;
  const text = `Zaney Kakuro ${state.puzzle.date} ${state.activeMode}: ${progress}/${total} filled, ${state.mistakes} mistakes, ${state.hints} hints. Crossword meets arithmetic.`;

  try {
    if (navigator.share) await navigator.share({ title: "Zaney Kakuro", text, url: window.location.href });
    else {
      await navigator.clipboard.writeText(text);
      showToast("Share text copied.");
    }
  } catch {
    showToast("Share cancelled.");
  }
}

function showToast(message) {
  state.toast = message;
  renderToast();
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    state.toast = "";
    renderToast();
  }, 2800);
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <a class="brand" href="/" aria-label="Zaney Kakuro home">
          <span>ZK</span>
          <div>
            <strong>Zaney Kakuro</strong>
            <p>Crossword meets arithmetic.</p>
          </div>
        </a>
        <nav aria-label="Primary">
          <a href="#daily">Daily</a>
          <a href="#library">Library</a>
          <a href="#learn">Learn</a>
          <a href="#stats">Stats</a>
        </nav>
      </header>

      <section class="game-hero" id="daily">
        <div class="game-heading">
          <div>
            <p class="date-label">Daily puzzle · ${state.puzzle.date}</p>
            <h1>${state.puzzle.title}</h1>
          </div>
          <div class="timer-chip">${icon("timer")}<span data-timer>${formatTime(state.elapsed)}</span></div>
        </div>

        <div class="mode-rail" role="tablist" aria-label="Daily modes">
          ${modeNames
            .map(
              (mode) => `<button class="${mode === state.activeMode ? "is-active" : ""}" type="button" role="tab" aria-selected="${
                mode === state.activeMode
              }" data-mode="${mode}">${mode === "Lightning" ? "Lightning 5 min" : mode}</button>`
            )
            .join("")}
        </div>

        <div class="play-layout">
          <section class="board-panel" aria-label="Puzzle board">
            <div data-board></div>
            <div class="number-pad" aria-label="Number pad">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => `<button type="button" data-number="${digit}">${digit}</button>`).join("")}
              <button class="clear-button" type="button" data-clear>Clear</button>
            </div>
          </section>

          <aside class="side-stack">
            <div data-explain></div>
            <section class="panel notes-panel" data-smart-notes></section>

            <section class="action-grid" aria-label="Puzzle actions">
              <button type="button" data-hint>${icon("hint")} Hint</button>
              <button type="button" data-check>${icon("check")} Check</button>
              <button type="button" data-notes-toggle>${icon("notes")} Notes</button>
              <button type="button" data-share>${icon("share")} Share</button>
            </section>
          </aside>
        </div>

        <div data-stats></div>

        <section class="learning-band" id="learn">
          <div><span>Level 1</span><strong>Simple sums</strong></div>
          <div><span>Level 2</span><strong>Multi-cage reasoning</strong></div>
          <div><span>Level 3</span><strong>Advanced elimination</strong></div>
          <div><span>Level 4</span><strong>Expert combinations</strong></div>
        </section>

        <section class="ad-slot" aria-label="Advertisement">
          <span>Advertisement</span>
          <p>AdSense display slot</p>
        </section>
      </section>

      <div data-toast></div>
    </main>
  `;

  app.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => resetPuzzle(button.dataset.mode)));
  app.querySelectorAll("[data-number]").forEach((button) => button.addEventListener("click", () => inputValue(Number(button.dataset.number))));
  app.querySelector("[data-clear]").addEventListener("click", () => inputValue(null));
  app.querySelector("[data-check]").addEventListener("click", checkPuzzle);
  app.querySelector("[data-hint]").addEventListener("click", explainHint);
  app.querySelector("[data-share]").addEventListener("click", shareProgress);
  app.querySelector("[data-notes-toggle]").addEventListener("click", () => {
    state.notesOn = !state.notesOn;
    renderBoardAndPanels();
  });

  renderBoardAndPanels();
}

function renderBoardAndPanels() {
  renderBoard();
  renderExplain();
  renderSmartNotes();
  updateTimerAndStats();
}

function renderBoard() {
  const selectedAcross = getRunForCell(state.puzzle, state.selected, "across");
  const selectedDown = getRunForCell(state.puzzle, state.selected, "down");
  const selectedRunKeys = new Set([...(selectedAcross?.cells ?? []), ...(selectedDown?.cells ?? [])].map(keyFor));
  const board = app.querySelector("[data-board]");

  board.innerHTML = `
    <div class="kakuro-board" style="--grid-size: ${state.puzzle.layout.length}" aria-label="${state.puzzle.mode.label} Kakuro puzzle">
      ${state.puzzle.layout
        .map((row, rowIndex) =>
          row
            .map((playable, colIndex) => {
              const cell = { row: rowIndex, col: colIndex };
              const cellKey = keyFor(cell);
              const clue = state.puzzle.clues[rowIndex][colIndex];
              if (!playable) {
                return `<div class="cell clue-cell">${clue.down ? `<span class="down-clue">${clue.down}</span>` : ""}${
                  clue.across ? `<span class="across-clue">${clue.across}</span>` : ""
                }</div>`;
              }

              const value = state.values[cellKey];
              const isSelected = state.selected?.row === rowIndex && state.selected?.col === colIndex;
              const isWrong = state.wrongKeys.has(cellKey);
              const candidates = state.notesOn ? candidatesForCell(state.puzzle, state.values, cell) : [];
              return `
                <button class="cell play-cell ${isSelected ? "is-selected" : ""} ${selectedRunKeys.has(cellKey) ? "in-run" : ""} ${
                  isWrong ? "is-wrong" : ""
                }"
                  type="button" data-cell="${cellKey}" aria-label="Cell row ${rowIndex + 1}, column ${colIndex + 1}">
                  ${
                    value
                      ? `<span class="entry">${value}</span>`
                      : `<span class="notes">${candidates.map((digit) => `<span>${digit}</span>`).join("")}</span>`
                  }
                </button>`;
            })
            .join("")
        )
        .join("")}
    </div>
  `;

  board.querySelectorAll("[data-cell]").forEach((button) =>
    button.addEventListener("click", () => {
      const [row, col] = button.dataset.cell.split("-").map(Number);
      state.selected = { row, col };
      renderBoardAndPanels();
    })
  );
}

function getBestRun() {
  if (!state.selected) return null;
  const across = getRunForCell(state.puzzle, state.selected, "across");
  const down = getRunForCell(state.puzzle, state.selected, "down");
  if (!across) return down;
  if (!down) return across;

  const acrossOpen = across.cells.filter((cell) => !state.values[keyFor(cell)]).length;
  const downOpen = down.cells.filter((cell) => !state.values[keyFor(cell)]).length;
  return acrossOpen <= downOpen ? across : down;
}

function describeRun(run) {
  const placed = run.cells.map((cell) => state.values[keyFor(cell)]).filter(Boolean);
  const placedSum = placed.reduce((total, value) => total + value, 0);
  const remainingTotal = run.clue - placedSum;
  const remainingSlots = run.cells.length - placed.length;
  const combos = combinationsFor(remainingSlots, remainingTotal, placed);
  const progress = Math.min(100, Math.max(0, Math.round((placedSum / run.clue) * 100)));

  return {
    placed,
    placedSum,
    remainingTotal,
    remainingSlots,
    combos,
    progress
  };
}

function renderExplain() {
  const root = app.querySelector("[data-explain]");
  const run = getBestRun();

  if (!state.explainOn) {
    root.innerHTML = `
      <section class="panel explain-panel explain-panel--collapsed">
        <div class="panel-heading">
          <p>Explain Mode</p>
          <button class="switch-button" type="button" aria-pressed="false" data-explain-toggle-inline>
            <span></span>
            Off
          </button>
        </div>
        <p class="muted">Hidden for a quieter solve. Smart Notes and hints still work.</p>
      </section>
    `;

    root.querySelector("[data-explain-toggle-inline]").addEventListener("click", () => {
      state.explainOn = true;
      renderBoardAndPanels();
    });
    return;
  }

  if (!state.selected || !run) {
    root.innerHTML = `
      <section class="panel explain-panel">
        <div class="panel-heading">
          <p>Explain Mode</p>
          <button class="switch-button is-on" type="button" aria-pressed="true" data-explain-toggle-inline>
            <span></span>
            On
          </button>
        </div>
        <h2>Select a square to start reasoning.</h2>
        <p class="muted">Zaney will point at the relevant run, show what is already placed, and narrow the possible digits.</p>
      </section>
    `;
    root.querySelector("[data-explain-toggle-inline]").addEventListener("click", () => {
      state.explainOn = false;
      renderBoardAndPanels();
    });
    return;
  }

  const detail = describeRun(run);
  const candidates = candidatesForCell(state.puzzle, state.values, state.selected);
  const eliminated = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => !candidates.includes(digit));

  root.innerHTML = `
    <section class="panel explain-panel">
      <div class="panel-heading">
        <div>
          <p>Explain Mode</p>
          <span>${run.direction} run</span>
        </div>
        <button class="switch-button is-on" type="button" aria-pressed="true" data-explain-toggle-inline>
          <span></span>
          On
        </button>
      </div>
      <h2>This run must total ${run.clue}.</h2>
      <p>${detail.placed.length ? `You've already placed ${detail.placed.join(" and ")}.` : "No digits are locked into this run yet."}</p>
      <div class="run-meter" aria-label="Run progress">
        <span style="width: ${detail.progress}%"></span>
      </div>
      <p class="muted">Which ${detail.remainingSlots === 1 ? "digit" : "digits"} can still make the remaining ${detail.remainingTotal}?</p>
      <div class="candidate-row" aria-label="Remaining candidates">
        ${candidates.length ? candidates.map((candidate) => `<span>${candidate}</span>`).join("") : "<span>Try clearing a conflict</span>"}
      </div>
      <div class="explain-meta">
        <span>${detail.placedSum}/${run.clue} placed</span>
        <span>${detail.remainingSlots} open</span>
        <span>${eliminated.length} eliminated</span>
      </div>
      <div class="combo-list" aria-label="Remaining combinations">
        <p>Remaining combinations</p>
        <div>
          ${
            detail.combos.length
              ? detail.combos
                  .slice(0, 6)
                  .map((combo) => `<span>${combo.join(" + ")}</span>`)
                  .join("")
              : "<span>No clean combination yet</span>"
          }
        </div>
      </div>
      <button class="text-action" type="button" data-hint-inline>Explain the next step</button>
    </section>
  `;

  root.querySelector("[data-explain-toggle-inline]").addEventListener("click", () => {
    state.explainOn = false;
    renderBoardAndPanels();
  });
  root.querySelector("[data-hint-inline]").addEventListener("click", explainHint);
}

function renderSmartNotes() {
  const root = app.querySelector("[data-smart-notes]");
  if (!root) return;
  const candidates = state.selected ? candidatesForCell(state.puzzle, state.values, state.selected) : [];
  const eliminated = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => !candidates.includes(digit));

  root.innerHTML = `
    <div class="panel-heading">
      <p>Smart Notes</p>
      <span data-notes-state>${state.notesOn ? "On" : "Off"}</span>
    </div>
    <p class="muted">Possible values and eliminated numbers update as the run changes.</p>
    <div class="digit-row" aria-label="Possible values">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((digit) => `<span class="${candidates.includes(digit) ? "is-possible" : ""}">${digit}</span>`)
        .join("")}
    </div>
    <p class="eliminated-line">${eliminated.length ? `Eliminated: ${eliminated.join(", ")}` : "No eliminations yet."}</p>
    <button class="toggle ${state.notesOn ? "is-on" : ""}" type="button" data-notes-toggle-inline>
      <span></span>
      Automatic notes
    </button>
  `;

  root.querySelector("[data-notes-toggle-inline]").addEventListener("click", () => {
    state.notesOn = !state.notesOn;
    renderBoardAndPanels();
  });
}

function updateTimerAndStats() {
  const timer = app.querySelector("[data-timer]");
  if (timer) timer.textContent = formatTime(state.elapsed);
  const statsRoot = app.querySelector("[data-stats]");
  if (!statsRoot) return;

  const efficiency = Math.max(0, Math.round(100 - state.mistakes * 9 - state.hints * 6 - Math.floor(state.elapsed / 90)));
  statsRoot.innerHTML = `
    <section class="stats-strip" aria-label="Solve statistics" id="stats">
      <div><span>Fastest solve</span><strong>${state.stats.fastest ? formatTime(state.stats.fastest) : state.completed ? formatTime(state.elapsed) : "Not yet"}</strong></div>
      <div><span>Mistakes</span><strong>${state.mistakes}</strong></div>
      <div><span>Hints</span><strong>${state.hints}</strong></div>
      <div><span>Efficiency Score</span><strong>${efficiency}</strong></div>
      <div><span>Average thinking time</span><strong>${formatTime(Math.max(8, Math.round(state.elapsed / 4)))}</strong></div>
    </section>
  `;
}

function renderToast() {
  const toastRoot = app.querySelector("[data-toast]");
  if (!toastRoot) return;
  toastRoot.innerHTML = state.toast ? `<div class="toast" role="status">${state.toast}</div>` : "";
}
