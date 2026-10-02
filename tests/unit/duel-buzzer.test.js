import { describe, it, expect } from 'vitest';
import { creerDuel, autre, tirerDuellistes } from '../../jeux/duel-buzzer/logique.js';
import { schema, exemple } from '../../jeux/duel-buzzer/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('Duel buzzer', () => {
  it('refuse les faux départs avant la question', () => {
    const duel = creerDuel();
    expect(duel.phase).toBe('attente');
    expect(duel.buzzer('gauche')).toBe(false);
    expect(duel.ouvrir()).toBe(true);
    expect(duel.ouvrir()).toBe(false);
    expect(duel.buzzer('gauche')).toBe(true);
    // le second buzzer est bloqué
    expect(duel.buzzer('droite')).toBe(false);
    expect(duel.main).toBe('gauche');
  });

  it('donne un point à la bonne réponse', () => {
    const duel = creerDuel();
    duel.ouvrir();
    duel.buzzer('droite');
    expect(duel.valider(true)).toBe('point');
    expect(duel.points).toEqual({ gauche: 0, droite: 1 });
    expect(duel.phase).toBe('resolu');
  });

  it('passe la main à l’adversaire après une mauvaise réponse', () => {
    const duel = creerDuel();
    duel.ouvrir();
    duel.buzzer('gauche');
    expect(duel.valider(false)).toBe('main-adverse');
    expect(duel.main).toBe('droite');
    expect(duel.valider(false)).toBe('personne');
    expect(duel.points).toEqual({ gauche: 0, droite: 0 });
  });

  it('déclare le vainqueur au nombre de points choisi', () => {
    const duel = creerDuel({ pointsVictoire: 2 });
    for (let i = 0; i < 2; i++) {
      duel.preparer();
      duel.ouvrir();
      duel.buzzer('gauche');
      duel.valider(true);
    }
    expect(duel.vainqueur).toBe('gauche');
    expect(duel.preparer()).toBe(false);
    expect(duel.ouvrir()).toBe(false);
  });

  it('peut passer une question sans point', () => {
    const duel = creerDuel();
    expect(duel.passer()).toBe(false);
    duel.ouvrir();
    expect(duel.passer()).toBe(true);
    expect(duel.phase).toBe('resolu');
    expect(duel.buzzer('gauche')).toBe(false);
  });

  it('tire deux duellistes différents', () => {
    expect(autre('gauche')).toBe('droite');
    expect(tirerDuellistes(['Ana'])).toBeNull();
    const hasard = creerHasard(8);
    for (let k = 0; k < 30; k++) {
      const [a, b] = tirerDuellistes(['Ana', 'Bob', 'Chloé'], hasard);
      expect(a).not.toBe(b);
    }
  });

  it('a un exemple valide, 3 points pour gagner par défaut', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, {}).reglages.pointsVictoire).toBe(3);
  });
});
