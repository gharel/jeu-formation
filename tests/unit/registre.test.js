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
  'caramel',
  'sapin',
  'anis',
  'ardoise',
  'prune',
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
      expect(html).toContain(`<title>${titre} · Mini-jeux · Skazy Formation</title>`);
    });

    it('monte le jeu avec le bon slug', () => {
      const script = readFileSync(`${dossier}jeu.js`, 'utf8');
      expect(script).toContain(`slug: '${jeu.slug}'`);
    });
  });
});

describe('pages publiées', () => {
  const pages = [
    'index.html',
    'groupe/index.html',
    'contenus/index.html',
    ...JEUX.map((jeu) => `jeux/${jeu.slug}/index.html`),
  ];

  it.each(pages)(
    '%s : pas d’indexation par les moteurs de recherche, mention © en pied de page',
    (page) => {
      const html = readFileSync(racine + page, 'utf8');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
      // Prettier peut couper la phrase en plusieurs lignes
      const texte = html.replace(/\s+/g, ' ');
      expect(texte).toContain('<footer class="pied">');
      expect(texte).toContain(
        '&copy; Skazy Formation&nbsp;· Usage réservé aux stagiaires de Skazy Formation&nbsp;: reproduction et réutilisation dans une autre formation interdites sans accord écrit.',
      );
    },
  );

  // Titre commun aux outils Skazy Formation : « Page · Nom · Skazy Formation »
  it.each(pages)('%s : titre d’onglet « Page · Mini-jeux · Skazy Formation »', (page) => {
    const html = readFileSync(racine + page, 'utf8');
    const titre = html.match(/<title>(.*)<\/title>/)?.[1];
    if (page === 'index.html') {
      expect(titre).toBe('Mini-jeux · Skazy Formation');
    } else {
      const h1 = html.match(/<h1 class="bandeau__titre">(.*)<\/h1>/)?.[1];
      expect(titre).toBe(`${h1} · Mini-jeux · Skazy Formation`);
    }
  });

  // Signature commune : logo Skazy Formation (lien), filet, pastille (le favicon) et nom de l'outil
  it.each(pages)('%s : signature logo, pastille et « Mini-jeux »', (page) => {
    const texte = readFileSync(racine + page, 'utf8').replace(/\s+/g, ' ');
    const remonte = '../'.repeat(page.split('/').length - 1);
    expect(texte).toContain('<a class="signature__logo" href="https://formation.skazy.nc"');
    expect(texte).toContain(`src="${remonte}assets/img/logo-skazy-formation-blanc.svg"`);
    // La pastille est décorative : alt vide
    const pastille = texte.match(/<img class="signature__pastille" [^>]*>/)?.[0];
    expect(pastille).toContain(`src="${remonte}assets/img/favicon.svg"`);
    expect(pastille).toContain('alt=""');
    expect(texte).toContain('<span class="signature__nom">Mini-jeux</span>');
  });
});
