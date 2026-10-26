import { render } from 'preact';
import { App } from './app';
import { initLanguage } from './i18n';

initLanguage();

const root = document.getElementById('app');
if (root) render(<App />, root);
