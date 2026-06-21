import { useEffect, useState } from 'react';
import {
  FaArrowPointer,
  FaArrowRotateLeft,
  FaCircleHalfStroke,
  FaDroplet,
  FaEye,
  FaKeyboard,
  FaMinus,
  FaMoon,
  FaPalette,
  FaPlus,
  FaSun,
  FaTextHeight,
  FaUniversalAccess
} from 'react-icons/fa6';
import { useLanguage } from '../../i18n/LanguageContext';
import './AccessibilityPanel.css';

type ColorMode =
  | 'default'
  | 'dark'
  | 'light'
  | 'monochrome'
  | 'lowSaturation'
  | 'highSaturation'
  | 'highContrast';

type CursorMode = 'default' | 'white' | 'black';

type AccessibilitySettings = {
  colorMode: ColorMode;
  fontLevel: number;
  lineSpacing: boolean;
  wordSpacing: boolean;
  letterSpacing: boolean;
  visibleFocus: boolean;
  cursorMode: CursorMode;
};

const DEFAULT_SETTINGS: AccessibilitySettings = {
  colorMode: 'default',
  fontLevel: 0,
  lineSpacing: false,
  wordSpacing: false,
  letterSpacing: false,
  visibleFocus: false,
  cursorMode: 'default'
};

const STORAGE_KEY = 'accessibility-settings';

