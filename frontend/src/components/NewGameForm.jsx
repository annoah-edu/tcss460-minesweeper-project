import { useState } from 'react';

export function difficultyLabel(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export default function NewGameForm({ difficulties, onStart, disabled }) {
  const [difficulty, setDifficulty] = useState('beginner');
  const [playerName, setPlayerName] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onStart({ difficulty, playerName: playerName.trim() || undefined });
  }

  return (
    <form className="new-game" onSubmit={handleSubmit}>
      <label>
        Difficulty
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {difficulties.map((d) => (
            <option key={d.id} value={d.id}>
              {difficultyLabel(d.id)} ({d.rows}×{d.cols}, {d.mines} mines)
            </option>
          ))}
        </select>
      </label>

      <label>
        Name for the leaderboard
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Optional"
          maxLength={20}
        />
      </label>

      <button type="submit" className="primary" disabled={disabled || difficulties.length === 0}>
        New Game
      </button>
    </form>
  );
}
