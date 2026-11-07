import { randomUUID } from 'node:crypto';

// In-progress games live in memory for Phase II. They are lost when the server
// restarts; Phase III moves saved games into the database.
export function createGameStore({ maxAgeMs = 24 * 60 * 60 * 1000 } = {}) {
  const games = new Map();

  return {
    add(game, now = Date.now()) {
      for (const [id, existing] of games) {
        if (now - existing.createdAt > maxAgeMs) games.delete(id);
      }
      game.id = randomUUID();
      game.createdAt = now;
      games.set(game.id, game);
      return game.id;
    },

    get(id) {
      return games.get(id) ?? null;
    },
  };
}
