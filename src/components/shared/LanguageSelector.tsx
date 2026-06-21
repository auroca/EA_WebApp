import { localeLabels, localeNames, type Locale } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';

const locales: Locale[] = ['en', 'es', 'ca'];

function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className="language-selector" aria-label={t('common.language')}>
      <span>{t('common.language')}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
        {locales.map((option) => (
          <option key={option} value={option}>
            {localeLabels[option]} · {localeNames[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelector;
