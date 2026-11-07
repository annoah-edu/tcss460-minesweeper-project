import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { createGameStore } from '../lib/gameStore.js';
import { createScoreStore } from '../lib/scoreStore.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minesweeper-test-'));
const gameStore = createGameStore();
const scoreStore = createScoreStore(path.join(tempDir, 'scores.json'));
let server;
let baseUrl;

before(async () => {
  server = createApp({ gameStore, scoreStore }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function api(method, route, body) {
  const res = await fetch(baseUrl + route, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('GET /difficulties lists the three presets', async () => {
  const { status, body } = await api('GET', '/difficulties');
  assert.equal(status, 200);
  assert.deepEqual(body.difficulties.map((d) => d.id), ['beginner', 'intermediate', 'expert']);
});

test('POST /games starts a hidden board', async () => {
  const { status, body } = await api('POST', '/games', { difficulty: 'beginner', playerName: 'tester' });
  assert.equal(status, 201);
  assert.equal(body.status, 'ready');
  assert.equal(body.board.length, 9);
  assert.ok(body.board.flat().every((cell) => cell === 'hidden'));
  assert.equal(body.minesRemaining, 10);
});

test('invalid input gets a 400 with a message', async () => {
  let res = await api('POST', '/games', { difficulty: 'impossible' });
  assert.equal(res.status, 400);
  assert.match(res.body.error.message, /difficulty must be one of/);

  res = await api('POST', '/games', { difficulty: 'beginner', playerName: '<script>' });
  assert.equal(res.status, 400);

  res = await api('POST', '/games', '{not json');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.message, 'Request body must be valid JSON.');

  const { body: game } = await api('POST', '/games', { difficulty: 'beginner' });
  res = await api('POST', `/games/${game.gameId}/reveal`, { row: 9, col: 0 });
  assert.equal(res.status, 400);
  res = await api('POST', `/games/${game.gameId}/reveal`, { row: '1', col: 1 });
  assert.equal(res.status, 400);
});

test('unknown games and routes get a 404', async () => {
  let res = await api('GET', '/games/does-not-exist');
  assert.equal(res.status, 404);
  res = await api('GET', '/nope');
  assert.equal(res.status, 404);
});

test('winning a named game records a server-timed score', async () => {
  const { body: start } = await api('POST', '/games', { difficulty: 'beginner', playerName: 'winner' });
  let { body: state } = await api('POST', `/games/${start.gameId}/reveal`, { row: 4, col: 4 });
  assert.equal(state.status, 'playing');

  // Read the real mine layout from the server's store and clear every safe cell.
  const game = gameStore.get(start.gameId);
  for (let i = 0; i < game.isMine.length && state.status === 'playing'; i++) {
    if (game.isMine[i] || game.revealed[i]) continue;
    ({ body: state } = await api('POST', `/games/${start.gameId}/reveal`, {
      row: Math.floor(i / game.cols), col: i % game.cols,
    }));
  }
  assert.equal(state.status, 'won');
  assert.equal(state.newScore.playerName, 'winner');
  assert.equal(typeof state.newScore.rank, 'number');

  const { body: board } = await api('GET', '/leaderboard?difficulty=beginner&limit=50');
  assert.ok(board.scores.some((s) => s.scoreId === state.newScore.scoreId));

  const res = await api('POST', `/games/${start.gameId}/reveal`, { row: 0, col: 0 });
  assert.equal(res.status, 409);
});

test('flagging toggles and updates the mine counter', async () => {
  const { body: start } = await api('POST', '/games', { difficulty: 'beginner' });
  let { body } = await api('POST', `/games/${start.gameId}/flag`, { row: 0, col: 0 });
  assert.equal(body.board[0][0], 'flag');
  assert.equal(body.minesRemaining, 9);
  ({ body } = await api('POST', `/games/${start.gameId}/flag`, { row: 0, col: 0 }));
  assert.equal(body.board[0][0], 'hidden');
});

test('POST /games/:id/hint gives a safe cell and enforces the per-game limit', async () => {
  const { body: start } = await api('POST', '/games', { difficulty: 'expert' });
  let res = await api('POST', `/games/${start.gameId}/hint`);
  assert.equal(res.status, 200);
  assert.equal(res.body.hint.type, 'first-move');
  assert.equal(res.body.hintsUsed, 0, 'the first-move tip is free');

  await api('POST', `/games/${start.gameId}/reveal`, { row: 8, col: 15 });
  const game = gameStore.get(start.gameId);
  for (let used = 1; used <= 3; used++) {
    res = await api('POST', `/games/${start.gameId}/hint`);
    assert.equal(res.status, 200);
    assert.equal(res.body.hintsUsed, used);
    const { hint } = res.body;
    assert.ok(['safe', 'none'].includes(hint.type));
    if (hint.type === 'safe') assert.equal(game.isMine[hint.row * game.cols + hint.col], false);
  }
  res = await api('POST', `/games/${start.gameId}/hint`);
  assert.equal(res.status, 429);
  assert.match(res.body.error.message, /Hint limit reached/);
});

test('GET /leaderboard validates its query', async () => {
  let res = await api('GET', '/leaderboard?difficulty=expert');
  assert.equal(res.status, 200);
  assert.equal(res.body.scores[0].rank, 1);
  res = await api('GET', '/leaderboard?limit=500');
  assert.equal(res.status, 400);
});
