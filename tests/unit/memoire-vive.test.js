import { describe, it, expect } from 'vitest';
import {
  NOMBRES_DE_CARTES,
  PAIRES_MIN,
  validerPaire,
  nombresPossibles,
  nombreParDefaut,
  disposition,
  repere,
  distribuer,
  joueurSuivant,
  creerPartie,
} from '../../jeux/memoire-vive/logique.js';
import { schema, exemple } from '../../jeux/memoire-vive/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

const paires = Array.from({ length: 10 }, (_, i) => ({
  carteA: `A${i}`,
  carteB: `B${i}`,
  explication: '',
}));

/** Index des deux cartes d'une paire (rang dans la donne). */
const cartesDeLaPaire = (cartes, rang) => cartes.flatMap((c, i) => (c.paire === rang ? [i] : []));

describe('Mémoire vive', () => {
  it('propose de 8 à 24 cartes selon le nombre de paires préparées', () => {
    expect(NOMBRES_DE_CARTES).toEqual([8, 12, 16, 20, 24]);
    expect(PAIRES_MIN).toBe(4);
    expect(nombresPossibles(4)).toEqual([8]);
    expect(nombresPossibles(9)).toEqual([8, 12, 16]);
    expect(nombresPossibles(40)).toEqual(NOMBRES_DE_CARTES);
    expect(nombresPossibles(3)).toEqual([]);
  });

  it('propose 16 cartes, ou le dernier choix s’il est encore possible', () => {
    expect(nombreParDefaut(10)).toBe(16);
    expect(nombreParDefaut(10, 20)).toBe(20);
    expect(nombreParDefaut(10, 24)).toBe(16);
    expect(nombreParDefaut(6)).toBe(12);
    expect(nombreParDefaut(3)).toBeNull();
  });

  it('range les cartes en grille, avec un repère par carte', () => {
    expect(disposition(8)).toEqual({ colonnes: 4, lignes: 2 });
    expect(disposition(16)).toEqual({ colonnes: 4, lignes: 4 });
    expect(disposition(20)).toEqual({ colonnes: 5, lignes: 4 });
    expect(disposition(24)).toEqual({ colonnes: 6, lignes: 4 });
    expect([0, 1, 3, 4, 15].map((i) => repere(i, 4))).toEqual(['A1', 'B1', 'D1', 'A2', 'D4']);
  });

  it('distribue des paires tirées au hasard, une carte A et une carte B pour chacune', () => {
    const { paires: choisies, cartes } = distribuer(paires, 12, creerHasard(3));
    expect(choisies).toHaveLength(6);
    expect(cartes).toHaveLength(12);
    for (let rang = 0; rang < 6; rang++) {
      const faces = cartesDeLaPaire(cartes, rang).map((i) => cartes[i]);
      expect(faces.map((c) => c.face).sort()).toEqual(['a', 'b']);
      expect(faces.find((c) => c.face === 'a').texte).toBe(choisies[rang].carteA);
      expect(faces.find((c) => c.face === 'b').texte).toBe(choisies[rang].carteB);
    }
    // Même graine, même donne
    expect(distribuer(paires, 12, creerHasard(3))).toEqual({ paires: choisies, cartes });
  });

  it('passe au joueur suivant, en boucle', () => {
    expect(joueurSuivant(['Ana', 'Bob', 'Chloé'], 'Bob')).toBe('Chloé');
    expect(joueurSuivant(['Ana', 'Bob', 'Chloé'], 'Chloé')).toBe('Ana');
    expect(joueurSuivant(['Ana', 'Bob'], null)).toBe('Ana');
    expect(joueurSuivant([], 'Ana')).toBeNull();
  });

  it('garde une paire trouvée visible, cache un raté', () => {
    const { cartes } = distribuer(paires, 8, creerHasard(5));
    const partie = creerPartie(cartes);
    const [a0, b0] = cartesDeLaPaire(cartes, 0);
    const [a1] = cartesDeLaPaire(cartes, 1);
    const [a2] = cartesDeLaPaire(cartes, 2);

    expect(partie.retourner(a0)).toBe('premiere');
    // La même carte ne se retourne pas deux fois
    expect(partie.retourner(a0)).toBeNull();
    expect(partie.retourner(a1)).toBe('ratee');
    expect(partie.visibles).toEqual([a0, a1]);
    expect(partie.cacher()).toBe(true);
    expect(partie.visibles).toEqual([]);
    expect(partie.cacher()).toBe(false);

    expect(partie.retourner(a0)).toBe('premiere');
    expect(partie.retourner(b0)).toBe('paire');
    expect(partie.estTrouvee(a0)).toBe(true);
    expect(partie.pairesTrouvees).toBe(1);
    // Une carte trouvée ne se retourne plus
    expect(partie.retourner(b0)).toBeNull();

    // Après un raté, retourner une autre carte cache d'abord les deux précédentes
    partie.retourner(a1);
    expect(partie.retourner(a2)).toBe('ratee');
    expect(partie.retourner(a1)).toBeNull();
    expect(partie.retourner(cartesDeLaPaire(cartes, 3)[0])).toBe('premiere');
    expect(partie.visibles).toHaveLength(1);
  });

  it('se termine quand toutes les paires sont trouvées', () => {
    const { cartes } = distribuer(paires, 8, creerHasard(9));
    const partie = creerPartie(cartes);
    for (let rang = 0; rang < 4; rang++) {
      const [x, y] = cartesDeLaPaire(cartes, rang);
      partie.retourner(x);
      expect(partie.retourner(y)).toBe('paire');
    }
    expect(partie.phase).toBe('finie');
    expect(partie.pairesTrouvees).toBe(partie.nombreDePaires);
    expect(partie.retourner(0)).toBeNull();
  });

  it('refuse une paire de deux cartes identiques', () => {
    expect(validerPaire({ carteA: 'PDF', carteB: ' pdf ' })).toMatch(/différentes/);
    expect(validerPaire({ carteA: 'PDF', carteB: 'Document figé' })).toBeNull();
    expect(validerPaire({ carteA: '', carteB: '' })).toBeNull();
  });

  it('a un exemple valide, de quoi jouer jusqu’à 20 cartes', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, exemple).elements).toEqual(exemple.elements);
    expect(nombresPossibles(exemple.elements.length)).toContain(20);
  });
});
