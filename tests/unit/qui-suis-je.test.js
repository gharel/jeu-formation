import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { indicesVisibles } from '../../jeux/qui-suis-je/logique.js';
import { schema, exemple } from '../../jeux/qui-suis-je/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerMancheAPaliers } from '../../assets/js/commun/manche-paliers.js';
import { sons } from '../../assets/js/commun/sons.js';

describe('Qui suis-je ?', () => {
  it('ajoute un indice à chaque chiffre perdu', () => {
    expect([5, 4, 3, 2, 1].map((v) => indicesVisibles(v, 5))).toEqual([1, 2, 3, 4, 5]);
    expect([5, 4, 3, 2, 1].map((v) => indicesVisibles(v, 3))).toEqual([1, 2, 3, 3, 3]);
    expect(indicesVisibles(0, 4)).toBe(4);
  });

  it('a un exemple valide, avec des paliers de 6 secondes par défaut', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, {}).reglages.dureePalier).toBe(6);
  });
});

describe('manche à paliers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function ctxFactice(prenomChoisi) {
    return {
      participants: prenomChoisi ? ['Ana', 'Bob'] : [],
      sons, // vrais sons : sans AudioContext (jsdom), ils ne jouent rien
      annoncer() {},
      scores: { ajouter: vi.fn() },
      choisirPrenoms: vi.fn(async () => [prenomChoisi]),
    };
  }

  function bouton(manche, texte) {
    return [...manche.actions.querySelectorAll('button')].find((b) =>
      b.textContent.includes(texte),
    );
  }

  it('fige les points au stop et les donne à la bonne réponse', async () => {
    const ctx = ctxFactice('Bob');
    const valeurs = [];
    const surFin = vi.fn();
    const manche = creerMancheAPaliers({
      ctx,
      dureePalier: 2,
      surValeur: (v) => valeurs.push(v),
      surFin,
    });
    bouton(manche, 'Démarrer').click();
    vi.advanceTimersByTime(4100);
    bouton(manche, 'Stop').click();
    vi.advanceTimersByTime(10000);
    expect(valeurs).toEqual([5, 4, 3]);
    await bouton(manche, 'Bonne réponse').click();
    await vi.runAllTimersAsync();
    expect(ctx.scores.ajouter).toHaveBeenCalledWith('Bob', 3);
    expect(surFin).toHaveBeenCalledWith({ trouve: true, prenom: 'Bob', points: 3 });
    manche.detruire();
  });

  it('reprend après une mauvaise réponse et finit à zéro sans gagnant', () => {
    const ctx = ctxFactice(null);
    const surFin = vi.fn();
    const manche = creerMancheAPaliers({ ctx, dureePalier: 1, surValeur() {}, surFin });
    bouton(manche, 'Démarrer').click();
    bouton(manche, 'Stop').click();
    bouton(manche, 'Mauvaise réponse').click();
    vi.advanceTimersByTime(5200);
    expect(surFin).toHaveBeenCalledWith({ trouve: false });
    manche.detruire();
  });
});
