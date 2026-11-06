import { useEffect, useState } from 'react';
import { flagCell, getDifficulties, getHint, revealCell, startGame } from './api.js';
import NavBar from './components/NavBar.jsx';
import NewGameForm from './components/NewGameForm.jsx';
import StatusBar from './components/StatusBar.jsx';
import GameBoard from './components/GameBoard.jsx';
import HintPanel from './components/HintPanel.jsx';
import Leaderboard from './components/Leaderboard.jsx';

export default function App() {
  const [difficulties, setDifficulties] = useState([]);
  const [game, setGame] = useState(null);
  const [hint, setHint] = useState(null);
  const [clockStart, setClockStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flagMode, setFlagMode] = useState(false);
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState('beginner');
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);

  useEffect(() => {
    getDifficulties().then(setDifficulties).catch((err) => setError(err.message));
  }, []);

  // Sends one request to the API and handles loading and error state.
  async function send(action) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Every move returns the new game state; any old hint no longer applies.
  function showGame(next) {
    setGame(next);
    setHint(null);
    setClockStart(Date.now() - next.elapsedSeconds * 1000);
    if (next.newScore) {
      setLeaderboardDifficulty(next.difficulty);
      setLeaderboardVersion((v) => v + 1);
    }
  }

  const handleStart = (options) => send(async () => showGame(await startGame(options)));
  const handleReveal = (row, col) => send(async () => showGame(await revealCell(game.gameId, row, col)));
  const handleFlag = (row, col) => send(async () => showGame(await flagCell(game.gameId, row, col)));
  const handleHint = () => send(async () => {
    const result = await getHint(game.gameId);
    setHint(result.hint);
    setGame((current) => ({ ...current, hintsUsed: result.hintsUsed, hintsRemaining: result.hintsRemaining }));
  });

  return (
    <>
      <NavBar />
      <div className="app">
        <main className="layout">
          <section className="panel game-panel" aria-label="Game">
            <NewGameForm difficulties={difficulties} onStart={handleStart} disabled={busy} />

            {error && <p className="error" role="alert">{error}</p>}

            {game ? (
              <>
                <StatusBar game={game} clockStart={clockStart} />
                <label className="flag-mode">
                  <input type="checkbox" checked={flagMode} onChange={(e) => setFlagMode(e.target.checked)} />
                  Flag mode (for touch screens: taps place flags)
                </label>
                <GameBoard
                  game={game}
                  hintCell={hint?.type === 'safe' || hint?.type === 'first-move' ? hint : null}
                  flagMode={flagMode}
                  onReveal={handleReveal}
                  onFlag={handleFlag}
                />
                <p className="muted board-help">Click to reveal, right-click (or flag mode) to flag.</p>
              </>
            ) : (
              <p className="empty">Pick a difficulty and press <strong>New Game</strong> to start.</p>
            )}
          </section>

          <div className="sidebar">
            <HintPanel game={game} hint={hint} onGetHint={handleHint} busy={busy} />
            <Leaderboard
              difficulties={difficulties}
              difficulty={leaderboardDifficulty}
              onDifficultyChange={setLeaderboardDifficulty}
              refreshKey={leaderboardVersion}
              highlightId={game?.newScore?.scoreId}
            />
          </div>
        </main>
      </div>
    </>
  );
}
