import { describe, it, expect, beforeEach } from 'vitest';
import { THEMATIQUES } from '../../assets/js/thematiques.js';
import { FORMAT_DONNEES, preparerExport } from '../../assets/js/commun/contenu.js';
import {
  FORMAT_THEMATIQUES,
  ICONES_THEMATIQUE,
  ICONE_PAR_DEFAUT,
  iconeValide,
  estSlugPerso,
  nettoyerJeux,
  nettoyerThematique,
  nettoyerCatalogue,
  lireCatalogue,
  enregistrerCatalogue,
  thematiquesAffichees,
  thematiquesSupprimees,
  avecThematique,
  sansThematique,
  avecOriginale,
  avecSupprimeesRetablies,
  thematiqueDuTitre,
  nouveauSlug,
  preparerExportThematique,
  preparerExportThematiques,
  lireImportThematiques,
  lireImportsThematiques,
  associerImport,
} from '../../assets/js/commun/catalogue-thematiques.js';

const SLUGS = ['motus', 'duel-buzzer', 'pyramide'];
const INTEGREES = [
  { slug: 'google-sheets', titre: 'Google Sheets', icone: 'table-cells' },
  { slug: 'facebook', titre: 'Facebook', icone: 'thumbs-up' },
];
const maintenant = new Date('2026-10-05T08:00:00Z');
const vide = { locales: [], supprimees: [] };

/** Une thématique de l'animateur, prête à ranger dans le catalogue. */
const perso = (titre, jeux = { motus: { elements: [{ mot: 'OCTET' }] } }) => ({
  slug: nouveauSlug(titre, []),
  titre,
  description: '',
  icone: 'star',
  jeux,
});

beforeEach(() => localStorage.clear());

describe('icônes proposées', () => {
  it('comprennent celles des thématiques livrées, sans doublon', () => {
    const noms = ICONES_THEMATIQUE.map((i) => i.icone);
    expect(new Set(noms).size).toBe(noms.length);
    for (const t of THEMATIQUES) expect(noms).toContain(t.icone);
    expect(ICONES_THEMATIQUE.every((i) => i.libelle.length > 2)).toBe(true);
  });

  it('remplacent une icône inconnue par celle par défaut', () => {
    expect(iconeValide('robot')).toBe('robot');
    expect(iconeValide('fa-robot')).toBe(ICONE_PAR_DEFAUT);
    expect(iconeValide(undefined)).toBe(ICONE_PAR_DEFAUT);
  });
});

describe('nettoyage', () => {
  it('ne garde que les jeux connus, dans leur ordre, et leurs éléments', () => {
    expect(
      nettoyerJeux(
        {
          pyramide: { reglages: { duree: 30 }, elements: [{ mot: 'A' }, 'texte', null] },
          'zoom-mystere': { elements: [] },
          motus: { elements: 'pas une liste' },
          'duel-buzzer': [],
        },
        SLUGS,
      ),
    ).toEqual({ motus: { elements: [] }, pyramide: { elements: [{ mot: 'A' }] } });
    expect(nettoyerJeux(null, SLUGS)).toEqual({});
  });

  it('refuse une thématique sans titre ou au slug inattendu', () => {
    const brute = { slug: 'perso-excel', titre: '  Excel   débutant ', icone: 'inconnue' };
    expect(nettoyerThematique(brute, SLUGS, INTEGREES)).toEqual({
      slug: 'perso-excel',
      titre: 'Excel débutant',
      description: '',
      icone: ICONE_PAR_DEFAUT,
      jeux: {},
    });
    expect(nettoyerThematique({ ...brute, titre: ' ' }, SLUGS, INTEGREES)).toBeNull();
    expect(nettoyerThematique({ ...brute, slug: 'excel' }, SLUGS, INTEGREES)).toBeNull();
    expect(nettoyerThematique({ ...brute, slug: 'perso-<b>' }, SLUGS, INTEGREES)).toBeNull();
    // Une thématique livrée modifiée garde son slug
    expect(nettoyerThematique({ ...brute, slug: 'facebook' }, SLUGS, INTEGREES).slug).toBe(
      'facebook',
    );
  });

  it('écarte les doublons et les suppressions inconnues du catalogue', () => {
    const catalogue = nettoyerCatalogue(
      {
        locales: [perso('Excel'), perso('Excel'), 'abîmé'],
        supprimees: ['facebook', 'inconnue', 'facebook'],
      },
      SLUGS,
      INTEGREES,
    );
    expect(catalogue.locales.map((t) => t.slug)).toEqual(['perso-excel']);
    expect(catalogue.supprimees).toEqual(['facebook']);
    expect(nettoyerCatalogue('n’importe quoi', SLUGS, INTEGREES)).toEqual(vide);
  });

  it('se lit et s’enregistre dans le stockage du navigateur', () => {
    expect(lireCatalogue(SLUGS, INTEGREES)).toEqual(vide);
    const catalogue = avecThematique(vide, perso('Excel'));
    expect(enregistrerCatalogue(catalogue)).toBe(true);
    expect(JSON.parse(localStorage.getItem('skazy-jeux:thematiques'))).toEqual(catalogue);
    expect(lireCatalogue(SLUGS, INTEGREES)).toEqual(catalogue);
  });
});

