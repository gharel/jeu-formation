import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CORRECTION,
  POINTS_MAX,
  pointsEntiers,
  normaliserScores,
  totalDe,
  detailDe,
  ajouterPoints,
  fixerTotal,
  classementGroupe,
  scoresVides,
  charger,
  enregistrer,
} from '../../assets/js/commun/scores-groupe.js';
import { creerGroupe } from '../../assets/js/commun/groupe.js';
import { morceauxDetail } from '../../assets/js/commun/bloc-scores.js';
import { lire, ecrire } from '../../assets/js/commun/stockage.js';

beforeEach(() => localStorage.clear());

describe('scores du groupe : fonctions pures', () => {
  it('additionne les points de chaque jeu, sans tenir compte des majuscules', () => {
    let scores = {};
    scores = ajouterPoints(scores, 'Ana', 'motus', 2);
    scores = ajouterPoints(scores, 'ana', 'motus', 1);
    scores = ajouterPoints(scores, 'Ana', 'pyramide', 4);
    expect(scores).toEqual({ ana: { motus: 3, pyramide: 4 } });
    expect(totalDe(scores, 'ANA')).toBe(7);
    expect(totalDe(scores, 'Bob')).toBe(0);
    expect(detailDe(scores, 'Ana')).toEqual([
      { source: 'motus', points: 3 },
      { source: 'pyramide', points: 4 },
    ]);
    // Un détail qui retombe à zéro disparaît, une personne sans point aussi
    scores = ajouterPoints(scores, 'Ana', 'motus', -3);
    scores = ajouterPoints(scores, 'Ana', 'pyramide', -4);
    expect(scores).toEqual({});
    expect(scoresVides(scores)).toBe(true);
  });

  it('corrige un total : l’écart va dans la correction de l’animateur', () => {
    let scores = ajouterPoints({}, 'Ana', 'motus', 3);
    scores = fixerTotal(scores, 'Ana', 10);
    expect(scores.ana).toEqual({ motus: 3, [CORRECTION]: 7 });
    expect(totalDe(scores, 'Ana')).toBe(10);
    scores = fixerTotal(scores, 'Ana', 3);
    expect(scores.ana).toEqual({ motus: 3 });
    scores = fixerTotal(scores, 'Bob', -2);
    expect(totalDe(scores, 'Bob')).toBe(-2);
  });

  it('borne les points à des nombres entiers', () => {
    expect(pointsEntiers('12')).toBe(12);
    expect(pointsEntiers(2.7)).toBe(2);
    expect(pointsEntiers('abc')).toBe(0);
    expect(pointsEntiers(1e9)).toBe(POINTS_MAX);
    expect(pointsEntiers(-1e9)).toBe(-POINTS_MAX);
    expect(totalDe(fixerTotal({}, 'Ana', 1e9), 'Ana')).toBe(POINTS_MAX);
  });

  it('nettoie un score importé ou abîmé : personnes connues, sources valides, entiers', () => {
    const brut = {
      Ana: { motus: '3', 'pas une source !': 5, pyramide: 0, bingo: 2.5 },
      zoe: { motus: 4 },
      bob: 'cinq',
    };
    expect(normaliserScores(brut, ['Ana', 'Bob'])).toEqual({ ana: { motus: 3, bingo: 2 } });
    expect(normaliserScores(null, ['Ana'])).toEqual({});
    expect(normaliserScores([1, 2], ['Ana'])).toEqual({});
  });

  it('classe le groupe, ex æquo au même rang, sans oublier ceux qui n’ont pas de point', () => {
    let scores = ajouterPoints({}, 'Bob', 'motus', 5);
    scores = ajouterPoints(scores, 'Chloé', 'duel-buzzer', 5);
    scores = ajouterPoints(scores, 'Ana', 'motus', 2);
    expect(classementGroupe(scores, ['Ana', 'Bob', 'Chloé', 'David'])).toEqual([
      { prenom: 'Bob', points: 5, rang: 1 },
      { prenom: 'Chloé', points: 5, rang: 1 },
      { prenom: 'Ana', points: 2, rang: 3 },
      { prenom: 'David', points: 0, rang: 4 },
    ]);
  });

  it('décrit le détail avec le titre des jeux', () => {
    expect(
      morceauxDetail([
        { source: 'motus', points: 3 },
        { source: 'duel-buzzer', points: -1 },
        { source: CORRECTION, points: 2 },
      ]),
    ).toEqual(['Motus numérique :\u00a03', 'Duel buzzer :\u00a0−1', 'Correction :\u00a0+2']);
    expect(morceauxDetail([])).toEqual([]);
  });

  it('se garde dans le stockage, nettoyé à la lecture', () => {
    enregistrer({ ana: { motus: 3 }, zoe: { motus: 1 } });
    expect(charger(['Ana'])).toEqual({ ana: { motus: 3 } });
    ecrire('scores-groupe', 'abîmé');
    expect(charger(['Ana'])).toEqual({});
  });
});

