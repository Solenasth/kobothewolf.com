import { render } from 'preact';
import { App } from './app';
import { getLanguage, initLanguage, onLanguageChange, setLanguage, t, type MessageKey } from './i18n';
import { isLang } from './i18n/languages';
import { applyStatic } from './i18n/static';

function markCurrent() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang]')) {
    link.setAttribute('aria-current', String(link.dataset['lang'] === getLanguage()));
  }
}

// The switch links work without JavaScript; with it they switch in place and
// drop ?lang= so a reload keeps the remembered choice (DESIGN §6).
document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-lang]');
  const lang = link?.dataset['lang'];
  if (!link || !isLang(lang)) return;
  event.preventDefault();
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  history.replaceState(history.state, '', url);
  setLanguage(lang);
});

onLanguageChange(() => {
  // Keys in the HTML are checked at build time (fillStaticHtml throws on unknown ones).
  applyStatic(document, (key) => t(key as MessageKey));
  markCurrent();
});

initLanguage();

const root = document.getElementById('editor-root');
if (root) {
  root.textContent = '';
  render(<App />, root);
}