describe('liste affichée', () => {
  it('montre les thématiques livrées, leur copie modifiée, puis celles de l’animateur', () => {
    const modifiee = { ...perso('Feuilles de calcul'), slug: 'google-sheets', icone: 'chart-line' };
    const catalogue = avecThematique(avecThematique(vide, perso('Excel')), modifiee);
    expect(thematiquesAffichees(catalogue, INTEGREES)).toEqual([
      {
        slug: 'google-sheets',
        titre: 'Feuilles de calcul',
        icone: 'chart-line',
        integree: true,
        modifiee: true,
        locale: modifiee,
      },
      {
        slug: 'facebook',
        titre: 'Facebook',
        icone: 'thumbs-up',
        integree: true,
        modifiee: false,
        locale: null,
      },
      {
        slug: 'perso-excel',
        titre: 'Excel',
        icone: 'star',
        integree: false,
        modifiee: false,
        locale: catalogue.locales[0],
      },
    ]);
  });

  it('supprime une thématique de l’animateur, masque une thématique livrée', () => {
    const modifiee = { ...perso('Facebook pro'), slug: 'facebook' };
    let catalogue = avecThematique(avecThematique(vide, perso('Excel')), modifiee);
    catalogue = sansThematique(
      sansThematique(catalogue, 'perso-excel', INTEGREES),
      'facebook',
      INTEGREES,
    );
    expect(catalogue).toEqual({ locales: [], supprimees: ['facebook'] });
    expect(thematiquesAffichees(catalogue, INTEGREES).map((t) => t.slug)).toEqual([
      'google-sheets',
    ]);
    expect(thematiquesSupprimees(catalogue, INTEGREES).map((t) => t.titre)).toEqual(['Facebook']);
    // Rétablie : elle revient d'origine, sans les modifications oubliées
    expect(avecSupprimeesRetablies(catalogue)).toEqual(vide);
  });

  it('remplace une thématique à sa place, et rétablit une thématique livrée d’origine', () => {
    const a = perso('A');
    const b = perso('B');
    const catalogue = avecThematique(avecThematique(vide, a), b);
    const renommee = { ...a, titre: 'A bis' };
    expect(avecThematique(catalogue, renommee).locales).toEqual([renommee, b]);
    const modifiee = { ...a, slug: 'facebook' };
    const masquee = { locales: [modifiee], supprimees: ['google-sheets'] };
    expect(avecOriginale(masquee, 'facebook')).toEqual({
      locales: [],
      supprimees: ['google-sheets'],
    });
    expect(avecOriginale(masquee, 'google-sheets')).toEqual({
      locales: [modifiee],
      supprimees: [],
    });
    // Enregistrer une thématique livrée supprimée la fait revenir
    expect(avecThematique(masquee, { ...a, slug: 'google-sheets' }).supprimees).toEqual([]);
  });
});

