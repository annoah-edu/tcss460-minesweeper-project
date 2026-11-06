import Cell from './Cell.jsx';

export default function GameBoard({ game, hintCell, flagMode, onReveal, onFlag }) {
  const over = game.status === 'won' || game.status === 'lost';

  return (
    <div className="board-scroll">
      <div
        className={`board board--${game.status}`}
        style={{ gridTemplateColumns: `repeat(${game.cols}, var(--cell-size))` }}
        role="grid"
        aria-label={`${game.rows} by ${game.cols} minefield`}
      >
        {game.board.map((cells, row) =>
          cells.map((value, col) => (
            <Cell
              key={`${row}-${col}`}
              value={value}
              row={row}
              col={col}
              disabled={over}
              highlighted={hintCell?.row === row && hintCell?.col === col}
              onReveal={() => (flagMode ? onFlag(row, col) : onReveal(row, col))}
              onFlag={() => onFlag(row, col)}
            />
          )),
        )}
      </div>
    </div>
  );
}
