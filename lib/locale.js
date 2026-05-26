const DEFAULT_LOCALE = 'zh-CN';
const EN_LOCALE = 'en-US';

const LOCALES = [DEFAULT_LOCALE, EN_LOCALE];

function normalizeLocale(locale) {
  if (locale === 'en' || locale === EN_LOCALE) return EN_LOCALE;
  return DEFAULT_LOCALE;
}

function getLocalePrefix(locale) {
  return normalizeLocale(locale) === EN_LOCALE ? '/en' : '';
}

function getLocaleCode(locale) {
  return normalizeLocale(locale) === EN_LOCALE ? 'en' : 'zh';
}

function getOtherLocale(locale) {
  return normalizeLocale(locale) === EN_LOCALE ? DEFAULT_LOCALE : EN_LOCALE;
}

function withLocalePath(locale, path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getLocalePrefix(locale)}${normalizedPath}` || '/';
}

module.exports = {
  DEFAULT_LOCALE,
  EN_LOCALE,
  LOCALES,
  getLocaleCode,
  getLocalePrefix,
  getOtherLocale,
  normalizeLocale,
  withLocalePath,
};
