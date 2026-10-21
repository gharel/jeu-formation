import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MODES,
  nettoyerMode,
  avecEquipes,
  equipesSuffisantes,
  modeDeLaPartie,
  equipeDuJoueur,
  ordreDePassage,
  nommerAvecEquipe,
  lireMode,
  ecrireMode,
} from '../../assets/js/commun/mode-jeu.js';
import { creerScores } from '../../assets/js/commun/scores.js';
import { completerEquipes, membresParmi } from '../../assets/js/commun/equipes.js';
import { effacer } from '../../assets/js/commun/stockage.js';

const bleus = { id: 'e1', nom: 'Les Bleus', membres: ['Ana', 'Bob'] };
const rouges = { id: 'e2', nom: 'Les Rouges', membres: ['Chloé', 'David', 'Eva'] };
const joueurs = ['Ana', 'Bob', 'Chloé', 'David', 'Eva'];

describe('mode de jeu', () => {
  beforeEach(() => effacer('mode-jeu'));

  it('propose trois modes et garde le choix pour la séance', () => {
    expect(MODES.map((m) => m.valeur)).toEqual(['individuel', 'equipes', 'mixte']);
    expect(nettoyerMode('nimporte')).toBe('individuel');
    expect(lireMode()).toBe('individuel');
    expect(lireMode('mixte')).toBe('mixte');
    ecrireMode('equipes');
    expect(lireMode()).toBe('equipes');
    expect(avecEquipes('equipes')).toBe(true);
    expect(avecEquipes('mixte')).toBe(true);
    expect(avecEquipes('individuel')).toBe(false);
  });

  it('joue chacun pour soi sans deux équipes en jeu', () => {
    expect(equipesSuffisantes([bleus])).toBe(false);
    expect(equipesSuffisantes([bleus, { ...rouges, membres: [] }])).toBe(false);
    expect(equipesSuffisantes([bleus, rouges])).toBe(true);
    expect(modeDeLaPartie('equipes', [bleus])).toBe('individuel');
    expect(modeDeLaPartie('mixte', [bleus, rouges])).toBe('mixte');
    expect(modeDeLaPartie('individuel', [bleus, rouges])).toBe('individuel');
  });

  it('trouve l’équipe d’un joueur et la nomme', () => {
    expect(equipeDuJoueur([bleus, rouges], 'Eva')).toBe(rouges);
    expect(equipeDuJoueur([bleus, rouges], 'Zoé')).toBeNull();
    expect(nommerAvecEquipe([bleus, rouges], 'Ana')).toBe('Ana (Les Bleus)');
    expect(nommerAvecEquipe([bleus], 'Zoé')).toBe('Zoé');
  });

  it('fait passer les équipes chacune leur tour, leurs membres à tour de rôle', () => {
    expect(ordreDePassage(joueurs, [bleus, rouges], 'individuel')).toEqual(joueurs);
    expect(ordreDePassage(joueurs, [bleus, rouges], 'equipes')).toEqual([
      'Ana',
      'Chloé',
      'Bob',
      'David',
      'Ana',
      'Eva',
    ]);
    // Un joueur sans équipe passe comme une équipe à lui seul
    expect(ordreDePassage([...joueurs, 'Zoé'], [bleus, rouges], 'mixte')).toEqual([
      'Ana',
      'Chloé',
      'Zoé',
      'Bob',
      'David',
      'Zoé',
      'Ana',
      'Eva',
      'Zoé',
    ]);
    // Une seule équipe : chacun pour soi
    expect(ordreDePassage(joueurs, [bleus], 'equipes')).toEqual(joueurs);
  });
});

