import { useEffect, useState } from 'preact/hooks';
import { onLanguageChange, t } from './i18n';

// Placeholder for the editor (#14). It re-renders when the language changes.
export function App() {
  const [, setLang] = useState(0);
  useEffect(() => onLanguageChange(() => setLang((n) => n + 1)), []);
  return <p>{t('editor.soon')}</p>;
}
