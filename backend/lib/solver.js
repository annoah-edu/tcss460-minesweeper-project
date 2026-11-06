import { adjacentMines, neighbors } from './board.js';

// Rule-based hint solver. It only looks at what the player can see (revealed
// numbers and which cells are still hidden), never at the real mine layout, so
// every hint it gives can be explained from the board. Player flags are
// ignored because they might be wrong; the solver works out mines itself.
//
// Rules, applied until nothing new is learned:
//   all-mines:  a number with exactly that many hidden neighbors -> all are mines
//   satisfied:  a number that already touches that many known mines -> the rest are safe
//   subset:     if A's unknown neighbors are all also B's, the extra cells around B
//               hold (B's remaining mines - A's remaining mines)

const cellName = (game, i) => `row ${Math.floor(i / game.cols) + 1}, column ${(i % game.cols) + 1}`;
const toCell = (game, i) => ({ row: Math.floor(i / game.cols), col: i % game.cols });

function numberCells(game) {
  const result = [];
  for (let i = 0; i < game.revealed.length; i++) {
    if (game.revealed[i] && !game.isMine[i]) {
      const hidden = neighbors(game, i).filter((n) => !game.revealed[n]);
      if (hidden.length > 0) result.push({ index: i, value: adjacentMines(game, i), hidden });
    }
  }
  return result;
}

export function findSafeCell(game) {
  const mines = new Map(); // index -> how we know it is a mine
  const safe = new Map(); // index -> how we know it is safe
  const numbers = numberCells(game);

  const status = (cell) => {
    const known = cell.hidden.filter((n) => mines.has(n));
    const unknown = cell.hidden.filter((n) => !mines.has(n) && !safe.has(n));
    return { known, unknown, remaining: cell.value - known.length };
  };

  let changed = true;
  while (changed && safe.size === 0) {
    changed = false;

    for (const cell of numbers) {
      const { known, unknown, remaining } = status(cell);
      if (unknown.length === 0) continue;
      if (remaining === 0) {
        for (const n of unknown) safe.set(n, { rule: 'satisfied', number: cell, knownMines: known });
        changed = true;
      } else if (remaining === unknown.length) {
        for (const n of unknown) mines.set(n, { rule: 'all-mines', number: cell });
        changed = true;
      }
    }
    if (changed) continue;

    for (const a of numbers) {
      const sa = status(a);
      if (sa.unknown.length === 0) continue;
      for (const b of numbers) {
        if (a === b) continue;
        const sb = status(b);
        if (!sa.unknown.every((n) => sb.unknown.includes(n))) continue;
        const extra = sb.unknown.filter((n) => !sa.unknown.includes(n));
        if (extra.length === 0) continue;
        const extraMines = sb.remaining - sa.remaining;
        if (extraMines === 0) {
          const knownMines = [...new Set([...sa.known, ...sb.known])];
          for (const n of extra) safe.set(n, { rule: 'subset', inner: a, outer: b, knownMines });
          changed = true;
        } else if (extraMines === extra.length) {
          for (const n of extra) mines.set(n, { rule: 'subset-mines', inner: a, outer: b });
          changed = true;
        }
        if (changed) break;
      }
      if (changed) break;
    }
  }

  if (safe.size === 0) return null;
  const [index, reason] = safe.entries().next().value;
  return { index, reason, mines };
}

function describeMine(game, index, reason) {
  const name = cellName(game, index);
  const where = name[0].toUpperCase() + name.slice(1);
  if (reason.rule === 'all-mines') {
    const n = reason.number;
    return `${where} must be a mine: the ${n.value} at ${cellName(game, n.index)} has exactly ${n.value} hidden ` +
      `neighbor${n.value === 1 ? '' : 's'} left.`;
  }
  return `${where} must be a mine: comparing the ${reason.inner.value} at ${cellName(game, reason.inner.index)} ` +
    `with the ${reason.outer.value} at ${cellName(game, reason.outer.index)} leaves no other place for that mine.`;
}

// Turns the solver's proof into the template explanation. Phase III passes the
// same proof to the LLM, which may only reword it.
export function explain(game, result) {
  const { index, reason, mines } = result;
  const target = cellName(game, index);
  const proofMines = reason.knownMines ?? [];
  const steps = proofMines.map((m) => describeMine(game, m, mines.get(m)));

  let conclusion;
  if (reason.rule === 'satisfied') {
    const n = reason.number;
    conclusion = n.value === 0
      ? `The 0 at ${cellName(game, n.index)} means none of its neighbors are mines, so ${target} is safe.`
      : `The ${n.value} at ${cellName(game, n.index)} already touches ${n.value} known ` +
        `mine${n.value === 1 ? '' : 's'}, so its other hidden neighbors, including ${target}, are safe.`;
  } else {
    const { inner, outer } = reason;
    conclusion = `Every hidden neighbor of the ${inner.value} at ${cellName(game, inner.index)} also touches the ` +
      `${outer.value} at ${cellName(game, outer.index)}, and both still need the same number of mines there. ` +
      `So the ${outer.value}'s other hidden neighbors, including ${target}, are safe.`;
  }
  return [...steps, conclusion].join(' ');
}

export function getHint(game) {
  if (game.status === 'ready') {
    const center = Math.floor(game.rows / 2) * game.cols + Math.floor(game.cols / 2);
    return {
      type: 'first-move',
      ...toCell(game, center),
      explanation: 'Your first click is always safe and always opens an area. The middle of the board is a good start.',
    };
  }

  const result = findSafeCell(game);
  if (!result || game.isMine[result.index]) {
    // The second check should never trigger; if it does, the solver has a bug
    // and we refuse to give a wrong hint.
    if (result) console.error('Solver marked a mine as safe', game.id, result.index);
    return {
      type: 'none',
      explanation: 'No guaranteed safe move was found from the numbers on the board. You may need to guess.',
    };
  }

  const { reason } = result;
  const basedOn = reason.rule === 'satisfied' ? [reason.number] : [reason.inner, reason.outer];
  return {
    type: 'safe',
    ...toCell(game, result.index),
    explanation: explain(game, result),
    proof: {
      rule: reason.rule,
      numbers: basedOn.map((n) => ({ ...toCell(game, n.index), value: n.value })),
      knownMines: (reason.knownMines ?? []).map((m) => toCell(game, m)),
    },
  };
}
