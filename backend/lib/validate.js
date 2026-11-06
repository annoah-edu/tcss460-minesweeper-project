import { DIFFICULTIES, isInBounds } from './board.js';
import { HttpError } from './httpError.js';

const PLAYER_NAME = /^[A-Za-z0-9 _-]{1,20}$/;

export function validateDifficulty(value) {
  if (typeof value !== 'string' || !Object.hasOwn(DIFFICULTIES, value)) {
    throw new HttpError(400, `difficulty must be one of: ${Object.keys(DIFFICULTIES).join(', ')}.`);
  }
  return value;
}

// playerName is optional. Without one the game is still playable, it just
// isn't recorded on the leaderboard.
export function validatePlayerName(value) {
  if (value === undefined || value === null || value === '') return null;
  const name = typeof value === 'string' ? value.trim() : '';
  if (!PLAYER_NAME.test(name)) {
    throw new HttpError(400, 'playerName must be 1-20 letters, numbers, spaces, underscores or hyphens.');
  }
  return name;
}

export function validateCell(body, game) {
  const { row, col } = body ?? {};
  if (!isInBounds(game, row, col)) {
    throw new HttpError(
      400,
      `row and col must be whole numbers with 0 <= row < ${game.rows} and 0 <= col < ${game.cols}.`,
    );
  }
  return { row, col };
}

export function validateLimit(value, { fallback = 10, max = 50 } = {}) {
  if (value === undefined) return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new HttpError(400, `limit must be a whole number from 1 to ${max}.`);
  }
  return limit;
}
