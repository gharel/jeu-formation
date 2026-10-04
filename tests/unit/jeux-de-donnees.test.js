import { describe, it, expect, beforeEach } from 'vitest';
import {
  FORMAT_DONNEES,
  cleContenu,
  champsAffiches,
  lireImport,
  preparerExport,
} from '../../assets/js/commun/contenu.js';
import {
  preparerJeuDeDonnees,
  lireJeuDeDonnees,
  contenuDepuisDonnees,
  lireSources,
  sourceDe,
  noterSource,
  oublierSource,
} from '../../assets/js/commun/jeux-de-donnees.js';
import { enSlug, nomDeFichier } from '../../assets/js/commun/fichiers.js';
import { formaterNombre } from '../../assets/js/commun/nombres.js';
import { schema as schemaDuel } from '../../jeux/duel-buzzer/exemple.js';
import { schema as schemaJuste } from '../../jeux/juste-chiffre/exemple.js';
import { schema as schemaInstant } from '../../jeux/instant-defi/exemple.js';
import { schema as schemaOrdre } from '../../jeux/bon-ordre/exemple.js';

const SLUGS = ['motus', 'duel-buzzer', 'juste-chiffre'];
const maintenant = new Date('2026-10-04T08:30:00Z');

beforeEach(() => localStorage.clear());

describe('jeu de données : export', () => {
  it('rassemble le contenu de plusieurs jeux avec un titre', () => {
    const contenus = { 'duel-buzzer': { reglages: {}, elements: [] } };
    expect(preparerJeuDeDonnees({ titre: '  Excel   débutant ', contenus }, maintenant)).toEqual({
      format: FORMAT_DONNEES,
      version: 1,
      titre: 'Excel débutant',
      description: '',
      exporteLe: '2026-10-04T08:30:00.000Z',
      jeux: contenus,
    });
  });

  it('donne un titre par défaut', () => {
    expect(preparerJeuDeDonnees({ titre: '', contenus: {} }).titre).toBe('Mes contenus');
  });
});

describe('jeu de données : lecture', () => {
  const fichier = (donnees) => JSON.stringify(donnees);

  it('garde les jeux connus, dans l’ordre de la liste, et signale les autres', () => {
    const lu = lireJeuDeDonnees(
      fichier({
        format: FORMAT_DONNEES,
        version: 1,
        titre: 'Google Sheets',
        description: 'Les bases du tableur.',
        jeux: {
          'juste-chiffre': { elements: [] },
          'jeu-inconnu': { elements: [] },
          motus: { elements: [] },
        },
      }),
      SLUGS,
    );
    expect(lu.titre).toBe('Google Sheets');
    expect(lu.description).toBe('Les bases du tableur.');
    expect(Object.keys(lu.jeux)).toEqual(['motus', 'juste-chiffre']);
    expect(lu.inconnus).toEqual(['jeu-inconnu']);
  });

  it('accepte aussi l’export d’un seul jeu', () => {
    const lu = lireJeuDeDonnees(
      fichier(preparerExport('duel-buzzer', { reglages: {}, elements: [{ question: 'Q' }] })),
      SLUGS,
    );
    expect(lu.titre).toBe('');
    expect(lu.jeux).toEqual({ 'duel-buzzer': { reglages: {}, elements: [{ question: 'Q' }] } });
  });

  it('refuse un fichier abîmé, étranger ou sans jeu connu, avec un message clair', () => {
    expect(() => lireJeuDeDonnees('{pas du json', SLUGS)).toThrow('JSON illisible');
    expect(() => lireJeuDeDonnees(fichier({ format: 'autre' }), SLUGS)).toThrow(
      'pas un jeu de données des mini-jeux',
    );
    expect(() => lireJeuDeDonnees(fichier({ format: FORMAT_DONNEES, jeux: [] }), SLUGS)).toThrow(
      'aucun jeu',
    );
    expect(() =>
      lireJeuDeDonnees(fichier({ format: FORMAT_DONNEES, jeux: { inconnu: {} } }), SLUGS),
    ).toThrow('aucun des mini-jeux');
    // Un contenu qui n'est pas un objet est ignoré
    expect(() =>
      lireJeuDeDonnees(fichier({ format: FORMAT_DONNEES, jeux: { motus: 'texte' } }), SLUGS),
    ).toThrow('aucun des mini-jeux');
  });
});

