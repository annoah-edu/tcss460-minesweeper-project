const SYMBOLS = { flag: '🚩', mine: '💣', exploded: '💥', 'wrong-flag': '❌' };

function describe(value) {
  if (typeof value === 'number') return value === 0 ? 'empty' : `${value} adjacent mines`;
  return value.replace('-', ' ');
}

export default function Cell({ value, row, col, disabled, highlighted, onReveal, onFlag }) {
  const isNumber = typeof value === 'number';
  const isOpen = isNumber || value === 'mine' || value === 'exploded' || value === 'wrong-flag';
  const className = [
    'cell',
    isOpen ? 'cell--open' : 'cell--closed',
    isNumber ? `cell--n${value}` : `cell--${value}`,
    highlighted && 'cell--hint',
  ].filter(Boolean).join(' ');

  function handleContextMenu(event) {
    event.preventDefault();
    if (!disabled && !isOpen) onFlag();
  }

  return (
    <button
      type="button"
      role="gridcell"
      className={className}
      disabled={disabled || isOpen}
      onClick={onReveal}
      onContextMenu={handleContextMenu}
      aria-label={`Row ${row + 1}, column ${col + 1}: ${describe(value)}${highlighted ? ' (hint: safe)' : ''}`}
    >
      {isNumber ? value || '' : SYMBOLS[value] ?? ''}
    </button>
  );
}
