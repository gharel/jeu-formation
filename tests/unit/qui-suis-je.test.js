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

  /**
   * `choisis` : les prénoms cliqués dans la fenêtre « Qui a trouvé ? » ([] : sans participants),
   * `equipes` : les équipes cliquées.
   */
  function ctxFactice(choisis = [], equipes = []) {
    return {
      participants: choisis.length ? ['Ana', 'Bob', 'Chloé'] : [],
      sons, // vrais sons : sans AudioContext (jsdom), ils ne jouent rien
      annoncer() {},
      scores: { ajouterGagnants: vi.fn() },
      choisirGagnants: vi.fn(async () => ({ prenoms: choisis, equipes })),
    };
  }

  function bouton(manche, texte) {
    return [...manche.actions.querySelectorAll('button')].find((b) =>
      b.textContent.includes(texte),
    );
  }

  it('fige les points au stop et les donne à la bonne réponse', async () => {
    const ctx = ctxFactice(['Bob']);
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
    expect(ctx.choisirGagnants).toHaveBeenCalledWith(expect.objectContaining({ plusieurs: true }));
    const gagnants = { prenoms: ['Bob'], equipes: [] };
    expect(ctx.scores.ajouterGagnants).toHaveBeenCalledWith(gagnants, 3);
    expect(surFin).toHaveBeenCalledWith({ trouve: true, gagnants, points: 3 });
    manche.detruire();
  });

  it('donne les points à plusieurs personnes à la fois, ou à une équipe', async () => {
    const ctx = ctxFactice(['Ana', 'Chloé'], ['e1']);
    const surFin = vi.fn();
    const manche = creerMancheAPaliers({ ctx, dureePalier: 2, surValeur() {}, surFin });
    bouton(manche, 'Démarrer').click();
    bouton(manche, 'Stop').click();
    await bouton(manche, 'Bonne réponse').click();
    await vi.runAllTimersAsync();
    const gagnants = { prenoms: ['Ana', 'Chloé'], equipes: ['e1'] };
    expect(ctx.scores.ajouterGagnants).toHaveBeenCalledWith(gagnants, 5);
    expect(surFin).toHaveBeenCalledWith({ trouve: true, gagnants, points: 5 });
    manche.detruire();
  });

  it('montre la réponse pendant la pause, puis la juge sans pouvoir reprendre', async () => {
    const ctx = ctxFactice(['Ana']);
    const surReponse = vi.fn();
    const surFin = vi.fn();
    const manche = creerMancheAPaliers({ ctx, dureePalier: 2, surValeur() {}, surReponse, surFin });
    bouton(manche, 'Démarrer').click();
    vi.advanceTimersByTime(2100);
    bouton(manche, 'Stop').click();
    bouton(manche, 'Voir la réponse').click();
    expect(surReponse).toHaveBeenCalledTimes(1);
    expect(bouton(manche, 'Voir la réponse')).toBeUndefined();
    expect(bouton(manche, 'on reprend')).toBeUndefined();
    // Le temps reste figé, Espace ne relance rien
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
    vi.advanceTimersByTime(10000);
    expect(surFin).not.toHaveBeenCalled();
    bouton(manche, 'Mauvaise réponse').click();
    expect(surFin).toHaveBeenCalledWith({ trouve: false });
    expect(ctx.scores.ajouterGagnants).not.toHaveBeenCalled();
    manche.detruire();
  });

  it('après la réponse affichée, la bonne réponse marque les points figés', async () => {
    const ctx = ctxFactice(['Bob']);
    const surFin = vi.fn();
    const manche = creerMancheAPaliers({
      ctx,
      dureePalier: 2,
      surValeur() {},
      surReponse() {},
      surFin,
    });
    bouton(manche, 'Démarrer').click();
    vi.advanceTimersByTime(2100);
    bouton(manche, 'Stop').click();
    bouton(manche, 'Voir la réponse').click();
    await bouton(manche, 'Bonne réponse').click();
    await vi.runAllTimersAsync();
    expect(surFin).toHaveBeenCalledWith({
      trouve: true,
      gagnants: { prenoms: ['Bob'], equipes: [] },
      points: 4,
    });
    manche.detruire();
  });

  it('reprend après une mauvaise réponse et finit à zéro sans gagnant', () => {
    const ctx = ctxFactice();
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
