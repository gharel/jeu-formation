import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { creerChrono, formaterDuree } from '../../assets/js/commun/chrono.js';
import { valeurPalier, creerPaliers } from '../../assets/js/commun/paliers.js';
import { creerScores, classer } from '../../assets/js/commun/scores.js';
import { nommerGagnants } from '../../assets/js/commun/points.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('chrono', () => {
  it('décompte et appelle surFin une seule fois', () => {
    const surFin = vi.fn();
    const chrono = creerChrono({ duree: 3, surFin });
    chrono.demarrer();
    vi.advanceTimersByTime(1500);
    expect(chrono.restant()).toBe(1500);
    vi.advanceTimersByTime(2000);
    expect(surFin).toHaveBeenCalledTimes(1);
    expect(chrono.restant()).toBe(0);
    expect(chrono.enCours).toBe(false);
  });

  it('se met en pause et reprend', () => {
    const chrono = creerChrono({ duree: 10 });
    chrono.demarrer();
    vi.advanceTimersByTime(4000);
    chrono.pause();
    vi.advanceTimersByTime(5000);
    expect(chrono.restant()).toBe(6000);
    chrono.demarrer();
    vi.advanceTimersByTime(1000);
    expect(chrono.restant()).toBe(5000);
    expect(chrono.ecoule()).toBe(5000);
  });

  it('ajoute ou retire du temps, en cours comme en pause', () => {
    const surFin = vi.fn();
    const tics = [];
    const chrono = creerChrono({ duree: 60, surFin, surTic: (r) => tics.push(r) });
    chrono.demarrer();
    vi.advanceTimersByTime(10000);
    chrono.ajuster(-30000);
    expect(chrono.restant()).toBe(20000);
    // L'affichage suit tout de suite
    expect(tics.at(-1)).toBe(20000);
    chrono.ajuster(5000);
    expect(chrono.restant()).toBe(25000);
    chrono.pause();
    chrono.ajuster(-5000);
    expect(chrono.restant()).toBe(20000);
    chrono.demarrer();
    vi.advanceTimersByTime(5000);
    expect(chrono.restant()).toBe(15000);
    expect(surFin).not.toHaveBeenCalled();
  });

  it('s’arrête quand une pénalité épuise le temps, et ne bouge plus ensuite', () => {
    const surFin = vi.fn();
    const chrono = creerChrono({ duree: 20, surFin });
    chrono.demarrer();
    vi.advanceTimersByTime(5000);
    chrono.ajuster(-30000);
    expect(surFin).toHaveBeenCalledTimes(1);
    expect(chrono.restant()).toBe(0);
    expect(chrono.enCours).toBe(false);
    chrono.ajuster(10000);
    chrono.ajuster(-10000);
    expect(chrono.restant()).toBe(0);
    expect(surFin).toHaveBeenCalledTimes(1);

    // En pause aussi
    const enPause = vi.fn();
    const autre = creerChrono({ duree: 10, surFin: enPause });
    autre.ajuster(-15000);
    expect(autre.restant()).toBe(0);
    expect(enPause).toHaveBeenCalledTimes(1);
  });

  it('formate le temps restant', () => {
    expect(formaterDuree(30000)).toBe('0:30');
    expect(formaterDuree(65000)).toBe('1:05');
    expect(formaterDuree(400)).toBe('0:01');
    expect(formaterDuree(0)).toBe('0:00');
  });
});

describe('paliers 5 4 3 2 1', () => {
  it('perd un point par palier écoulé', () => {
    expect(valeurPalier(0, 6000)).toBe(5);
    expect(valeurPalier(5999, 6000)).toBe(5);
    expect(valeurPalier(6000, 6000)).toBe(4);
    expect(valeurPalier(29999, 6000)).toBe(1);
    expect(valeurPalier(30000, 6000)).toBe(0);
  });

  it('prévient à chaque chiffre perdu, se fige au stop', () => {
    const valeurs = [];
    const surFin = vi.fn();
    const paliers = creerPaliers({
      dureePalier: 2,
      surChangement: (v) => valeurs.push(v),
      surFin,
    });
    paliers.demarrer();
    vi.advanceTimersByTime(2100);
    expect(paliers.valeur).toBe(4);
    paliers.pause();
    vi.advanceTimersByTime(10000);
    expect(paliers.valeur).toBe(4);
    paliers.reprendre();
    vi.advanceTimersByTime(8000);
    expect(valeurs).toEqual([4, 3, 2, 1, 0]);
    expect(surFin).toHaveBeenCalledTimes(1);
  });
});

