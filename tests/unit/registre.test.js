import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { JEUX, trouverJeu, libelleCourt } from '../../assets/js/jeux.js';

// Vitest est lancé depuis la racine du projet
const racine = `${process.cwd()}/`;
const COULEURS = [
  'vert',
  'orange',
  'bleu',
  'jaune',
  'violet',
  'rose',
  'bleu-numerique',
  'rouge',
  'ciel',
  'beige',
];

describe('liste des jeux', () => {
  it('a des slugs uniques', () => {
    const slugs = JEUX.map((j) => j.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('a une couleur différente et connue pour chaque jeu', () => {
    const couleurs = JEUX.map((j) => j.couleur);
    expect(new Set(couleurs).size).toBe(couleurs.length);
    for (const c of couleurs) expect(COULEURS).toContain(c);
  });

  it('retrouve un jeu par son slug', () => {
    expect(trouverJeu('motus').titre).toBe('Motus numérique');
    expect(trouverJeu('inconnu')).toBeNull();
  });

  it('donne des libellés courts pour la roue des jeux', () => {
    expect(libelleCourt(trouverJeu('juste-chiffre'))).toBe('Juste Chiffre');
    expect(libelleCourt(trouverJeu('debout-assis'))).toBe('Debout ou assis');
    for (const jeu of JEUX) expect(libelleCourt(jeu).length).toBeLessThanOrEqual(16);
  });

  describe.each(JEUX)('$titre', (jeu) => {
    const dossier = `${racine}jeux/${jeu.slug}/`;

    it('a sa page, son script, sa logique et son exemple', () => {
      for (const fichier of ['index.html', 'jeu.js', 'jeu.css', 'logique.js', 'exemple.js']) {
        expect(existsSync(dossier + fichier), `${jeu.slug}/${fichier}`).toBe(true);
      }
    });

    it('déclare le bon jeu, la bonne couleur et le bon titre dans sa page', () => {
      const html = readFileSync(`${dossier}index.html`, 'utf8');
      // Dans la page, une espace insécable précède ? et ! (« Qui suis-je&nbsp;? »)
      const titre = jeu.titre.replace(/ ([!?;:])/g, '&nbsp;$1');
      expect(html).toContain(`data-jeu="${jeu.slug}"`);
      expect(html).toContain(`data-couleur="${jeu.couleur}"`);
      expect(html).toContain(`<h1 class="bandeau__titre">${titre}</h1>`);
      expect(html).toContain(`<title>${titre} · Mini-jeux Skazy Formation</title>`);
    });

    it('monte le jeu avec le bon slug', () => {
      const script = readFileSync(`${dossier}jeu.js`, 'utf8');
      expect(script).toContain(`slug: '${jeu.slug}'`);
    });
  });
});
