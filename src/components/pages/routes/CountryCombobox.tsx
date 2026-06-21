import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_NAMES, normalizeCountrySearch } from './countries';

interface CountryComboboxProps {
  value: string;
  onChange: (country: string) => void;
}

function CountryCombobox({ value, onChange }: CountryComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const filteredCountries = useMemo(() => {
    const query = normalizeCountrySearch(value);

    if (!query) {
      return COUNTRY_NAMES;
    }

    return COUNTRY_NAMES.filter((country) => normalizeCountrySearch(country).includes(query));
  }, [value]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [filteredCountries]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const selectCountry = (country: string): void => {
    onChange(country);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.min(current + 1, filteredCountries.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectCountry(filteredCountries[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="country-combobox-field" ref={containerRef}>
      <label htmlFor="create-route-country">Country</label>

      <div className="country-combobox">
        <input
          id="create-route-country"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="create-route-country-options"
          aria-activedescendant={activeIndex >= 0 ? `country-option-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Type to search countries"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className="country-combobox-toggle"
          aria-label={isOpen ? 'Close country list' : 'Open country list'}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span aria-hidden="true">⌄</span>
        </button>

        {isOpen ? (
          <div className="country-combobox-options" id="create-route-country-options" role="listbox">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <button
                  type="button"
                  id={`country-option-${index}`}
                  className={index === activeIndex ? 'active' : ''}
                  role="option"
                  aria-selected={country === value}
                  key={country}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectCountry(country)}
                >
                  {country}
                </button>
              ))
            ) : (
              <p className="country-combobox-empty">No matching countries</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CountryCombobox;
