import { useEffect, useState } from 'react';
import { getLeaderboard } from '../api.js';
import { difficultyLabel } from './NewGameForm.jsx';

export default function Leaderboard({ difficulties, difficulty, onDifficultyChange, refreshKey, highlightId }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getLeaderboard(difficulty)
      .then((data) => { if (!cancelled) setScores(data.scores); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [difficulty, refreshKey]);

  return (
    <aside className="panel leaderboard" id="leaderboard" aria-label="Leaderboard">
      <h2>🏆 Leaderboard</h2>

      <div className="tabs" role="tablist">
        {difficulties.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === difficulty}
            className={d.id === difficulty ? 'tab tab--active' : 'tab'}
            onClick={() => onDifficultyChange(d.id)}
          >
            {difficultyLabel(d.id)}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {!error && loading && <p className="muted">Loading…</p>}
      {!error && !loading && scores.length === 0 && (
        <p className="muted">No wins yet. Be the first!</p>
      )}
      {!error && !loading && scores.length > 0 && (
        <table>
          <thead>
            <tr><th>#</th><th>Player</th><th>Time</th></tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.scoreId} className={s.scoreId === highlightId ? 'highlight' : undefined}>
                <td>{s.rank}</td>
                <td>{s.playerName}</td>
                <td>{s.timeSeconds.toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  );
}
