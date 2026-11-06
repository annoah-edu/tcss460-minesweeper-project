import { Router } from 'express';
import {
  assertPlayable, boardView, createGame, elapsedSeconds, flagsPlaced, reveal, toggleFlag,
} from '../lib/board.js';
import { HttpError } from '../lib/httpError.js';
import { getHint } from '../lib/solver.js';
import { validateCell, validateDifficulty, validatePlayerName } from '../lib/validate.js';

// Keeps AI cost down once Phase III sends hints to the LLM.
const HINTS_PER_GAME = Number(process.env.HINTS_PER_GAME) || 3;

export function toGameResponse(game) {
  const flags = flagsPlaced(game);
  return {
    gameId: game.id,
    difficulty: game.difficulty,
    playerName: game.playerName,
    rows: game.rows,
    cols: game.cols,
    mines: game.mines,
    flagsPlaced: flags,
    minesRemaining: game.mines - flags,
    status: game.status,
    elapsedSeconds: elapsedSeconds(game),
    hintsUsed: game.hintsUsed,
    hintsRemaining: HINTS_PER_GAME - game.hintsUsed,
    board: boardView(game),
  };
}

export function gamesRouter({ gameStore, scoreStore }) {
  const router = Router();

  function findGame(req) {
    const game = gameStore.get(req.params.gameId);
    if (!game) throw new HttpError(404, `No game found with id ${req.params.gameId}.`);
    return game;
  }

  // Start a new game. Mines are not placed until the first reveal.
  router.post('/', (req, res) => {
    const difficulty = validateDifficulty(req.body?.difficulty);
    const playerName = validatePlayerName(req.body?.playerName);
    const game = createGame(difficulty);
    game.playerName = playerName;
    gameStore.add(game);
    res.status(201).json(toGameResponse(game));
  });

  router.get('/:gameId', (req, res) => {
    res.json(toGameResponse(findGame(req)));
  });

  router.post('/:gameId/reveal', (req, res) => {
    const game = findGame(req);
    const { row, col } = validateCell(req.body, game);
    reveal(game, row, col);

    // The server times the game, so a score can't be faked from the browser.
    let newScore = null;
    if (game.status === 'won' && game.playerName) {
      newScore = scoreStore.add({
        playerName: game.playerName,
        difficulty: game.difficulty,
        timeSeconds: elapsedSeconds(game),
        hintsUsed: game.hintsUsed,
      });
    }
    res.json({ ...toGameResponse(game), newScore });
  });

  router.post('/:gameId/flag', (req, res) => {
    const game = findGame(req);
    const { row, col } = validateCell(req.body, game);
    toggleFlag(game, row, col);
    res.json(toGameResponse(game));
  });

  // The rule-based solver picks the hint and proves it; the explanation is a
  // template for now and will be reworded by the LLM in Phase III.
  router.post('/:gameId/hint', (req, res) => {
    const game = findGame(req);
    assertPlayable(game);
    const hint = getHint(game);
    if (hint.type !== 'first-move') {
      if (game.hintsUsed >= HINTS_PER_GAME) {
        throw new HttpError(429, `Hint limit reached (${HINTS_PER_GAME} per game).`);
      }
      game.hintsUsed++;
    }
    res.json({ hint, hintsUsed: game.hintsUsed, hintsRemaining: HINTS_PER_GAME - game.hintsUsed });
  });

  return router;
}
