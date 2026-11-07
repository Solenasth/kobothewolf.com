// The page theme switcher (FR-P10, DESIGN §6). tema.js already applied the
// remembered theme before the first paint; this shows the select, which needs
// JavaScript to do anything, and remembers changes.
export const THEME_KEY = 'kobo-theme';

export function setUpThemes(select: HTMLSelectElement, byDefault: string): void {
  const root = document.documentElement;
  const known = [...select.options].map((o) => o.value);
  const current = root.getAttribute('data-theme');
  select.value = current && known.includes(current) ? current : byDefault;
  select.closest<HTMLElement>('.tema')?.removeAttribute('hidden');
  select.addEventListener('change', () => {
    const theme = select.value;
    if (theme === byDefault) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage blocked: the theme still applies until the page is left.
    }
  });
}
