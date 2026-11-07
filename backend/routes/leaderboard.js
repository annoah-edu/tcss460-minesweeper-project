import { Router } from 'express';
import { validateDifficulty, validateLimit } from '../lib/validate.js';

export function leaderboardRouter({ scoreStore }) {
  const router = Router();

  // GET /api/leaderboard?difficulty=beginner&limit=10
  router.get('/', (req, res) => {
    const difficulty = validateDifficulty(req.query.difficulty ?? 'beginner');
    const limit = validateLimit(req.query.limit);
    res.json({ difficulty, scores: scoreStore.top(difficulty, limit) });
  });

  return router;
}
