import { parseFaces } from '../../../src/core/faces';
import './styles/demo/caras.css';
import './styles/demo/variantes/uno/caras.css';
import './styles/demo/variantes/dos/caras.css';
import uno from './styles/demo/variantes/uno/caras.html?raw';
import dos from './styles/demo/variantes/dos/caras.html?raw';

const root = document.getElementById('caras')!;
for (const html of [uno, dos]) {
  for (const face of parseFaces(html).values()) root.append(face);
}
root.dataset['ready'] = 'true';

// Fixture-only hook so E2E can call parseFaces on bad input.
(window as unknown as { parseFaces: typeof parseFaces }).parseFaces = parseFaces;
