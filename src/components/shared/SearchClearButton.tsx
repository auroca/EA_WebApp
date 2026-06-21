interface SearchClearButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}

function SearchClearButton({ onClick, ariaLabel = 'Clear search', className = '' }: SearchClearButtonProps) {
  const buttonClassName = ['search-clear-button', className].filter(Boolean).join(' ');

  return (
    <button type="button" className={buttonClassName} onClick={onClick} aria-label={ariaLabel}>
      &times;
    </button>
  );
}

export default SearchClearButton;