describe('points selon le mode', () => {
  function scoresEn(mode) {
    const surAjout = vi.fn();
    const surAjoutEquipes = vi.fn();
    const scores = creerScores(joueurs, {
      equipes: [bleus, rouges],
      mode,
      surAjout,
      surAjoutEquipes,
    });
    return { scores, surAjout, surAjoutEquipes };
  }

  it('chacun pour soi : une équipe choisie compte comme ses membres, sans points d’équipe', () => {
    const { scores, surAjoutEquipes } = scoresEn('individuel');
    scores.ajouterGagnants({ prenoms: [], equipes: ['e1'] }, 2);
    expect(scores.valeur('Ana')).toBe(2);
    expect(scores.valeur('Bob')).toBe(2);
    expect(scores.classementEquipes()).toEqual([]);
    expect(surAjoutEquipes).not.toHaveBeenCalled();
  });

  it('par équipes : seule l’équipe marque, une fois par coup', () => {
    const { scores, surAjout, surAjoutEquipes } = scoresEn('equipes');
    // Le jeu donne le point à une personne : son équipe le reçoit
    scores.ajouter('Chloé', 1);
    expect(scores.valeurEquipe('e2')).toBe(1);
    expect(scores.valeur('Chloé')).toBe(0);
    // Deux membres d'une même équipe : l'équipe marque une seule fois
    scores.ajouterATous(['Ana', 'Bob', 'David'], 3);
    expect(scores.valeurEquipe('e1')).toBe(3);
    expect(scores.valeurEquipe('e2')).toBe(4);
    expect(surAjout).not.toHaveBeenCalled();
    expect(surAjoutEquipes).toHaveBeenLastCalledWith(['e1', 'e2'], 3);
    // Un joueur sans équipe ne fait marquer personne
    expect(scores.ajouter('Zoé', 1)).toBeNull();
  });

  it('équipes et joueurs : la personne et son équipe marquent', () => {
    const { scores, surAjout, surAjoutEquipes } = scoresEn('mixte');
    scores.ajouter('Eva', 2);
    expect(scores.valeur('Eva')).toBe(2);
    expect(scores.valeurEquipe('e2')).toBe(2);
    expect(surAjout).toHaveBeenCalledWith(['Eva'], 2);
    expect(surAjoutEquipes).toHaveBeenCalledWith(['e2'], 2);
    // « Tout le monde » : chaque équipe marque une fois
    scores.ajouterGagnants({ prenoms: joueurs, equipes: ['e1', 'e2'] }, 1);
    expect(scores.valeurEquipe('e1')).toBe(1);
    expect(scores.valeurEquipe('e2')).toBe(3);
    expect(scores.valeur('Ana')).toBe(1);
  });

  it('annule un coup une seule fois, aussi dans le score du groupe', () => {
    const { scores, surAjout, surAjoutEquipes } = scoresEn('mixte');
    const coup = scores.ajouterGagnants({ prenoms: ['Ana'], equipes: [] }, 3);
    expect(coup).toEqual({ prenoms: ['Ana'], equipes: ['e1'], n: 3 });
    expect(scores.annuler(coup)).toBe(true);
    expect(scores.valeur('Ana')).toBe(0);
    expect(scores.valeurEquipe('e1')).toBe(0);
    expect(surAjout).toHaveBeenLastCalledWith(['Ana'], -3);
    expect(surAjoutEquipes).toHaveBeenLastCalledWith(['e1'], -3);
    expect(scores.annuler(coup)).toBe(false);
    expect(scores.annuler(null)).toBe(false);
  });
});

describe('compléter les équipes', () => {
  it('place chaque joueur sans équipe dans la plus petite', () => {
    const equipes = [
      { id: 'e1', nom: 'Les Bleus', membres: ['ana', 'bob'] },
      { id: 'e2', nom: 'Les Rouges', membres: ['chloé'] },
    ];
    const completes = completerEquipes(equipes, ['Ana', 'Bob', 'Chloé', 'David', 'Eva']);
    expect(membresParmi(completes[1], ['Chloé', 'David', 'Eva'])).toEqual(['Chloé', 'David']);
    expect(membresParmi(completes[0], ['Ana', 'Bob', 'Eva'])).toEqual(['Ana', 'Bob', 'Eva']);
    expect(completerEquipes([], ['Ana'])).toEqual([]);
  });
});