describe('scores du groupe : état partagé (groupe.js)', () => {
  it('garde les points d’un jeu à l’autre, et les oublie pour une personne retirée', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Ana', 'Bob']);
    const surScores = vi.fn();
    const surListe = vi.fn();
    groupe.surChangementScores(surScores);
    groupe.surChangement(surListe);
    groupe.ajouterPoints('Ana', 'motus', 2);
    // Un autre jeu, ouvert plus tard (nouvelle page) : les points s'additionnent
    const autrePage = creerGroupe();
    autrePage.ajouterPoints('Ana', 'pyramide', 3);
    groupe.ajouterPoints('Bob', 'motus', 1);
    expect(groupe.totalDe('Ana')).toBe(5);
    expect(lire('scores-groupe')).toEqual({ ana: { motus: 2, pyramide: 3 }, bob: { motus: 1 } });
    // Les points ne redessinent pas toute la page : seulement les écouteurs des scores
    expect(surScores).toHaveBeenCalledTimes(2);
    expect(surListe).not.toHaveBeenCalled();

    groupe.changerParticipants(['Ana']);
    expect(groupe.scores).toEqual({ ana: { motus: 2, pyramide: 3 } });
    expect(creerGroupe().scores).toEqual({ ana: { motus: 2, pyramide: 3 } });
  });

  it('corrige un total, remet à zéro et relit les changements d’une autre page', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Ana', 'Bob']);
    groupe.fixerTotal('Bob', 4);
    expect(groupe.totalDe('Bob')).toBe(4);
    creerGroupe().ajouterPoints('Ana', 'bingo', 3);
    expect(groupe.totalDe('Ana')).toBe(0);
    groupe.rechargerScores();
    expect(groupe.totalDe('Ana')).toBe(3);
    groupe.reinitialiserScores();
    expect(groupe.scores).toEqual({});
    expect(creerGroupe().scores).toEqual({});
  });

  it('des points pour plusieurs personnes : une seule lecture et une seule écriture', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Ana', 'Bob', 'Chloé']);
    const surScores = vi.fn();
    groupe.surChangementScores(surScores);
    const ecriture = vi.spyOn(Storage.prototype, 'setItem');
    groupe.ajouterPoints(['Ana', 'Chloé'], 'patate-chaude', 1);
    const ecrituresScores = ecriture.mock.calls.filter(([cle]) => cle.endsWith('scores-groupe'));
    ecriture.mockRestore();
    expect(ecrituresScores).toHaveLength(1);
    expect(surScores).toHaveBeenCalledTimes(1);
    expect(lire('scores-groupe')).toEqual({
      ana: { 'patate-chaude': 1 },
      chloé: { 'patate-chaude': 1 },
    });
  });

  it('un groupe remplacé (fichier importé) prend ses propres scores', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Zoé']);
    groupe.ajouterPoints('Zoé', 'motus', 9);
    groupe.remplacer({ participants: ['Ana', 'Bob'], scores: { ana: { top: 2 }, zoé: { a: 1 } } });
    expect(groupe.scores).toEqual({ ana: { top: 2 } });
    groupe.remplacer({ participants: ['Ana'] });
    expect(groupe.scores).toEqual({});
  });
});
