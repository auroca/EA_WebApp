import { getTopNavIconPath, type SortOption } from '../../utils/homeView';
import SearchClearButton from './SearchClearButton';
import { useLanguage } from '../../i18n/LanguageContext';

export type AccessibilityFilter = 'all' | 'yes' | 'no';

interface SearchAreaProps {
  searchInput: string;
  isSearchActive: boolean;
  hasActiveFilter: boolean;
  isFilterOpen: boolean;
  sortOption: SortOption | null;
  accessibilityFilter: AccessibilityFilter;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onToggleFilter: () => void;
  onClearSearch: () => void;
  onSelectSortOption: (option: SortOption) => void;
  onAccessibilityFilterChange: (value: AccessibilityFilter) => void;
}

function SearchArea({
  searchInput,
  isSearchActive,
  hasActiveFilter,
  isFilterOpen,
  sortOption,
  accessibilityFilter,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onToggleFilter,
  onClearSearch,
  onSelectSortOption,
  onAccessibilityFilterChange
}: SearchAreaProps) {
  const { t } = useLanguage();
  const isSortSelected = (option: SortOption): boolean => sortOption === option;

  return (
    <div className="search-area">
      <div className="search-bar">
        <img
          className="search-icon"
          src={getTopNavIconPath('search', isSearchActive)}
          alt=""
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
        />
        <button
          type="button"
          className="filter-button"
          aria-label={t('search.filterResults')}
          onClick={onToggleFilter}
        >
          <img
            src={getTopNavIconPath('filter', hasActiveFilter)}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </button>
        {searchInput || hasActiveFilter ? <SearchClearButton ariaLabel={t('search.clear')} onClick={onClearSearch} /> : null}
        <button type="button" className="search-submit-button" aria-label={t('search.search')}>
          {t('search.search')}
        </button>
      </div>

      {isFilterOpen ? (
        <div className="filter-panel" role="menu" aria-label={t('search.sortOptions')}>
          <div className="filter-group">
            <label className="filter-select-label">
              {t('search.accessible')}
              <select
                value={accessibilityFilter}
                onChange={(event) => onAccessibilityFilterChange(event.target.value as AccessibilityFilter)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="yes">{t('common.yes')}</option>
                <option value="no">{t('common.no')}</option>
              </select>
            </label>
          </div>

          <div className="filter-group">
            <button type="button" onClick={() => onSelectSortOption('difficulty-asc')}>
              <span className={isSortSelected('difficulty-asc') ? 'filter-check active' : 'filter-check'}>
                {isSortSelected('difficulty-asc') ? '☑' : '☐'}
              </span>
              {t('search.difficultyAsc')}
            </button>
            <button type="button" onClick={() => onSelectSortOption('difficulty-desc')}>
              <span className={isSortSelected('difficulty-desc') ? 'filter-check active' : 'filter-check'}>
                {isSortSelected('difficulty-desc') ? '☑' : '☐'}
              </span>
              {t('search.difficultyDesc')}
            </button>
          </div>

          <div className="filter-group">
            <button type="button" onClick={() => onSelectSortOption('duration-asc')}>
              <span className={isSortSelected('duration-asc') ? 'filter-check active' : 'filter-check'}>
                {isSortSelected('duration-asc') ? '☑' : '☐'}
              </span>
              {t('search.durationAsc')}
            </button>
            <button type="button" onClick={() => onSelectSortOption('duration-desc')}>
              <span className={isSortSelected('duration-desc') ? 'filter-check active' : 'filter-check'}>
                {isSortSelected('duration-desc') ? '☑' : '☐'}
              </span>
              {t('search.durationDesc')}
            </button>
          </div>

          <div className="filter-group">
            <button type="button" onClick={() => onSelectSortOption('distance-asc')}>
              <span className={isSortSelected('distance-asc') ? 'filter-check active' : 'filter-check'}>
                {isSortSelected('distance-asc') ? '☑' : '☐'}
              </span>
              {t('search.distanceAsc')}
            </button>
            <button type="button" onClick={() => onSelectSortOption('distance-desc')}>
              <span className={isSortSelected('distance-desc') ? 'filter-check active' : 'filter-check'}>
                {isSortSelected('distance-desc') ? '☑' : '☐'}
              </span>
              {t('search.distanceDesc')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SearchArea;