describe('titres et slugs', () => {
  it('trouve un titre déjà pris, sans tenir compte des majuscules ni des espaces', () => {
    const affichees = thematiquesAffichees(avecThematique(vide, perso('Excel')), INTEGREES);
    expect(thematiqueDuTitre(affichees, ' excel ')?.slug).toBe('perso-excel');
    expect(thematiqueDuTitre(affichees, 'GOOGLE SHEETS')?.slug).toBe('google-sheets');
    expect(thematiqueDuTitre(affichees, 'Excel', 'perso-excel')).toBeNull();
    expect(thematiqueDuTitre(affichees, 'Word')).toBeNull();
  });

  it('donne un slug lisible et libre', () => {
    expect(nouveauSlug('Excel débutant !', [])).toBe('perso-excel-debutant');
    expect(nouveauSlug('Excel', ['perso-excel', 'perso-excel-2'])).toBe('perso-excel-3');
    expect(nouveauSlug('« … »', [])).toBe('perso-thematique');
    expect(estSlugPerso('perso-excel-3')).toBe(true);
    expect(estSlugPerso('perso-')).toBe(false);
    expect(estSlugPerso('google-sheets')).toBe(false);
  });
});

describe('fichiers', () => {
  const excel = {
    ...perso('Excel', { motus: { elements: [{ mot: 'OCTET' }] } }),
    description: 'Les formules.',
  };

  it('exporte une thématique seule comme un jeu de données, avec son slug et son icône', () => {
    expect(preparerExportThematique(excel, maintenant)).toEqual({
      format: FORMAT_DONNEES,
      version: 1,
      titre: 'Excel',
      description: 'Les formules.',
      exporteLe: '2026-10-05T08:00:00.000Z',
      slug: 'perso-excel',
      icone: 'star',
      jeux: { motus: { elements: [{ mot: 'OCTET' }] } },
    });
  });

  it('exporte toutes les thématiques dans un seul fichier, puis les relit', () => {
    const facebook = { ...perso('Facebook'), slug: 'facebook', icone: 'thumbs-up' };
    const fichier = preparerExportThematiques([facebook, excel], maintenant);
    expect(fichier).toMatchObject({ format: FORMAT_THEMATIQUES, version: 1 });
    expect(fichier.thematiques.map((t) => t.slug)).toEqual(['facebook', 'perso-excel']);
    const lu = lireImportThematiques(JSON.stringify(fichier), SLUGS);
    expect(lu.thematiques).toEqual([facebook, excel]);
    expect(lu).toMatchObject({ inconnus: [], ignorees: 0 });
  });

  it('lit aussi une thématique seule, un export de tous les contenus ou d’un seul jeu', () => {
    const seule = lireImportThematiques(JSON.stringify(preparerExportThematique(excel)), SLUGS);
    expect(seule.thematiques).toEqual([excel]);
    const contenus = lireImportThematiques(
      JSON.stringify({
        format: FORMAT_DONNEES,
        titre: 'Formation mairie',
        jeux: {
          pyramide: { reglages: { duree: 60 }, elements: [{ mot: 'CLIC' }] },
          'zoom-mystere': { elements: [] },
        },
      }),
      SLUGS,
    );
    expect(contenus.thematiques).toEqual([
      {
        slug: null,
        titre: 'Formation mairie',
        description: '',
        icone: ICONE_PAR_DEFAUT,
        jeux: { pyramide: { elements: [{ mot: 'CLIC' }] } },
      },
    ]);
    expect(contenus.inconnus).toEqual(['zoom-mystere']);
    const unJeu = lireImportThematiques(
      JSON.stringify(preparerExport('motus', { reglages: {}, elements: [{ mot: 'OCTET' }] })),
      SLUGS,
    );
    expect(unJeu.thematiques[0].jeux).toEqual({ motus: { elements: [{ mot: 'OCTET' }] } });
  });

  it('passe une thématique abîmée d’un export groupé, refuse un fichier inutilisable', () => {
    const fichier = preparerExportThematiques([excel], maintenant);
    fichier.thematiques.push({ titre: 'Sans jeu', jeux: {} }, 'abîmée', null);
    const lu = lireImportThematiques(JSON.stringify(fichier), SLUGS);
    expect(lu.thematiques.map((t) => t.titre)).toEqual(['Excel']);
    expect(lu.ignorees).toBe(3);
    expect(() => lireImportThematiques('{pas du json', SLUGS)).toThrow('JSON illisible');
    expect(() =>
      lireImportThematiques(JSON.stringify({ format: FORMAT_THEMATIQUES, thematiques: [] }), SLUGS),
    ).toThrow('aucune thématique utilisable');
    expect(() => lireImportThematiques(JSON.stringify({ format: 'autre' }), SLUGS)).toThrow(
      'pas un jeu de données',
    );
  });
});

