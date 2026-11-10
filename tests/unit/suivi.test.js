import { describe, it, expect, beforeEach } from 'vitest';
import {
  LONGUEUR_DIAPOSITIVE,
  LONGUEUR_LOGICIEL,
  NOMBRE_LOGICIELS_MAX,
  normaliserDiapositive,
  ajouterLogiciels,
  retirerLogiciel,
  normaliserSuivi,
  estVide,
  decrireSuivi,
  charger,
  enregistrer,
} from '../../assets/js/commun/suivi.js';

beforeEach(() => localStorage.clear());

describe('suivi de la formation', () => {
  it('la diapositive tient sur une ligne, sans espaces en trop, et accepte un numéro', () => {
    expect(normaliserDiapositive('  Diapo 42,\n les  tableaux croisés ')).toBe(
      'Diapo 42, les tableaux croisés',
    );
    expect(normaliserDiapositive(42)).toBe('42');
    expect(normaliserDiapositive(null)).toBe('');
    expect(normaliserDiapositive({ numero: 3 })).toBe('');
    expect(normaliserDiapositive('x'.repeat(500))).toHaveLength(LONGUEUR_DIAPOSITIVE);
  });

  it('ajoute plusieurs logiciels à la fois, sans doublon ni nom vide', () => {
    const { liste, ajouts } = ajouterLogiciels(['Word'], 'Excel,  google  sheets ;; word\nCanva');
    expect(liste).toEqual(['Word', 'Excel', 'google sheets', 'Canva']);
    expect(ajouts).toEqual(['Excel', 'google sheets', 'Canva']);
    // La liste d'origine n'est pas modifiée
    expect(ajouterLogiciels(liste, 'EXCEL')).toEqual({ liste, ajouts: [] });
  });

  it('coupe un nom trop long et s’arrête au nombre maximum', () => {
    expect(ajouterLogiciels([], 'x'.repeat(200)).liste[0]).toHaveLength(LONGUEUR_LOGICIEL);
    const beaucoup = Array.from({ length: NOMBRE_LOGICIELS_MAX + 5 }, (_, i) => `Outil ${i}`);
    expect(ajouterLogiciels([], beaucoup).liste).toHaveLength(NOMBRE_LOGICIELS_MAX);
  });

  it('retire un logiciel sans tenir compte des majuscules', () => {
    expect(retirerLogiciel(['Word', 'Excel'], 'word')).toEqual(['Excel']);
    expect(retirerLogiciel(['Word'], 'Canva')).toEqual(['Word']);
  });

  it('ne garde d’un fichier que les textes prévus', () => {
    expect(
      normaliserSuivi({
        diapositive: 12,
        logiciels: ['Word', 3, null, { nom: 'x' }, 'word', ' Excel '],
        autre: 'ignoré',
      }),
    ).toEqual({ diapositive: '12', logiciels: ['Word', '3', 'Excel'] });
    expect(normaliserSuivi('du texte')).toEqual({ diapositive: '', logiciels: [] });
    expect(normaliserSuivi({ logiciels: 'Word' })).toEqual({ diapositive: '', logiciels: [] });
  });

  it('décrit les notes en une ligne', () => {
    expect(decrireSuivi({ diapositive: 'diapo 42', logiciels: ['Word', 'Excel'] })).toBe(
      'arrêté à : diapo 42 · 2 logiciels vus',
    );
    expect(decrireSuivi({ diapositive: '', logiciels: ['Word'] })).toBe('1 logiciel vu');
    expect(decrireSuivi(undefined)).toBe('');
  });

  it('garde les notes dans le navigateur, et rien quand elles sont vides', () => {
    expect(charger()).toEqual({ diapositive: '', logiciels: [] });
    enregistrer({ diapositive: 'Diapo 8', logiciels: ['Canva'] });
    expect(charger()).toEqual({ diapositive: 'Diapo 8', logiciels: ['Canva'] });
    expect(estVide(charger())).toBe(false);
    enregistrer({ diapositive: '', logiciels: [] });
    expect(localStorage.getItem('skazy-jeux:suivi-groupe')).toBeNull();
    expect(estVide(charger())).toBe(true);
  });

  it('des notes abîmées dans le stockage ne font rien planter', () => {
    localStorage.setItem('skazy-jeux:suivi-groupe', '{pas du json');
    expect(charger()).toEqual({ diapositive: '', logiciels: [] });
  });
});
