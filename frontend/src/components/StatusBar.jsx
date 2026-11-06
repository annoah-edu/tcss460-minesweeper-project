import { useEffect, useState } from 'react';

const FACES = { ready: '🙂', playing: '🙂', won: '😎', lost: '😵' };

export default function StatusBar({ game, clockStart }) {
  const [now, setNow] = useState(Date.now());

  // The server is the real clock; this only ticks the display between requests.
  useEffect(() => {
    if (game.status !== 'playing') return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [game.status]);

  const seconds = game.status === 'playing'
    ? Math.max(0, (now - clockStart) / 1000)
    : game.elapsedSeconds;

  return (
    <div className="status">
      <div className="status-bar">
        <span className="counter" title="Mines left (mines minus flags)">🚩 {game.minesRemaining}</span>
        <span className="face" aria-hidden="true">{FACES[game.status]}</span>
        <span className="counter" title="Time">⏱ {Math.floor(seconds)}s</span>
      </div>

      {game.status === 'won' && (
        <p className="message win" role="status">
          You cleared the board in {game.elapsedSeconds}s!
          {game.newScore
            ? ` Saved to the leaderboard at rank #${game.newScore.rank}.`
            : ' Enter a name next time to save your time.'}
        </p>
      )}
      {game.status === 'lost' && (
        <p className="message loss" role="status">Boom! You hit a mine. Start a new game to try again.</p>
      )}
    </div>
  );
}