describe('scores', () => {
  it('classe avec les ex æquo au même rang', () => {
    expect(
      classer([
        { prenom: 'A', points: 2 },
        { prenom: 'B', points: 5 },
        { prenom: 'C', points: 2 },
        { prenom: 'D', points: 0 },
      ]),
    ).toEqual([
      { prenom: 'B', points: 5, rang: 1 },
      { prenom: 'A', points: 2, rang: 2 },
      { prenom: 'C', points: 2, rang: 2 },
      { prenom: 'D', points: 0, rang: 4 },
    ]);
  });

  it('ajoute des points et prévient des changements', () => {
    const surChangement = vi.fn();
    const scores = creerScores(['Ana', 'Bob'], { surChangement });
    scores.ajouter('Bob', 3);
    scores.ajouter('Ana');
    expect(scores.valeur('Bob')).toBe(3);
    expect(scores.classement()[0].prenom).toBe('Bob');
    expect(surChangement).toHaveBeenCalledTimes(2);
    scores.reinitialiser();
    expect(scores.valeur('Bob')).toBe(0);
  });

  it('envoie chaque point au score du groupe', () => {
    const surAjout = vi.fn();
    const scores = creerScores(['Ana'], { surAjout });
    scores.ajouter('Ana', 2);
    scores.ajouter('Ana', -1);
    expect(surAjout.mock.calls).toEqual([
      [['Ana'], 2],
      [['Ana'], -1],
    ]);
  });

  it('donne les mêmes points à plusieurs personnes en un seul envoi et un seul dessin', () => {
    const surAjout = vi.fn();
    const surChangement = vi.fn();
    const scores = creerScores(['Ana', 'Bob', 'Chloé'], { surAjout, surChangement });
    scores.ajouterATous(['Ana', 'Chloé'], 2);
    expect([scores.valeur('Ana'), scores.valeur('Bob'), scores.valeur('Chloé')]).toEqual([2, 0, 2]);
    expect(surAjout.mock.calls).toEqual([[['Ana', 'Chloé'], 2]]);
    expect(surChangement).toHaveBeenCalledTimes(1);
    // Personne : rien à envoyer ni à redessiner
    scores.ajouterATous([], 1);
    expect(surChangement).toHaveBeenCalledTimes(1);
  });
});

describe('gagnants d’un point', () => {
  const groupe = ['Ana', 'Bob', 'Chloé', 'David', 'Emma'];

  it('nomme une, deux ou trois personnes, puis les compte', () => {
    expect(nommerGagnants(['Ana'], groupe)).toBe('Ana');
    expect(nommerGagnants(['Ana', 'Bob'], groupe)).toBe('Ana et Bob');
    expect(nommerGagnants(['Ana', 'Bob', 'Chloé'], groupe)).toBe('Ana, Bob et Chloé');
    expect(nommerGagnants(['Ana', 'Bob', 'Chloé', 'David'], groupe)).toBe('4 personnes');
    expect(nommerGagnants(['Ana', 'Bob', 'Chloé'], groupe, 2)).toBe('3 personnes');
    expect(nommerGagnants([], groupe)).toBe('');
  });

  it('dit « tout le monde » quand tous les joueurs marquent', () => {
    expect(nommerGagnants(groupe, groupe)).toBe('tout le monde');
    expect(nommerGagnants(['Ana', 'Bob'], ['Ana', 'Bob'])).toBe('tout le monde');
    // Seul joueur : son prénom
    expect(nommerGagnants(['Ana'], ['Ana'])).toBe('Ana');
  });
});
