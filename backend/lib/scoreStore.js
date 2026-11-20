import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const SEED_FILE = path.join(DATA_DIR, 'sample_scores.json');
const RANKED_SCORES = `
  SELECT score_id      AS scoreId,
         player_name   AS playerName,
         difficulty,
         time_seconds  AS timeSeconds,
         hints_used    AS hintsUsed,
         completed_at  AS completedAt,
         ROW_NUMBER() OVER (ORDER BY time_seconds, completed_at, score_id) AS rank
  FROM scores
  WHERE difficulty = ?`;

// Leaderboard scores are kept in a DB file.
export function createScoreStore(dbPath = process.env.DB_FILE || path.join(DATA_DIR, "scores.db")) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  // The schema is created if it doesn't exist. This is a no-op if the database already exists.
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      score_id     TEXT PRIMARY KEY,
      player_name  TEXT NOT NULL,
      difficulty   TEXT NOT NULL,
      time_seconds REAL NOT NULL,
      hints_used   INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scores_leaderboard
      ON scores (difficulty, time_seconds, completed_at);
  `);

  // Compiles the SQL once and reuses it for each query. This is more efficient than using db.prepare() each time.
  const insert = db.prepare(`
    INSERT INTO scores (score_id, player_name, difficulty, time_seconds, hints_used, completed_at)
    VALUES (@scoreId, @playerName, @difficulty, @timeSeconds, @hintsUsed, @completedAt)`);
  const findRanked = db.prepare(`SELECT * FROM (${RANKED_SCORES}) WHERE scoreId = ?`);
  const topRanked = db.prepare(`${RANKED_SCORES} ORDER BY rank LIMIT ?`);

  // The sample data is only copied on the first run. Subsequent runs will use the existing database.
  if (db.prepare('SELECT COUNT(*) AS n FROM scores').get().n === 0) {
    const samples = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    db.transaction((rows) => rows.forEach((row) => insert.run(row)))(samples);
  }

  return {
    add({ playerName, difficulty, timeSeconds, hintsUsed = 0, completedAt = new Date().toISOString() }) {
      const scoreId = randomUUID();
      insert.run({ scoreId, playerName, difficulty, timeSeconds, hintsUsed, completedAt });
      return findRanked.get(difficulty, scoreId);
    },

    top(difficulty, limit) {
      return topRanked.all(difficulty, limit);
    },

    close() {
      db.close();
    },
  };
}
