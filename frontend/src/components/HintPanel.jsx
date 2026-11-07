const TITLES = {
  safe: 'Safe move found',
  'first-move': 'Getting started',
  none: 'No guaranteed safe move',
};

export default function HintPanel({ game, hint, onGetHint, busy }) {
  const playing = game && (game.status === 'ready' || game.status === 'playing');
  const outOfHints = game && game.status === 'playing' && game.hintsRemaining <= 0;

  return (
    <section className="panel hint-panel" aria-label="AI hint">
      <h2>💡 AI Hint</h2>
      <button type="button" className="primary" onClick={onGetHint} disabled={!playing || busy || outOfHints}>
        Get Hint
      </button>
      {game && (
        <span className="muted hint-count">
          {game.hintsRemaining} of {game.hintsUsed + game.hintsRemaining} hints left
        </span>
      )}

      <div className="hint-box" role="status">
        {hint ? (
          <>
            <strong>{TITLES[hint.type]}</strong>
            <p>{hint.explanation}</p>
          </>
        ) : (
          <p className="muted">
            {game
              ? 'Stuck? A hint highlights a square that is provably safe and explains why.'
              : 'Start a game to use hints.'}
          </p>
        )}
      </div>
    </section>
  );
}
