import express from 'express';
import cors from 'cors';
import { DIFFICULTIES, GameOverError } from './lib/board.js';
import { HttpError } from './lib/httpError.js';
import { createGameStore } from './lib/gameStore.js';
import { createScoreStore } from './lib/scoreStore.js';
import { gamesRouter } from './routes/games.js';
import { leaderboardRouter } from './routes/leaderboard.js';

// Every error leaves the API as { error: { status, message } }.
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong on the server.';

  if (err instanceof HttpError) {
    ({ status, message } = err);
  } else if (err instanceof GameOverError) {
    status = 409;
    message = err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body must be valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  } else {
    console.error(err);
  }
  res.status(status).json({ error: { status, message } });
}

export function createApp({ gameStore = createGameStore(), scoreStore = createScoreStore() } = {}) {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/difficulties', (req, res) => {
    const difficulties = Object.entries(DIFFICULTIES).map(([id, config]) => ({ id, ...config }));
    res.json({ difficulties });
  });

  app.use('/api/games', gamesRouter({ gameStore, scoreStore }));
  app.use('/api/leaderboard', leaderboardRouter({ scoreStore }));

  app.use('/api', (req, res, next) => {
    next(new HttpError(404, `No API route for ${req.method} ${req.originalUrl}.`));
  });
  app.use(errorHandler);

  return app;
}
