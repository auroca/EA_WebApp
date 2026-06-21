import { useCallback, useEffect, useRef, useState } from 'react';
import SearchClearButton from '../../shared/SearchClearButton';

interface ImageUrlPickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  initialSearch?: string;
}

interface WikimediaImageInfo {
  url: string;
  thumburl?: string;
  mime?: string;
  descriptionurl?: string;
}

interface WikimediaPage {
  pageid: number;
  title: string;
  imageinfo?: WikimediaImageInfo[];
}

interface WikimediaSearchResponse {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
}

interface ImageSearchResult {
  id: number;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl?: string;
}

const WIKIMEDIA_API_URL = 'https://commons.wikimedia.org/w/api.php';

const cleanImageTitle = (title: string): string => title.replace(/^File:/, '').replace(/\.[^.]+$/, '');

function ImageUrlPicker({ id, label, value, onChange, initialSearch = '' }: ImageUrlPickerProps) {
  const searchControllerRef = useRef<AbortController | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(() => !value.trim());
  const [previewError, setPreviewError] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const closePicker = (): void => {
    searchControllerRef.current?.abort();
    setIsOpen(false);
  };

  const openPicker = (): void => {
    setSearchText(initialSearch.trim());
    setResults([]);
    setError('');
    setIsOpen(true);
  };

  const searchImages = useCallback(async (query: string): Promise<void> => {
    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setIsSearching(true);
    setError('');

    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        formatversion: '2',
        origin: '*',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: '6',
        gsrlimit: '24',
        prop: 'imageinfo',
        iiprop: 'url|mime',
        iiurlwidth: '520'
      });
      const response = await fetch(`${WIKIMEDIA_API_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Image search failed.');
      }

      const data = (await response.json()) as WikimediaSearchResponse;
      const nextResults = Object.values(data.query?.pages ?? {})
        .map((page): ImageSearchResult | null => {
          const imageInfo = page.imageinfo?.[0];

          if (!imageInfo?.url || !imageInfo.mime?.startsWith('image/')) {
            return null;
          }

          return {
            id: page.pageid,
            title: cleanImageTitle(page.title),
            imageUrl: imageInfo.url,
            thumbnailUrl: imageInfo.thumburl ?? imageInfo.url,
            sourceUrl: imageInfo.descriptionurl
          };
        })
        .filter((result): result is ImageSearchResult => result !== null);

      setResults(nextResults);

      if (nextResults.length === 0) {
        setError('No matching images found.');
      }
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === 'AbortError') {
        return;
      }

      setResults([]);
      setError('Unable to search images right now.');
    } finally {
      if (searchControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const query = searchText.trim();
    searchControllerRef.current?.abort();

    if (query.length < 3) {
      setIsSearching(false);
      setResults([]);
      setError('');
      return;
    }

    const searchTimer = window.setTimeout(() => {
      void searchImages(query);
    }, 500);

    return () => {
      window.clearTimeout(searchTimer);
    };
  }, [isOpen, searchImages, searchText]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closePicker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectImage = (result: ImageSearchResult): void => {
    onChange(result.imageUrl);
    setPreviewError('');
    setIsEditing(false);
    closePicker();
  };

  const handleChangeImage = (): void => {
    onChange('');
    setPreviewError('');
    setIsEditing(true);
  };

  const hasSelectedImage = value.trim().length > 0 && !isEditing;

  return (
    <div className="image-url-picker">
      <label htmlFor={id}>{label}</label>

      {hasSelectedImage ? (
        <div className="image-url-preview">
          <img
            src={value}
            alt={`${label} preview`}
            onError={() => {
              setPreviewError('Unable to load this image URL. Choose another image.');
              setIsEditing(true);
            }}
          />
          <button type="button" className="create-route-map-button image-url-change-button" onClick={handleChangeImage}>
            Change image
          </button>
        </div>
      ) : (
        <>
          <div className="image-url-picker-row">
            <input
              id={id}
              type="url"
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                setPreviewError('');
              }}
              onBlur={() => {
                if (value.trim()) {
                  setIsEditing(false);
                }
              }}
            />
            <button type="button" className="create-route-map-button image-url-picker-button" onClick={openPicker}>
              Select an image from internet
            </button>
          </div>
          {previewError ? <p className="image-url-preview-error">{previewError}</p> : null}
        </>
      )}

      {isOpen ? (
        <div className="image-picker-backdrop" role="presentation" onMouseDown={closePicker}>
          <section
            className="image-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-image-picker-title`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="image-picker-header">
              <div>
                <h3 id={`${id}-image-picker-title`}>Select an image from internet</h3>
                <p>Search Wikimedia Commons and choose an image to copy its direct URL.</p>
              </div>

              <button type="button" className="point-map-close-button" aria-label="Close image search" onClick={closePicker}>
                &times;
              </button>
            </div>

            <div className="image-picker-search">
              <input
                type="text"
                value={searchText}
                autoComplete="off"
                autoFocus
                placeholder="Type a city, landmark or subject"
                aria-label="Search internet images"
                onChange={(event) => setSearchText(event.target.value)}
              />

              {searchText ? (
                <SearchClearButton
                  className="image-picker-search-clear"
                  ariaLabel="Clear image search"
                  onClick={() => {
                    searchControllerRef.current?.abort();
                    setSearchText('');
                    setResults([]);
                    setError('');
                    setIsSearching(false);
                  }}
                />
              ) : null}
            </div>

            {isSearching ? <p className="image-picker-status">Searching images...</p> : null}
            {!isSearching && error ? <p className="image-picker-status error">{error}</p> : null}
            {!isSearching && !error && searchText.trim().length < 3 ? (
              <p className="image-picker-status">Type at least 3 characters to search.</p>
            ) : null}

            <div className="image-picker-grid">
              {results.map((result) => (
                <article className="image-picker-result" key={result.id}>
                  <button type="button" onClick={() => selectImage(result)}>
                    <img src={result.thumbnailUrl} alt={result.title} loading="lazy" />
                    <span>{result.title}</span>
                  </button>

                  {result.sourceUrl ? (
                    <a href={result.sourceUrl} target="_blank" rel="noreferrer">
                      View source
                    </a>
                  ) : null}
                </article>
              ))}
            </div>

            <p className="image-picker-notice">Images are provided by Wikimedia Commons. Check the source page for license and attribution.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default ImageUrlPicker;
