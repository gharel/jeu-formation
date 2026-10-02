/**
 * npm run vendor:fontawesome : copie Font Awesome Free (installé en dépendance de développement)
 * dans assets/vendor/fontawesome/, pour que les icônes marchent hors ligne, sans CDN.
 * À relancer après une mise à jour de @fortawesome/fontawesome-free.
 */
import { cpSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(
  new URL('../node_modules/@fortawesome/fontawesome-free/', import.meta.url),
);
const cible = fileURLToPath(new URL('../assets/vendor/fontawesome/', import.meta.url));

const fichiers = [
  'css/fontawesome.min.css',
  'css/solid.min.css',
  'css/regular.min.css',
  'webfonts/fa-solid-900.woff2',
  'webfonts/fa-regular-400.woff2',
  'LICENSE.txt',
];

rmSync(cible, { recursive: true, force: true });
for (const fichier of fichiers) {
  const dossier = fichier.includes('/') ? fichier.slice(0, fichier.lastIndexOf('/')) : '';
  mkdirSync(`${cible}${dossier}`, { recursive: true });
  cpSync(`${source}${fichier}`, `${cible}${fichier}`);
}
const { version } = JSON.parse(readFileSync(`${source}package.json`, 'utf8'));
console.log(`Font Awesome Free ${version} copié dans assets/vendor/fontawesome/`);
