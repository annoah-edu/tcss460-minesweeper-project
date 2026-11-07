import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const SEED_FILE = path.join(DATA_DIR, 'sample_scores.json');

function byTime(a, b) {
  return a.timeSeconds - b.timeSeconds || a.completedAt.localeCompare(b.completedAt);
}

// Leaderboard scores are kept in a JSON file for Phase II. The first run copies
// the sample data so the leaderboard is not empty. Phase III swaps this module
// for a database-backed one with the same add/top interface.
export function createScoreStore(filePath = process.env.SCORES_FILE || path.join(DATA_DIR, 'scores.json')) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.copyFileSync(SEED_FILE, filePath);
  }

  const readAll = () => JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const writeAll = (scores) => fs.writeFileSync(filePath, `${JSON.stringify(scores, null, 2)}\n`);

  function ranked(difficulty) {
    return readAll()
      .filter((score) => score.difficulty === difficulty)
      .sort(byTime)
      .map((score, i) => ({ rank: i + 1, ...score }));
  }

  return {
    add({ playerName, difficulty, timeSeconds, hintsUsed = 0, completedAt = new Date().toISOString() }) {
      const score = { scoreId: randomUUID(), playerName, difficulty, timeSeconds, hintsUsed, completedAt };
      writeAll([...readAll(), score]);
      return ranked(difficulty).find((s) => s.scoreId === score.scoreId);
    },

    top(difficulty, limit) {
      return ranked(difficulty).slice(0, limit);
    },
  };
}
