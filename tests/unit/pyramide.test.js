import { describe, it, expect } from 'vitest';
import {
  INDICES_MAX,
  pointsPourIndices,
  creerMot,
  roles,
  tirerBinome,
} from '../../jeux/pyramide/logique.js';
import { schema, exemple } from '../../jeux/pyramide/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('Pyramide', () => {
  it('donne 4, 3, 2 ou 1 point selon le nombre de mots d’indice', () => {
    expect(INDICES_MAX).toBe(4);
    expect([1, 2, 3, 4].map(pointsPourIndices)).toEqual([4, 3, 2, 1]);
    expect(pointsPourIndices(0)).toBe(0);
    expect(pointsPourIndices(5)).toBe(0);
  });

  it('cache le mot le temps que le partenaire se retourne', () => {
    const mot = creerMot();
    expect(mot.phase).toBe('cache');
    expect(mot.trouver()).toBeNull();
    expect(mot.rater()).toBeNull();
    expect(mot.faute()).toBe(false);
    expect(mot.afficher()).toBe(true);
    expect(mot.afficher()).toBe(false);
    expect(mot.phase).toBe('jeu');
    expect(mot.indice).toBe(1);
    expect(mot.points).toBe(4);
  });

  it('passe au mot d’indice suivant après une mauvaise réponse, puis compte les points', () => {
    const mot = creerMot();
    mot.afficher();
    expect(mot.rater()).toBe('indice-suivant');
    expect(mot.indice).toBe(2);
    expect(mot.points).toBe(3);
    expect(mot.trouver()).toBe(3);
    expect(mot.phase).toBe('fini');
    expect(mot.issue).toBe('trouve');
    expect(mot.points).toBe(3);
    // Plus rien ne bouge une fois le mot fini
    expect(mot.rater()).toBeNull();
    expect(mot.trouver()).toBeNull();
  });

  it('perd le mot après 4 mots d’indice sans succès', () => {
    const mot = creerMot();
    mot.afficher();
    expect([mot.rater(), mot.rater(), mot.rater()]).toEqual(Array(3).fill('indice-suivant'));
    expect(mot.indice).toBe(4);
    expect(mot.points).toBe(1);
    expect(mot.rater()).toBe('perdu');
    expect(mot.issue).toBe('rate');
    expect(mot.points).toBe(0);
  });

  it('perd le mot sur une faute (indice interdit)', () => {
    const mot = creerMot();
    mot.afficher();
    mot.rater();
    expect(mot.faute()).toBe(true);
    expect(mot.issue).toBe('faute');
    expect(mot.points).toBe(0);
    expect(mot.faute()).toBe(false);
  });

  it('inverse les rôles du binôme à chaque mot', () => {
    expect(roles(['Ana', 'Bob'], 0)).toEqual({ maitre: 'Ana', devineur: 'Bob' });
    expect(roles(['Ana', 'Bob'], 1)).toEqual({ maitre: 'Bob', devineur: 'Ana' });
    expect(roles(['Ana', 'Bob'], 2)).toEqual({ maitre: 'Ana', devineur: 'Bob' });
  });

  it('tire un binôme parmi ceux qui n’ont pas encore joué', () => {
    expect(tirerBinome(['Ana'])).toBeNull();
    const hasard = creerHasard(5);
    const tous = ['Ana', 'Bob', 'Chloé', 'David', 'Emma'];
    for (let k = 0; k < 20; k++) {
      const [a, b] = tirerBinome(tous, new Set(['Ana', 'Bob', 'Chloé']), hasard);
      expect(a).not.toBe(b);
      expect(new Set([a, b])).toEqual(new Set(['David', 'Emma']));
    }
    // Un seul n'a pas encore joué : il fait équipe avec quelqu'un qui a déjà joué
    const [nouveau, partenaire] = tirerBinome(tous, new Set(['Ana', 'Bob', 'Chloé', 'David']));
    expect(nouveau).toBe('Emma');
    expect(tous).toContain(partenaire);
    expect(partenaire).not.toBe('Emma');
  });

  it('a un exemple valide : une simple liste de mots, sans indices à préparer', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(schema.elements.champs.map((c) => c.cle)).toEqual(['mot']);
    expect(nettoyerContenu(schema, {}).reglages.motsParBinome).toBe(2);
  });

  it('garde les mots d’un ancien contenu (avec 3 indices préparés)', () => {
    const ancien = {
      reglages: { afficherLongueur: true },
      elements: [{ mot: 'Souris', indices: ['Rongeur', 'Molette', 'Clic'] }],
    };
    expect(nettoyerContenu(schema, ancien)).toEqual({
      reglages: { motsParBinome: 2 },
      elements: [{ mot: 'Souris' }],
    });
  });
});
