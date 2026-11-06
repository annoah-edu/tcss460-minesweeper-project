import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reveal } from '../lib/board.js';
import { getHint } from '../lib/solver.js';

test('a hint never points at a mine (300 random games played by following hints)', () => {
  let hintsChecked = 0;
  for (let run = 0; run < 300; run++) {
    const difficulty = ['beginner', 'intermediate', 'expert'][run % 3];
    const game = createGame(difficulty);
    reveal(game, Math.floor(game.rows / 2), Math.floor(game.cols / 2));
    while (game.status === 'playing') {
      const hint = getHint(game);
      if (hint.type !== 'safe') break;
      const index = hint.row * game.cols + hint.col;
      assert.equal(game.isMine[index], false, `hint at ${hint.row},${hint.col} is a mine`);
      assert.equal(game.revealed[index], false, 'hint points at a hidden cell');
      reveal(game, hint.row, hint.col);
      hintsChecked++;
    }
    assert.notEqual(game.status, 'lost');
  }
  assert.ok(hintsChecked > 1000, `expected many hints, got ${hintsChecked}`);
});

test('the hint proof names the number and the mine it relies on', () => {
  // Mines at (0,0) and (0,2). After revealing the far corner, row 0 columns 0-2
  // stay hidden. The 1 at (0,3) proves (0,2) is a mine, so the 1 at (1,2) is
  // satisfied and (0,1) is safe.
  const game = createGame('beginner', { mineIndices: [0, 2] });
  reveal(game, 8, 8);
  const hint = getHint(game);
  assert.equal(hint.type, 'safe');
  assert.deepEqual({ row: hint.row, col: hint.col }, { row: 0, col: 1 });
  assert.equal(hint.proof.rule, 'satisfied');
  assert.deepEqual(hint.proof.numbers, [{ row: 1, col: 2, value: 1 }]);
  assert.deepEqual(hint.proof.knownMines, [{ row: 0, col: 2 }]);
  assert.match(hint.explanation, /^Row 1, column 3 must be a mine/);
  assert.match(hint.explanation, /row 1, column 2 are safe|including row 1, column 2/);
});

test('no provable move gives the "no guaranteed safe move" message', () => {
  // Every cell except two corners is a mine, so the only number is a 3
  // surrounded by mines and nothing can be proven safe.
  const mineIndices = [];
  for (let i = 1; i < 80; i++) mineIndices.push(i);
  const game = createGame('beginner', { mineIndices });
  reveal(game, 8, 8);
  assert.equal(game.status, 'playing');
  const hint = getHint(game);
  assert.equal(hint.type, 'none');
  assert.match(hint.explanation, /No guaranteed safe move was found/);
});

test('before the first click the hint is the first-move tip', () => {
  const hint = getHint(createGame('beginner'));
  assert.equal(hint.type, 'first-move');
  assert.deepEqual({ row: hint.row, col: hint.col }, { row: 4, col: 4 });
});
