import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GameOverError, adjacentMines, boardView, createGame, neighbors, reveal, toggleFlag,
} from '../lib/board.js';

test('first reveal is never a mine and never next to one', () => {
  for (let run = 0; run < 200; run++) {
    const game = createGame('beginner');
    reveal(game, 4, 4);
    assert.notEqual(game.status, 'lost');
    const center = 4 * game.cols + 4;
    assert.equal(adjacentMines(game, center), 0);
    assert.equal(game.isMine.filter(Boolean).length, 10);
  }
});

test('revealing a zero flood-fills, and clearing every safe cell wins', () => {
  const game = createGame('beginner', { mineIndices: [80] }); // bottom-right corner
  reveal(game, 0, 0);
  assert.equal(game.status, 'won');
  assert.equal(game.revealedCount, 80);
  assert.equal(game.flagged[80], true, 'mines are flagged on a win');
  assert.equal(boardView(game)[7][7], 1);
  assert.equal(boardView(game)[0][0], 0);
});

test('hitting a mine loses and shows every mine', () => {
  const game = createGame('beginner', { mineIndices: [0, 1, 2] });
  toggleFlag(game, 0, 3); // wrong flag: (0,3) is not a mine
  reveal(game, 0, 0);
  assert.equal(game.status, 'lost');
  const view = boardView(game);
  assert.deepEqual(view[0].slice(0, 4), ['exploded', 'mine', 'mine', 'wrong-flag']);
  assert.throws(() => reveal(game, 5, 5), GameOverError);
  assert.throws(() => toggleFlag(game, 5, 5), GameOverError);
});

test('flagged cells cannot be revealed until unflagged', () => {
  const game = createGame('beginner', { mineIndices: [40] });
  toggleFlag(game, 4, 4);
  reveal(game, 4, 4);
  assert.equal(game.status, 'ready');
  assert.equal(boardView(game)[4][4], 'flag');
  toggleFlag(game, 4, 4);
  assert.equal(boardView(game)[4][4], 'hidden');
});

test('the view never exposes mines during play', () => {
  const game = createGame('intermediate');
  reveal(game, 0, 0);
  const cells = boardView(game).flat();
  assert.ok(cells.every((cell) => cell === 'hidden' || typeof cell === 'number'));
});

test('corner cells have 3 neighbors and middle cells have 8', () => {
  const game = createGame('beginner');
  assert.equal(neighbors(game, 0).length, 3);
  assert.equal(neighbors(game, 40).length, 8);
});
