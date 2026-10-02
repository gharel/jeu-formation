import { describe, it, expect } from 'vitest';
import {
  nettoyerContenu,
  validerContenu,
  resumerContenu,
  compacterContenu,
  preparerExport,
  lireImport,
  elementVide,
  reglagesParDefaut,
} from '../../assets/js/commun/contenu.js';
import { lireNombre, formaterNombre } from '../../assets/js/commun/nombres.js';

const schema = {
  reglages: [
    { cle: 'duree', libelle: 'Durée', type: 'nombre', defaut: 30, min: 5, max: 300 },
    { cle: 'tour', libelle: 'Tour de rôle', type: 'case', defaut: true },
  ],
  elements: {
    libelle: 'Question',
    pluriel: 'questions',
    feminin: true,
    min: 2,
    max: 4,
    champs: [
      { cle: 'texte', libelle: 'Question', type: 'texte-long', requis: true },
      { cle: 'reponse', libelle: 'Réponse', type: 'nombre', requis: true, min: 0 },
      {
        cle: 'sens',
        libelle: 'Sens',
        type: 'choix',
        options: [
          { valeur: 'vrai', libelle: 'Vrai' },
          { valeur: 'faux', libelle: 'Faux' },
        ],
      },
      { cle: 'indices', libelle: 'Indices', type: 'liste', min: 2, max: 3 },
      { cle: 'image', libelle: 'Image', type: 'image' },
    ],
    valider: (e) => (e.reponse === 13 ? 'pas de 13, ça porte malheur.' : null),
  },
};

describe('contenu', () => {
  it('donne des valeurs par défaut', () => {
    expect(reglagesParDefaut(schema)).toEqual({ duree: 30, tour: true });
    expect(elementVide(schema)).toEqual({
      texte: '',
      reponse: null,
      sens: 'vrai',
      indices: ['', ''],
      image: null,
    });
  });

  it('ne garde que les clés et les types prévus', () => {
    const propre = nettoyerContenu(schema, {
      reglages: { duree: '45', tour: 'oui', pirate: 1 },
      elements: [
        {
          texte: 'Combien ?',
          reponse: '1 500',
          sens: 'peut-être',
          indices: ['a', 2, { x: 1 }],
          image: { src: 'javascript:alert(1)', focus: { x: 9, y: -1 } },
          inconnu: '<script>',
        },
        'pas un objet',
      ],
    });
    expect(propre.reglages).toEqual({ duree: 45, tour: true });
    expect(propre.elements).toHaveLength(1);
    expect(propre.elements[0]).toEqual({
      texte: 'Combien ?',
      reponse: 1500,
      sens: 'vrai',
      indices: ['a', '2'],
      image: null,
    });
  });

  it('accepte une image d’exemple, enregistrée ou importée', () => {
    const { elements } = nettoyerContenu(schema, {
      elements: [
        { image: { src: './exemples/a.svg', focus: { x: 0.2, y: 2 } } },
        { image: { id: 'abc-123' } },
        { image: { donnees: 'data:image/png;base64,AAAA' } },
        { image: { src: '../../ailleurs.svg' } },
      ],
    });
    expect(elements[0].image).toEqual({ src: './exemples/a.svg', focus: { x: 0.2, y: 1 } });
    expect(elements[1].image.id).toBe('abc-123');
    expect(elements[2].image.donnees).toMatch(/^data:image\/png/);
    expect(elements[3].image).toBeNull();
  });

  it('liste les problèmes en français', () => {
    const contenu = nettoyerContenu(schema, {
      reglages: { duree: 2 },
      elements: [{ texte: '', reponse: 13, indices: ['seul'] }],
    });
    expect(validerContenu(schema, contenu)).toEqual([
      'Il faut au moins 2 questions.',
      'Réglage « Durée » doit être au moins 5.',
      'Question 1 : « Question » est obligatoire.',
      'Question 1 : il faut au moins 2 « indices ».',
      'Question 1 : pas de 13, ça porte malheur.',
    ]);
  });

  it('exige le nombre exact quand min = max', () => {
    const exact = { ...schema, elements: { ...schema.elements, min: 3, max: 3 } };
    expect(validerContenu(exact, { reglages: { duree: 30 }, elements: [] })[0]).toBe(
      'Il faut exactement 3 questions (actuellement 0).',
    );
  });

  it('résume le contenu en accordant', () => {
    expect(resumerContenu(schema, { elements: [{}] })).toBe('1 question prête');
    expect(resumerContenu(schema, { elements: [{}, {}] })).toBe('2 questions prêtes');
    const masculin = { elements: { libelle: 'Mot', pluriel: 'mots' } };
    expect(resumerContenu(masculin, { elements: [{}, {}, {}] })).toBe('3 mots prêts');
  });

  it('retire les lignes vides et les espaces avant d’enregistrer', () => {
    const compact = compacterContenu(schema, {
      reglages: { duree: 30 },
      elements: [{ texte: '  Q  ', indices: ['a', '  ', 'b '] }],
    });
    expect(compact.elements[0].texte).toBe('Q');
    expect(compact.elements[0].indices).toEqual(['a', 'b']);
  });

  it('exporte puis réimporte le contenu du même jeu seulement', () => {
    const contenu = { reglages: {}, elements: [{ texte: 'x' }] };
    const fichier = JSON.stringify(preparerExport('motus', contenu, new Date('2026-01-01')));
    expect(lireImport(fichier, 'motus')).toEqual(contenu);
    expect(() => lireImport(fichier, 'duel-buzzer', { motus: 'Motus numérique' })).toThrow(
      'Ce fichier contient le contenu d’un autre jeu (« Motus numérique »).',
    );
    expect(() => lireImport('{oups', 'motus')).toThrow(/JSON illisible/);
    expect(() => lireImport('{"a":1}', 'motus')).toThrow(/pas un export/);
  });
});

describe('nombres', () => {
  it.each([
    ['1 000 000', 1000000],
    ['1 000', 1000],
    ['1 000', 1000],
    ['1000000', 1000000],
    ['2,5', 2.5],
    ['1.5', 1.5],
    ['1.500', 1500],
    ['0.500', 0.5],
    ['1.234.567', 1234567],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    ['-3', -3],
    ['  42 ', 42],
    [7, 7],
  ])('lit « %s »', (saisie, attendu) => {
    expect(lireNombre(saisie)).toBe(attendu);
  });

  it.each(['', 'abc', '1,2,3', '12a', '--1', null, Number.NaN])('refuse « %s »', (saisie) => {
    expect(lireNombre(saisie)).toBeNull();
  });

  it('affiche les milliers à la française', () => {
    expect(formaterNombre(1234567).replace(/\s/g, ' ')).toBe('1 234 567');
    expect(formaterNombre(2.5)).toBe('2,5');
  });
});
