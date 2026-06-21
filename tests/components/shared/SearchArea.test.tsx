import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchArea from '../../../src/components/shared/SearchArea';
import { LanguageProvider } from '../../../src/i18n/LanguageContext';

const renderWithLanguage = (ui: ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

const defaultProps = {
  searchInput: '',
  isSearchActive: false,
  hasActiveFilter: false,
  isFilterOpen: false,
  sortOption: null,
  onSearchChange: vi.fn(),
  onSearchFocus: vi.fn(),
  onSearchBlur: vi.fn(),
  onToggleFilter: vi.fn(),
  onClearSearch: vi.fn(),
  onSelectSortOption: vi.fn()
};

describe('SearchArea', () => {
  it('notifies when the user types, focuses and clears the search', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      searchInput: 'beach',
      isSearchActive: true,
      onSearchChange: vi.fn(),
      onSearchFocus: vi.fn(),
      onClearSearch: vi.fn()
    };

    renderWithLanguage(<SearchArea {...props} />);

    const input = screen.getByPlaceholderText('Where do you want to explore today?');
    await user.click(input);
    await user.type(input, ' walk');
    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(props.onSearchFocus).toHaveBeenCalledTimes(1);
    expect(props.onSearchChange).toHaveBeenCalled();
    expect(props.onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('shows sort options and selects the chosen filter', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      isFilterOpen: true,
      sortOption: 'duration-desc' as const,
      onSelectSortOption: vi.fn()
    };

    renderWithLanguage(<SearchArea {...props} />);

    expect(screen.getByRole('menu', { name: /sort options/i })).toBeInTheDocument();
    expect(screen.getByText('☑')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /distance ↑/i }));

    expect(props.onSelectSortOption).toHaveBeenCalledWith('distance-asc');
  });
});
