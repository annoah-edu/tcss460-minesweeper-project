// Minesweeper game rules. These functions are pure (no Express, no storage) so
// they are easy to test. The server keeps the real board; clients only ever
// receive boardView(), which hides unrevealed mines until the game ends.

export const DIFFICULTIES = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

export class GameOverError extends Error {
  constructor(status) {
    super(`This game is already over (${status}). Start a new game to keep playing.`);
    this.name = 'GameOverError';
  }
}

// mineIndices is only for tests: it fixes the mine layout up front instead of
// placing mines randomly on the first reveal.
export function createGame(difficulty, { mineIndices } = {}) {
  const config = DIFFICULTIES[difficulty];
  if (!config) throw new RangeError(`Unknown difficulty: ${difficulty}`);

  const size = config.rows * config.cols;
  const game = {
    difficulty,
    rows: config.rows,
    cols: config.cols,
    mines: config.mines,
    isMine: new Array(size).fill(false),
    revealed: new Array(size).fill(false),
    flagged: new Array(size).fill(false),
    revealedCount: 0,
    hintsUsed: 0,
    minesPlaced: false,
    status: 'ready', // ready -> playing -> won | lost
    explodedIndex: null,
    startedAt: null,
    endedAt: null,
  };

  if (mineIndices) {
    for (const index of mineIndices) game.isMine[index] = true;
    game.mines = mineIndices.length;
    game.minesPlaced = true;
  }
  return game;
}

export function isInBounds(game, row, col) {
  return (
    Number.isInteger(row) && Number.isInteger(col) &&
    row >= 0 && row < game.rows && col >= 0 && col < game.cols
  );
}

export function neighbors(game, index) {
  const row = Math.floor(index / game.cols);
  const col = index % game.cols;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < game.rows && c >= 0 && c < game.cols) result.push(r * game.cols + c);
    }
  }
  return result;
}

export function adjacentMines(game, index) {
  return neighbors(game, index).filter((i) => game.isMine[i]).length;
}

// Mines are placed after the first click, away from the clicked cell and its
// neighbors, so the first reveal is always safe and always opens an area.
function placeMines(game, safeIndex, random) {
  const excluded = new Set([safeIndex, ...neighbors(game, safeIndex)]);
  const candidates = [];
  for (let i = 0; i < game.isMine.length; i++) {
    if (!excluded.has(i)) candidates.push(i);
  }
  // Partial Fisher-Yates shuffle: the first `mines` candidates become mines.
  for (let k = 0; k < game.mines; k++) {
    const j = k + Math.floor(random() * (candidates.length - k));
    [candidates[k], candidates[j]] = [candidates[j], candidates[k]];
    game.isMine[candidates[k]] = true;
  }
  game.minesPlaced = true;
}

export function assertPlayable(game) {
  if (game.status === 'won' || game.status === 'lost') throw new GameOverError(game.status);
}

export function reveal(game, row, col, { now = Date.now(), random = Math.random } = {}) {
  assertPlayable(game);
  const index = row * game.cols + col;
  if (game.flagged[index] || game.revealed[index]) return game;

  if (!game.minesPlaced) placeMines(game, index, random);
  if (game.status === 'ready') {
    game.status = 'playing';
    game.startedAt = now;
  }

  if (game.isMine[index]) {
    game.revealed[index] = true;
    game.explodedIndex = index;
    game.status = 'lost';
    game.endedAt = now;
    return game;
  }

  // Flood fill: revealing a cell with no adjacent mines also reveals its neighbors.
  const stack = [index];
  while (stack.length > 0) {
    const current = stack.pop();
    if (game.revealed[current] || game.flagged[current]) continue;
    game.revealed[current] = true;
    game.revealedCount++;
    if (adjacentMines(game, current) === 0) {
      for (const next of neighbors(game, current)) {
        if (!game.revealed[next] && !game.isMine[next]) stack.push(next);
      }
    }
  }

  if (game.revealedCount === game.rows * game.cols - game.mines) {
    game.status = 'won';
    game.endedAt = now;
    game.isMine.forEach((mine, i) => { game.flagged[i] = mine; });
  }
  return game;
}

export function toggleFlag(game, row, col) {
  assertPlayable(game);
  const index = row * game.cols + col;
  if (!game.revealed[index]) game.flagged[index] = !game.flagged[index];
  return game;
}

export function flagsPlaced(game) {
  return game.flagged.filter(Boolean).length;
}

export function elapsedSeconds(game, now = Date.now()) {
  if (game.startedAt === null) return 0;
  return Math.round(((game.endedAt ?? now) - game.startedAt) / 100) / 10;
}

// What the client is allowed to see. Each cell is one of:
//   "hidden" | "flag" | 0-8 (revealed, number of adjacent mines)
//   and once the game is lost: "mine" | "exploded" | "wrong-flag"
export function boardView(game) {
  const lost = game.status === 'lost';
  const rows = [];
  for (let r = 0; r < game.rows; r++) {
    const row = [];
    for (let c = 0; c < game.cols; c++) {
      const i = r * game.cols + c;
      if (i === game.explodedIndex) row.push('exploded');
      else if (game.revealed[i]) row.push(adjacentMines(game, i));
      else if (game.flagged[i]) row.push(lost && !game.isMine[i] ? 'wrong-flag' : 'flag');
      else if (lost && game.isMine[i]) row.push('mine');
      else row.push('hidden');
    }
    rows.push(row);
  }
  return rows;
}
