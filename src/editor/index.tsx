// The editor chunk, imported by main.tsx after the page has loaded (NFR-2,
// DESIGN §5.6). Importing src/styles.ts brings every face's CSS with it.
import { render } from 'preact';
import { variants } from '../styles';
import { Editor } from './Editor';
import { createSession, type Session } from './session';
import './editor.css';

export function mountEditor(root: HTMLElement): void {
  const sessions = new Map<string, Session>();
  for (const [estilo, list] of variants) sessions.set(estilo, createSession(estilo, list));
  root.textContent = '';
  render(<Editor sessions={sessions} />, root);

  // Save pending edits when the page goes away or into the background.
  const flush = () => sessions.forEach((s) => s.store.flush());
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  // Test-only hook (DESIGN §5.6): compiled in only with VITE_TEST_HOOK=1, active only with ?test.
  if (import.meta.env.VITE_TEST_HOOK === '1' && new URLSearchParams(location.search).has('test')) {
    const session = [...sessions.values()][0]!;
    Object.assign(window, {
      __kobo: { store: session.store, ready: () => session.ready(), face: (id: string) => session.faces.get(id)?.el, bound: (id: string) => session.faces.get(id)?.bound },
    });
  }
}