describe('import de plusieurs fichiers d’un coup', () => {
  const fichier = (titre, slug) =>
    JSON.stringify(
      preparerExportThematique(
        { slug, titre, description: '', icone: 'star', jeux: { motus: { elements: [] } } },
        maintenant,
      ),
    );

  it('met leurs thématiques à la suite et écarte un fichier abîmé sans bloquer les autres', () => {
    const groupe = JSON.stringify(
      preparerExportThematiques(
        [
          {
            slug: 'perso-c',
            titre: 'C',
            description: '',
            icone: 'star',
            jeux: { pyramide: { elements: [] }, x: {} },
          },
        ],
        maintenant,
      ),
    );
    const lu = lireImportsThematiques(
      [
        { nom: 'a.json', texte: fichier('A', 'perso-a') },
        { nom: 'abime.json', texte: '{pas du json' },
        { nom: 'tout.json', texte: groupe },
      ],
      SLUGS,
    );
    expect(lu.thematiques.map((t) => t.titre)).toEqual(['A', 'C']);
    expect(lu.inconnus).toEqual(['x']);
    expect(lu.refuses).toEqual([
      { nom: 'abime.json', message: expect.stringContaining('JSON illisible') },
    ]);
  });

  it('refuse l’ensemble si aucun fichier n’est utilisable', () => {
    expect(() => lireImportsThematiques([{ nom: 'a.json', texte: '{' }], SLUGS)).toThrow(
      'JSON illisible',
    );
    expect(() =>
      lireImportsThematiques(
        [
          { nom: 'a.json', texte: '{' },
          { nom: 'b.json', texte: '[]' },
        ],
        SLUGS,
      ),
    ).toThrow('Aucun de ces fichiers');
  });
});

describe('import : où ranger chaque thématique', () => {
  const importee = (titre, slug = null) => ({
    slug,
    titre,
    description: '',
    icone: 'star',
    jeux: {},
  });

  it('remplace la même thématique (slug, sinon titre), ajoute les autres', () => {
    const catalogue = avecThematique(vide, perso('Excel'));
    const plan = associerImport(
      [
        importee('Excel renommé', 'perso-excel'),
        importee('facebook'),
        importee('Word', 'perso-word'),
        importee('PowerPoint', 'pas-un-slug'),
      ],
      catalogue,
      INTEGREES,
    );
    expect(
      plan.map((p) => [p.thematique.slug, p.thematique.titre, p.remplace, p.integree]),
    ).toEqual([
      ['perso-excel', 'Excel renommé', 'Excel', false],
      ['facebook', 'facebook', 'Facebook', true],
      ['perso-word', 'Word', null, false],
      ['perso-powerpoint', 'PowerPoint', null, false],
    ]);
  });

  it('fait revenir une thématique livrée supprimée', () => {
    const catalogue = sansThematique(vide, 'facebook', INTEGREES);
    const [p] = associerImport([importee('Facebook')], catalogue, INTEGREES);
    expect(p).toMatchObject({ remplace: 'Facebook', integree: true });
    expect(p.thematique.slug).toBe('facebook');
  });

  it('ne range pas deux thématiques du fichier au même endroit ni sous le même titre', () => {
    const plan = associerImport(
      [importee('Excel'), importee('Excel'), importee('', 'perso-excel')],
      vide,
      INTEGREES,
    );
    expect(plan.map((p) => [p.thematique.slug, p.thematique.titre, p.remplace])).toEqual([
      ['perso-excel', 'Excel', null],
      ['perso-excel-2', 'Excel (2)', null],
      ['perso-thematique-importee', 'Thématique importée', null],
    ]);
  });

  it('ne donne pas à une thématique remplacée le titre d’une autre', () => {
    const catalogue = avecThematique(avecThematique(vide, perso('Excel')), perso('Word'));
    const [p] = associerImport([importee('Excel', 'perso-word')], catalogue, INTEGREES);
    expect(p.thematique).toMatchObject({ slug: 'perso-word', titre: 'Excel (2)' });
    expect(p.remplace).toBe('Word');
  });
});
