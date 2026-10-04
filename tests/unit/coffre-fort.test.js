import { describe, it, expect } from 'vitest';
import {
  SERRURES_MIN,
  SERRURES_MAX,
  ouvre,
  creerCoffre,
  cleRecord,
  estNouveauRecord,
} from '../../jeux/coffre-fort/logique.js';
import { schema, exemple } from '../../jeux/coffre-fort/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';

describe('Le Coffre-fort', () => {
  it('ouvre une serrure avec la réponse ou l’une de ses variantes', () => {
    expect(ouvre('echap', 'Échap / Esc / Escape')).toBe(true);
    expect(ouvre('ESC', 'Échap / Esc / Escape')).toBe(true);
    expect(ouvre('corbeille', 'La corbeille')).toBe(true);
    expect(ouvre('1998', '1989')).toBe(false);
    expect(ouvre('', '1989')).toBe(false);
  });

  it('ouvre les serrures une à une, jusqu’au coffre', () => {
    const coffre = creerCoffre({ nombre: 3 });
    expect(coffre.essayer(true)).toBe('ouverte');
    expect(coffre.essayer(true)).toBe('ouverte');
    expect(coffre.ouvert).toBe(false);
    expect(coffre.essayer(true)).toBe('coffre-ouvert');
    expect(coffre.ouvert).toBe(true);
    expect(coffre.ouvertes).toBe(3);
    expect(coffre.essayer(true)).toBeNull();
    expect(coffre.erreurs).toBe(0);
  });

  it('fait perdre du temps à chaque erreur', () => {
    const coffre = creerCoffre({ nombre: 3, penaliteMs: 30000 });
    expect(coffre.essayer(false)).toBe('erreur');
    expect(coffre.essayer(false)).toBe('erreur');
    expect(coffre.erreurs).toBe(2);
    expect(coffre.tempsPerdu).toBe(60000);
    expect(coffre.ouvertes).toBe(0);
  });

  it('rend le temps d’une réponse refusée que l’animateur juge bonne', () => {
    const coffre = creerCoffre({ nombre: 3, penaliteMs: 20000 });
    expect(coffre.accepterQuandMeme()).toBeNull();
    coffre.essayer(false);
    expect(coffre.accepterQuandMeme()).toEqual({ rendu: 20000, issue: 'ouverte' });
    expect(coffre.tempsPerdu).toBe(0);
    expect(coffre.erreurs).toBe(0);
    expect(coffre.ouvertes).toBe(1);
    // Une seule fois, et seulement pour la serrure en cours
    expect(coffre.accepterQuandMeme()).toBeNull();
    coffre.essayer(false);
    coffre.essayer(true);
    expect(coffre.accepterQuandMeme()).toBeNull();
  });

  it('fait payer un indice une seule fois par serrure', () => {
    const coffre = creerCoffre({ nombre: 3, coutIndiceMs: 60000 });
    expect(coffre.indicePaye()).toBe(false);
    expect(coffre.acheterIndice()).toBe(60000);
    expect(coffre.acheterIndice()).toBe(0);
    expect(coffre.indicePaye()).toBe(true);
    expect(coffre.tempsPerdu).toBe(60000);
    coffre.essayer(true);
    expect(coffre.indicePaye()).toBe(false);
    expect(coffre.indicePaye(0)).toBe(true);
    // Après un indice, la dernière erreur ne peut plus être annulée
    coffre.essayer(false);
    coffre.acheterIndice();
    expect(coffre.accepterQuandMeme()).toBeNull();
  });

  it('garde le meilleur temps restant comme record, par taille de coffre', () => {
    expect(cleRecord(5, 10)).toBe('coffre-fort:record:5-10');
    expect(estNouveauRecord(null, 1000)).toBe(true);
    expect(estNouveauRecord(90000, 120000)).toBe(true);
    expect(estNouveauRecord(90000, 60000)).toBe(false);
    expect(estNouveauRecord(90000, 90000)).toBe(false);
  });

  it('a un exemple valide, de 3 à 8 serrures', () => {
    expect([SERRURES_MIN, SERRURES_MAX]).toEqual([3, 8]);
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, exemple)).toEqual(exemple);
  });
});
