import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { JEUX } from '../../assets/js/jeux.js';
import { THEMES } from '../../assets/js/commun/participants.js';
import { CONSIGNES } from '../../jeux/debout-assis/logique.js';
import { DISPOSITIONS } from '../../assets/js/commun/salle.js';
import { THEMATIQUES } from '../../assets/js/thematiques.js';

// Vitest est lancé depuis la racine du projet
const racine = process.cwd();
const cssIcones = readFileSync(
  join(racine, 'assets/vendor/fontawesome/css/fontawesome.min.css'),
  'utf8',
);

function fichiers(dossier, extensions) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (['node_modules', 'vendor', '.git'].includes(nom)) return [];
    if (statSync(chemin).isDirectory()) return fichiers(chemin, extensions);
    return extensions.some((e) => nom.endsWith(e)) ? [chemin] : [];
  });
}

const sources = [
  join(racine, 'index.html'),
  join(racine, 'groupe/index.html'),
  // Page « Les contenus » et thématiques : leurs textes s'affichent aussi
  ...fichiers(join(racine, 'contenus'), ['.html', '.json']),
  ...fichiers(join(racine, 'assets'), ['.js', '.css']),
  ...fichiers(join(racine, 'jeux'), ['.js', '.css', '.html']),
  ...fichiers(join(racine, 'outils'), ['.js']),
];

/** Une icône existe si la feuille de Font Awesome définit .fa-<nom>. */
function existe(nom) {
  return new RegExp(`\\.fa-${nom}[,{]`).test(cssIcones);
}

describe('icônes', () => {
  it('aucun emoji dans les pages, les styles et les scripts (on utilise Font Awesome)', () => {
    const trouves = [];
    for (const fichier of sources) {
      readFileSync(fichier, 'utf8')
        .split('\n')
        .forEach((ligne, i) => {
          const emojis = ligne.match(/\p{Extended_Pictographic}/gu);
          if (emojis) trouves.push(`${relative(racine, fichier)}:${i + 1} ${emojis.join(' ')}`);
        });
    }
    expect(trouves).toEqual([]);
  });

  it('chaque icône utilisée existe dans Font Awesome Free', () => {
    const noms = new Set([
      ...JEUX.map((j) => j.icone),
      ...THEMES.map((t) => t.icone),
      ...DISPOSITIONS.map((d) => d.icone),
      ...THEMATIQUES.map((t) => t.icone),
      ...Object.values(CONSIGNES).flatMap((c) => [c.vrai.icone, c.faux.icone]),
    ]);
    for (const fichier of sources) {
      for (const [, nom] of readFileSync(fichier, 'utf8').matchAll(/icone\('([a-z0-9-]+)'/g)) {
        noms.add(nom);
      }
      for (const [, nom] of readFileSync(fichier, 'utf8').matchAll(
        /class="fa-solid fa-([a-z0-9-]+)/g,
      )) {
        noms.add(nom);
      }
    }
    const absentes = [...noms].filter((nom) => !existe(nom));
    expect(absentes).toEqual([]);
    expect(noms.size).toBeGreaterThan(30);
  });

  it('les polices d’icônes sont hébergées dans le projet (pas de CDN)', () => {
    for (const style of ['solid.min.css', 'regular.min.css']) {
      const css = readFileSync(join(racine, 'assets/vendor/fontawesome/css', style), 'utf8');
      for (const [, url] of css.matchAll(/url\(([^)]+)\)/g)) {
        expect(url).toMatch(/^\.\.\/webfonts\/fa-[a-z]+-\d+\.woff2$/);
        expect(statSync(join(racine, 'assets/vendor/fontawesome/css', url)).size).toBeGreaterThan(
          0,
        );
      }
    }
  });
});
