// Mounts every face of every style through src/styles.ts, with its default
// background, and runs each variant's montar, as the editor will (DESIGN §10).
import '../../../src/theme/fonts.css';
import { facesOf, montar, variants } from '../../../src/styles';

const root = document.getElementById('caras')!;
const mounts: Promise<void>[] = [];
for (const list of variants.values()) {
  for (const variant of list) {
    for (const [id, face] of facesOf(variant)) {
      const side = id === variant.manifest.caras.frente ? 'frente' : 'reverso';
      face.classList.add(`fondo-${variant.manifest.fondo[side]}`);
      face.dataset['estilo'] = variant.estilo;
      root.append(face);
      mounts.push(montar(variant, face));
    }
  }
}

const images = [...root.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined));
await Promise.all([...images, ...mounts, document.fonts.ready]);
root.dataset['ready'] = 'true';
