import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { JEUX } from '../../assets/js/jeux.js';
import { THEMATIQUES, fichierThematique, trouverThematique } from '../../assets/js/thematiques.js';
import { FORMAT_DONNEES, nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { lireJeuDeDonnees } from '../../assets/js/commun/jeux-de-donnees.js';

// Vitest est lancé depuis la racine du projet
const racine = `${process.cwd()}/`;
const SLUGS = JEUX.map((jeu) => jeu.slug);
// Zoom mystère a besoin de captures d'écran : les thématiques ne le remplissent pas
const JEUX_SANS_IMAGE = SLUGS.filter((slug) => slug !== 'zoom-mystere');

/** Tous les textes d'un élément (listes comprises). */
const textesDe = (element) =>
  Object.values(element)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v) => typeof v === 'string');

describe('liste des thématiques', () => {
  it('a des slugs uniques et un fichier pour chacune, et rien d’autre dans le dossier', () => {
    const slugs = THEMATIQUES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const fichiers = readdirSync(`${racine}contenus/thematiques`).sort();
    expect(fichiers).toEqual(slugs.map((s) => `${s}.json`).sort());
  });

  it('propose les cinq thématiques prévues', () => {
    expect(THEMATIQUES.map((t) => t.titre)).toEqual([
      'Initiation à l’IA',
      'Google Docs',
      'Google Sheets',
      'Microsoft 365',
      'Facebook',
    ]);
    expect(trouverThematique('facebook').icone).toBe('thumbs-up');
    expect(trouverThematique('inconnue')).toBeNull();
  });
});

describe.each(THEMATIQUES)('thématique $titre', (thematique) => {
  const texte = readFileSync(racine + fichierThematique(thematique.slug), 'utf8');
  const brut = JSON.parse(texte);
  const donnees = lireJeuDeDonnees(texte, SLUGS);

  it('est un jeu de données avec le même titre que la liste et une description', () => {
    expect(brut.format).toBe(FORMAT_DONNEES);
    expect(brut.version).toBe(1);
    expect(donnees.titre).toBe(thematique.titre);
    expect(donnees.description.length).toBeGreaterThan(40);
    expect(donnees.inconnus).toEqual([]);
  });

  it('remplit tous les jeux sans image, sans toucher aux réglages de l’animateur', () => {
    expect(Object.keys(donnees.jeux)).toEqual(JEUX_SANS_IMAGE);
    for (const contenu of Object.values(brut.jeux)) expect(contenu).not.toHaveProperty('reglages');
  });

  it.each(JEUX_SANS_IMAGE)(
    '%s : un contenu complet, prêt à jouer, sans rien de perdu',
    async (slug) => {
      const { schema } = await import(`../../jeux/${slug}/exemple.js`);
      const contenu = nettoyerContenu(schema, donnees.jeux[slug]);
      expect(validerContenu(schema, contenu)).toEqual([]);
      // Le nettoyage ne retire ni ne raccourcit rien : chaque élément suit exactement le schéma
      expect(contenu.elements).toEqual(donnees.jeux[slug].elements);
      expect(contenu.elements.length).toBeGreaterThanOrEqual(Math.max(schema.elements.min ?? 1, 4));
    },
  );

  it('suit la typographie du site (apostrophe ’, guillemets « », points de suspension …)', () => {
    const fautes = Object.entries(brut.jeux).flatMap(([slug, contenu]) =>
      contenu.elements.flatMap((element, i) =>
        textesDe(element)
          // Pas d'autre espace que l'ordinaire (insécable, fine…) : le site met lui-même l'insécable
          .filter((t) => /['"]|\.\.\.|[^\S ]|^\s|\s$/.test(t))
          .map((t) => `${slug} ${i + 1} : ${t}`),
      ),
    );
    expect(fautes).toEqual([]);
  });

  it('n’a pas deux fois la même question dans un jeu', () => {
    for (const [slug, contenu] of Object.entries(brut.jeux)) {
      const premiers = contenu.elements.map((e) => JSON.stringify(Object.values(e)).toLowerCase());
      expect(new Set(premiers).size, slug).toBe(premiers.length);
    }
  });
});