describe('jeu de données : contenu d’un jeu', () => {
  it('garde les réglages de l’animateur si le fichier n’en donne pas', () => {
    const actuel = { reglages: { pointsVictoire: 5 }, elements: [] };
    const contenu = contenuDepuisDonnees(
      schemaDuel,
      { elements: [{ question: 'Quel raccourci copie ?', reponse: 'Ctrl + C', intrus: 1 }] },
      actuel,
    );
    expect(contenu).toEqual({
      reglages: { pointsVictoire: 5 },
      elements: [{ question: 'Quel raccourci copie ?', reponse: 'Ctrl + C' }],
    });
  });

  it('prend les réglages du fichier, sinon ceux par défaut', () => {
    expect(
      contenuDepuisDonnees(schemaDuel, { reglages: { pointsVictoire: 2 }, elements: [] }).reglages,
    ).toEqual({ pointsVictoire: 2 });
    expect(contenuDepuisDonnees(schemaDuel, { elements: [] }).reglages).toEqual({
      pointsVictoire: 3,
    });
  });
});

describe('import dans un jeu', () => {
  it('prend la part du jeu dans un jeu de données', () => {
    const texte = JSON.stringify({
      format: FORMAT_DONNEES,
      jeux: { motus: { elements: [{ mot: 'OCTET' }] } },
    });
    expect(lireImport(texte, 'motus')).toEqual({ elements: [{ mot: 'OCTET' }] });
    expect(() => lireImport(texte, 'pyramide', { pyramide: 'Pyramide' })).toThrow(
      'ne contient rien pour « Pyramide »',
    );
  });
});

describe('source du contenu de chaque jeu', () => {
  it('retient la thématique chargée, puis l’oublie', () => {
    expect(sourceDe('motus')).toBeNull();
    noterSource('motus', 'Google Sheets');
    noterSource('pyramide', 'Facebook');
    expect(sourceDe('motus')).toBe('Google Sheets');
    oublierSource('motus');
    expect(sourceDe('motus')).toBeNull();
    expect(lireSources()).toEqual({ pyramide: 'Facebook' });
  });

  it('ignore des sources abîmées', () => {
    localStorage.setItem('skazy-jeux:sources-contenus', JSON.stringify(['motus']));
    expect(lireSources()).toEqual({});
    localStorage.setItem('skazy-jeux:sources-contenus', JSON.stringify({ motus: 3, duel: ' ' }));
    expect(lireSources()).toEqual({});
  });

  it('range le contenu de chaque jeu sous sa propre clé', () => {
    expect(cleContenu('motus')).toBe('motus:contenu');
  });
});

describe('consultation : champs affichés', () => {
  it('formate les nombres, l’unité et les choix, et omet les champs facultatifs vides', () => {
    const champs = champsAffiches(schemaJuste, {
      question: 'Combien de colonnes ?',
      reponse: 18278,
      unite: '',
      marge: 10,
      anecdote: '',
    });
    expect(champs).toEqual([
      { cle: 'question', libelle: 'Question', secret: false, texte: 'Combien de colonnes ?' },
      {
        cle: 'reponse',
        libelle: 'Réponse (un nombre)',
        secret: true,
        texte: formaterNombre(18278),
      },
      { cle: 'marge', libelle: 'Marge acceptée', secret: false, texte: '10 %' },
    ]);
    expect(
      champsAffiches(schemaInstant, { amorce: 'trouver30', amorcePerso: '', fin: '… le menu' }),
    ).toEqual([
      expect.objectContaining({ cle: 'amorce', texte: '30 secondes pour trouver…' }),
      expect.objectContaining({ cle: 'fin', texte: '… le menu' }),
    ]);
  });

  it('donne les listes sans lignes vides', () => {
    const [, etapes] = champsAffiches(schemaOrdre, {
      titre: 'Envoyer',
      etapes: ['Ouvrir', ' ', 'Envoyer'],
    });
    expect(etapes.liste).toEqual(['Ouvrir', 'Envoyer']);
  });
});

describe('noms de fichiers', () => {
  it('transforme un titre en morceau de nom de fichier', () => {
    expect(enSlug('Google Sheets, mairie de Nouméa !')).toBe('google-sheets-mairie-de-noumea');
    expect(enSlug('   ')).toBe('');
  });

  it('date le fichier, avec ou sans titre', () => {
    expect(nomDeFichier('skazy-groupe', 'Mairie', maintenant)).toBe(
      'skazy-groupe-mairie-2026-10-04.json',
    );
    expect(nomDeFichier('skazy-motus', '', maintenant)).toBe('skazy-motus-2026-10-04.json');
  });
});
