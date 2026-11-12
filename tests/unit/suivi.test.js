import { describe, it, expect, beforeEach } from 'vitest';
import {
  DIAPOSITIVE_MAX,
  LONGUEUR_VU,
  normaliserDiapositive,
  normaliserVu,
  normaliserSuivi,
  estVide,
  decrireSuivi,
  charger,
  enregistrer,
} from '../../assets/js/commun/suivi.js';

beforeEach(() => localStorage.clear());

describe('suivi de la formation', () => {
  it('la diapositive est un numéro entier de 1 à 999, ou rien', () => {
    expect(normaliserDiapositive(42)).toBe(42);
    expect(normaliserDiapositive(' 42 ')).toBe(42);
    expect(normaliserDiapositive(1)).toBe(1);
    expect(normaliserDiapositive(DIAPOSITIVE_MAX)).toBe(DIAPOSITIVE_MAX);
    for (const refuse of [0, -3, 1.5, DIAPOSITIVE_MAX + 1, '', 'diapo 42', null, undefined, {}]) {
      expect(normaliserDiapositive(refuse)).toBeNull();
    }
  });

  it('ce qui a été vu garde ses lignes, sans espaces en fin de ligne ni lignes vides en série', () => {
    expect(
      normaliserVu('  Google Sheets, Excel  \r\nÀ reprendre : RECHERCHEV\t\n\n\n\nCanva\n '),
    ).toBe('Google Sheets, Excel\nÀ reprendre : RECHERCHEV\n\nCanva');
    // Une liste (fichier écrit à la main) : une ligne par élément
    expect(normaliserVu(['Word', 3, null, 'Excel'])).toBe('Word\n3\nExcel');
    expect(normaliserVu(null)).toBe('');
    expect(normaliserVu({ texte: 'x' })).toBe('');
    expect(normaliserVu('x'.repeat(LONGUEUR_VU + 50))).toHaveLength(LONGUEUR_VU);
  });

  it('ne garde d’un fichier que le numéro et le texte prévus', () => {
    expect(normaliserSuivi({ diapositive: '12', vu: ' Word \n', autre: 'ignoré' })).toEqual({
      diapositive: 12,
      vu: 'Word',
    });
    expect(normaliserSuivi('du texte')).toEqual({ diapositive: null, vu: '' });
    expect(normaliserSuivi({ diapositive: 1200, vu: 4 })).toEqual({ diapositive: null, vu: '4' });
  });

  describe('notes au premier format (diapositive en texte, liste de logiciels)', () => {
    it('reprend le numéro du début, et garde le reste dans ce qui a été vu', () => {
      expect(
        normaliserSuivi({
          diapositive: 'Diapo 42, les tableaux croisés',
          logiciels: ['Google Sheets', 'excel', 'Excel', '', 3],
        }),
      ).toEqual({ diapositive: 42, vu: 'les tableaux croisés\nGoogle Sheets, excel, 3' });
      expect(normaliserSuivi({ diapositive: 'diapositive n° 7' })).toEqual({
        diapositive: 7,
        vu: '',
      });
      expect(normaliserSuivi({ diapositive: 'Slide 12 : les filtres' })).toEqual({
        diapositive: 12,
        vu: 'les filtres',
      });
    });

    it('sans numéro sûr au début, tout le texte est gardé', () => {
      for (const texte of ['Module 3, fin', 'Diapo 1200', '2e partie', 'les tableaux croisés']) {
        expect(normaliserSuivi({ diapositive: texte })).toEqual({ diapositive: null, vu: texte });
      }
    });

    it('relues une seconde fois, les notes ne changent plus', () => {
      const lues = normaliserSuivi({
        diapositive: 'Diapo 42, les tableaux croisés',
        logiciels: ['Word'],
      });
      expect(normaliserSuivi(lues)).toEqual(lues);
      expect(normaliserSuivi(JSON.parse(JSON.stringify(lues)))).toEqual(lues);
    });

    it('un logiciel seul dans la liste ne se perd pas', () => {
      expect(normaliserSuivi({ logiciels: ['Canva'] })).toEqual({ diapositive: null, vu: 'Canva' });
      expect(normaliserSuivi({ logiciels: 'Word' })).toEqual({ diapositive: null, vu: '' });
    });
  });

  it('décrit les notes en une ligne', () => {
    expect(
      decrireSuivi({ diapositive: 42, vu: 'Google Sheets, Excel\nÀ reprendre : RECHERCHEV' }),
    ).toBe('arrêté à la diapo 42 · vu : Google Sheets, Excel ; À reprendre : RECHERCHEV');
    expect(decrireSuivi({ diapositive: 7 })).toBe('arrêté à la diapo 7');
    expect(decrireSuivi({ vu: 'x'.repeat(80) })).toBe(`vu : ${'x'.repeat(50)}…`);
    // Un groupe récent mis de côté au premier format
    expect(decrireSuivi({ diapositive: 'diapo 42', logiciels: ['Word', 'Excel'] })).toBe(
      'arrêté à la diapo 42 · vu : Word, Excel',
    );
    expect(decrireSuivi(undefined)).toBe('');
  });

  it('garde les notes dans le navigateur, et rien quand elles sont vides', () => {
    expect(charger()).toEqual({ diapositive: null, vu: '' });
    expect(estVide(charger())).toBe(true);
    enregistrer({ diapositive: 8, vu: 'Canva' });
    expect(charger()).toEqual({ diapositive: 8, vu: 'Canva' });
    expect(estVide(charger())).toBe(false);
    expect(estVide({ diapositive: null, vu: 'Canva' })).toBe(false);
    enregistrer({ diapositive: null, vu: '' });
    expect(localStorage.getItem('skazy-jeux:suivi-groupe')).toBeNull();
  });

  it('relit des notes gardées au premier format dans le navigateur', () => {
    localStorage.setItem(
      'skazy-jeux:suivi-groupe',
      JSON.stringify({ diapositive: 'Diapo 8', logiciels: ['Canva'] }),
    );
    expect(charger()).toEqual({ diapositive: 8, vu: 'Canva' });
  });

  it('des notes abîmées dans le stockage ne font rien planter', () => {
    localStorage.setItem('skazy-jeux:suivi-groupe', '{pas du json');
    expect(charger()).toEqual({ diapositive: null, vu: '' });
  });
});