function AccessibilityPanel() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);

      return savedSettings
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }
        : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    document.body.classList.remove(
      'accessibility-dark-mode',
      'accessibility-light-mode',
      'accessibility-monochrome',
      'accessibility-low-saturation',
      'accessibility-high-saturation',
      'accessibility-high-contrast',
      'accessibility-font-1',
      'accessibility-font-2',
      'accessibility-font-3',
      'accessibility-cursor-white',
      'accessibility-cursor-black'
    );

    if (settings.colorMode === 'dark') {
      document.body.classList.add('accessibility-dark-mode');
    }

    if (settings.colorMode === 'light') {
      document.body.classList.add('accessibility-light-mode');
    }

    if (settings.colorMode === 'monochrome') {
      document.body.classList.add('accessibility-monochrome');
    }

    if (settings.colorMode === 'lowSaturation') {
      document.body.classList.add('accessibility-low-saturation');
    }

    if (settings.colorMode === 'highSaturation') {
      document.body.classList.add('accessibility-high-saturation');
    }

    if (settings.colorMode === 'highContrast') {
      document.body.classList.add('accessibility-high-contrast');
    }

    if (settings.fontLevel > 0) {
      document.body.classList.add(`accessibility-font-${settings.fontLevel}`);
    }

    if (settings.cursorMode === 'white') {
      document.body.classList.add('accessibility-cursor-white');
    }

    if (settings.cursorMode === 'black') {
      document.body.classList.add('accessibility-cursor-black');
    }

    document.body.classList.toggle('accessibility-line-spacing', settings.lineSpacing);
    document.body.classList.toggle('accessibility-word-spacing', settings.wordSpacing);
    document.body.classList.toggle('accessibility-letter-spacing', settings.letterSpacing);
    document.body.classList.toggle('accessibility-visible-focus', settings.visibleFocus);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setColorMode = (colorMode: ColorMode) => {
    setSettings((prev) => ({
      ...prev,
      colorMode: prev.colorMode === colorMode ? 'default' : colorMode
    }));
  };

  const setCursorMode = (cursorMode: CursorMode) => {
    setSettings((prev) => ({
      ...prev,
      cursorMode: prev.cursorMode === cursorMode ? 'default' : cursorMode
    }));
  };

  const increaseFont = () => {
    setSettings((prev) => ({
      ...prev,
      fontLevel: Math.min(3, prev.fontLevel + 1)
    }));
  };

  const decreaseFont = () => {
    setSettings((prev) => ({
      ...prev,
      fontLevel: Math.max(0, prev.fontLevel - 1)
    }));
  };

  const toggleSetting = (
    key: 'lineSpacing' | 'wordSpacing' | 'letterSpacing' | 'visibleFocus'
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="accessibility-widget">
      <button
        type="button"
        className="accessibility-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('accessibility.open')}
      >
        <FaUniversalAccess />
      </button>

      {isOpen && (
        <section className="accessibility-panel">
          <div className="accessibility-panel-header">
            <h2>{t('accessibility.title')}</h2>

            <button
              type="button"
              className="accessibility-close-button"
              onClick={() => setIsOpen(false)}
              aria-label={t('accessibility.close')}
            >
              ×
            </button>
          </div>

          <div className="accessibility-section">
            <h3>{t('accessibility.colorAdjustment')}</h3>

            <div className="accessibility-grid accessibility-color-grid">
              <button
                type="button"
                className={`accessibility-card ${
                  settings.colorMode === 'monochrome' ? 'active' : ''
                }`}
                onClick={() => setColorMode('monochrome')}
              >
                <FaEye />
                <span>{t('accessibility.monochrome')}</span>
              </button>

              <button
                type="button"
                className={`accessibility-card ${
                  settings.colorMode === 'dark' ? 'active' : ''
                }`}
                onClick={() => setColorMode('dark')}
              >
                <FaMoon />
                <span>{t('accessibility.darkContrast')}</span>
              </button>

              <button
                type="button"
                className={`accessibility-card ${
                  settings.colorMode === 'light' ? 'active' : ''
                }`}
                onClick={() => setColorMode('light')}
              >
                <FaSun />
                <span>{t('accessibility.lightContrast')}</span>
              </button>

              <button
                type="button"
                className={`accessibility-card ${
                  settings.colorMode === 'lowSaturation' ? 'active' : ''
                }`}
                onClick={() => setColorMode('lowSaturation')}
              >
                <FaDroplet />
                <span>{t('accessibility.lowSaturation')}</span>
              </button>

              <button
                type="button"
                className={`accessibility-card ${
                  settings.colorMode === 'highSaturation' ? 'active' : ''
                }`}
                onClick={() => setColorMode('highSaturation')}
              >
                <FaPalette />
                <span>{t('accessibility.highSaturation')}</span>
              </button>

              <button
                type="button"
                className={`accessibility-card ${
                  settings.colorMode === 'highContrast' ? 'active' : ''
                }`}
                onClick={() => setColorMode('highContrast')}
              >
                <FaCircleHalfStroke />
                <span>{t('accessibility.highContrast')}</span>
              </button>
            </div>
          </div>

          <div className="accessibility-section">
            <h3>{t('accessibility.contentAdjustment')}</h3>

            <div className="accessibility-content-box">
              <div className="accessibility-content-title">
                <FaTextHeight />

                <div>
                  <strong>{t('accessibility.fontSettings')}</strong>
                  <span>{t('accessibility.fontSettingsHelp')}</span>
                </div>
              </div>

              <div className="accessibility-font-controls">
                <button
                  type="button"
                  onClick={decreaseFont}
                  aria-label={t('accessibility.decreaseFont')}
                >
                  <FaMinus />
                </button>

                <span className="accessibility-font-level">
                  {t('accessibility.level', { level: settings.fontLevel })}
                </span>

                <button
                  type="button"
                  onClick={increaseFont}
                  aria-label={t('accessibility.increaseFont')}
                >
                  <FaPlus />
                </button>
              </div>

              <div className="accessibility-pill-row">
                <button
                  type="button"
                  className={
                    settings.lineSpacing
                      ? 'accessibility-pill active'
                      : 'accessibility-pill'
                  }
                  onClick={() => toggleSetting('lineSpacing')}
                >
                  {t('accessibility.lineSpacing')}
                </button>

                <button
                  type="button"
                  className={
                    settings.wordSpacing
                      ? 'accessibility-pill active'
                      : 'accessibility-pill'
                  }
                  onClick={() => toggleSetting('wordSpacing')}
                >
                  {t('accessibility.wordSpacing')}
                </button>

                <button
                  type="button"
                  className={
                    settings.letterSpacing
                      ? 'accessibility-pill active'
                      : 'accessibility-pill'
                  }
                  onClick={() => toggleSetting('letterSpacing')}
                >
                  {t('accessibility.letterSpacing')}
                </button>
              </div>
            </div>

            <div className="accessibility-content-box">
              <div className="accessibility-content-title">
                <FaArrowPointer />

                <div>
                  <strong>{t('accessibility.cursor')}</strong>
                  <span>{t('accessibility.cursorHelp')}</span>
                </div>
              </div>

              <div className="accessibility-cursor-row">
                <button
                  type="button"
                  className={
                    settings.cursorMode === 'white'
                      ? 'accessibility-pill active'
                      : 'accessibility-pill'
                  }
                  onClick={() => setCursorMode('white')}
                >
                  {t('accessibility.white')}
                </button>

                <button
                  type="button"
                  className={
                    settings.cursorMode === 'black'
                      ? 'accessibility-pill active'
                      : 'accessibility-pill'
                  }
                  onClick={() => setCursorMode('black')}
                >
                  {t('accessibility.black')}
                </button>
              </div>
            </div>

            <div className="accessibility-grid accessibility-bottom-grid">
              <button
                type="button"
                className={`accessibility-card ${
                  settings.visibleFocus ? 'active' : ''
                }`}
                onClick={() => toggleSetting('visibleFocus')}
              >
                <FaKeyboard />
                <span>{t('accessibility.visibleFocus')}</span>
              </button>

              <button
                type="button"
                className="accessibility-card"
                onClick={resetSettings}
              >
                <FaArrowRotateLeft />
                <span>{t('accessibility.reset')}</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default AccessibilityPanel;
