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

  // Signature commune aux outils Skazy Formation : la pastille (le favicon) et « Mini-jeux » forment
  // un lien vers l'accueil des mini-jeux, « Les outils » mène à la page de tous les outils, le logo
  // au site de Skazy Formation
  it.each(pages)('%s : signature, « Mini-jeux », « Les outils » et logo', (page) => {
    const texte = readFileSync(racine + page, 'utf8').replace(/\s+/g, ' ');
    const remonte = '../'.repeat(page.split('/').length - 1);

    // Logo : lien vers formation.skazy.nc, dans un nouvel onglet
    const logo = texte.match(/<a class="signature__logo"[^>]*> <img [^>]*> <\/a>/)?.[0];
    expect(logo).toContain('href="https://formation.skazy.nc"');
    expect(logo).toContain('target="_blank"');
    expect(logo).toContain(`src="${remonte}assets/img/logo-skazy-formation-blanc.svg"`);
    expect(logo).toContain('alt="Site de Skazy Formation (nouvel onglet)"');

    // Pastille (décorative : alt vide) et nom de l'outil, dans un seul lien vers l'accueil
    const outil = texte.match(/<a class="signature__outil[^"]*"[^>]*>.*?<\/a>/)?.[0];
    expect(outil).toContain(`href="${remonte || './'}"`);
    const pastille = outil.match(/<img class="signature__pastille" [^>]*>/)?.[0];
    expect(pastille).toContain(`src="${remonte}assets/img/favicon.svg"`);
    expect(pastille).toContain('alt=""');
    expect(outil).toContain('<span class="signature__nom">Mini-jeux</span>');
    if (page === 'index.html') expect(outil).toContain('aria-current="page"');

    // « Les outils » : la roue (copie dans le dépôt, décorative) et son nom, dans le même onglet
    const outils = texte.match(/<a class="lien-outils[^"]*"[^>]*>.*?<\/a>/)?.[0];
    expect(outils).toContain('href="https://gharel.github.io/home/"');
    expect(outils).toContain('title="Tous les outils Skazy Formation"');
    expect(outils).not.toContain('target=');
    const roue = outils.match(/<img class="lien-outils__roue" [^>]*>/)?.[0];
    expect(roue).toContain(`src="${remonte}assets/img/les-outils.svg"`);
    expect(roue).toContain('alt=""');
    expect(outils).toContain('<span class="lien-outils__texte">Les outils</span>');
    expect(existsSync(`${racine}assets/img/les-outils.svg`)).toBe(true);
  });

  // Bandeau : la maison « Accueil », « Mini-jeux », le titre, les boutons, « Les outils », puis le
  // logo, toujours le dernier
  it.each(pages.filter((page) => page !== 'index.html'))(
    '%s : bandeau dans l’ordre, le logo en dernier',
    (page) => {
      const texte = readFileSync(racine + page, 'utf8').replace(/\s+/g, ' ');
      const bandeau = texte.match(/<header class="bandeau">.*?<\/header>/)?.[0];
      const ordre = [
        'class="bouton-bandeau bandeau__accueil"',
        'class="signature__outil bandeau__outil"',
        'class="bandeau__titre"',
        'id="actions"',
        'class="lien-outils"',
        'class="signature__logo"',
      ].map((marque) => bandeau.indexOf(marque));
      expect(ordre.every((position) => position > 0)).toBe(true);
      expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
      // Rien après le logo
      expect(bandeau).toMatch(
        /<a class="signature__logo"[^>]*> <img [^>]*> <\/a> <\/div> <\/header>$/,
      );
      // Les deux liens « Accueil » et « Mini-jeux » mènent à l'accueil des mini-jeux
      const remonte = '../'.repeat(page.split('/').length - 1);
      expect(bandeau).toMatch(
        new RegExp(`class="bouton-bandeau bandeau__accueil" href="${remonte}"`),
      );
    },
  );
});
