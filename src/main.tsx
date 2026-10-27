import { setUpInquiryForm } from './contact/form';
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

const inquiry = document.querySelector<HTMLFormElement>('#inquiry');
if (inquiry) setUpInquiryForm(inquiry);

// The editor loads after the page, when the browser is idle, so the profile
// never waits for it (NFR-2, DESIGN §5.6).
const editorRoot = document.getElementById('editor-root');
if (editorRoot) {
  editorRoot.querySelector<HTMLElement>('[data-i18n="editor.loading"]')?.removeAttribute('hidden');
  const load = () =>
    import('./editor').then(
      ({ mountEditor }) => mountEditor(editorRoot),
      (error: unknown) => {
        console.error(error);
        const p = document.createElement('p');
        p.textContent = t('editor.failed');
        editorRoot.replaceChildren(p);
      },
    );
  const whenIdle = () => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 2000 }) : setTimeout(load, 200));
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('load', whenIdle, { once: true });
}
