import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectionParDefaut,
  joueursDeLaPartie,
  basculerJoueur,
  tirerJoueurs,
  chargerTires,
  enregistrerTires,
} from '../../assets/js/commun/joueurs.js';
import {
  garderAbsents,
  estAbsent,
  basculerAbsent,
  presents,
  chargerAbsents,
  enregistrerAbsents,
} from '../../assets/js/commun/participants.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

const groupe = ['Ana', 'Bob', 'Chloé', 'David', 'Emma'];

beforeEach(() => localStorage.clear());

describe('absences du jour', () => {
  it('marque une absence, puis le retour de la personne', () => {
    let absents = basculerAbsent([], 'Bob');
    expect(absents).toEqual(['bob']);
    expect(estAbsent(absents, 'BOB')).toBe(true);
    expect(presents(groupe, absents)).toEqual(['Ana', 'Chloé', 'David', 'Emma']);
    absents = basculerAbsent(absents, 'bob');
    expect(absents).toEqual([]);
  });

  it('oublie les absences des personnes retirées du groupe', () => {
    expect(garderAbsents(['bob', 'zoé', 'Bob'], groupe)).toEqual(['bob']);
    enregistrerAbsents(['chloé', 'zoé']);
    expect(chargerAbsents(groupe)).toEqual(['chloé']);
    localStorage.setItem('skazy-jeux:absents', '"abîmé"');
    expect(chargerAbsents(groupe)).toEqual([]);
  });
});

describe('qui joue la partie', () => {
  it('par défaut, tout le groupe présent joue', () => {
    expect(selectionParDefaut()).toEqual({ mode: 'tous', choisis: [] });
    expect(joueursDeLaPartie(groupe, selectionParDefaut())).toEqual(groupe);
  });

  it('au clic : on décoche et on recoche, dans l’ordre du groupe', () => {
    let selection = basculerJoueur(groupe, selectionParDefaut(), 'Bob');
    expect(selection.mode).toBe('choix');
    expect(joueursDeLaPartie(groupe, selection)).toEqual(['Ana', 'Chloé', 'David', 'Emma']);
    selection = basculerJoueur(groupe, selection, 'Bob');
    expect(joueursDeLaPartie(groupe, selection)).toEqual(groupe);
  });

  it('une personne choisie puis absente ne joue pas', () => {
    const selection = { mode: 'choix', choisis: ['ana', 'bob'] };
    expect(joueursDeLaPartie(['Ana', 'Chloé'], selection)).toEqual(['Ana']);
  });

  it('au hasard : d’abord ceux qui n’ont pas encore été tirés', () => {
    const hasard = creerHasard(3);
    const premier = tirerJoueurs(groupe, 2, [], hasard);
    expect(premier.joueurs).toHaveLength(2);
    expect(premier.dejaTires).toHaveLength(2);
    const second = tirerJoueurs(groupe, 2, premier.dejaTires, hasard);
    expect(second.joueurs.some((j) => premier.joueurs.includes(j))).toBe(false);
    // Il ne reste qu'une personne pas encore tirée : elle passe, puis un nouveau tour commence
    const troisieme = tirerJoueurs(groupe, 2, second.dejaTires, hasard);
    const restante = groupe.find(
      (p) => !premier.joueurs.includes(p) && !second.joueurs.includes(p),
    );
    expect(troisieme.joueurs).toContain(restante);
    expect(troisieme.dejaTires).toHaveLength(1);
    expect(troisieme.dejaTires).not.toContain(restante.toLowerCase());
  });

  it('au hasard : jamais plus que le groupe, reproductible avec une graine', () => {
    expect(tirerJoueurs(groupe, 9).joueurs).toEqual(groupe);
    expect(tirerJoueurs(groupe, 0).joueurs).toEqual([]);
    const a = tirerJoueurs(groupe, 3, [], creerHasard(8));
    const b = tirerJoueurs(groupe, 3, [], creerHasard(8));
    expect(a).toEqual(b);
  });

  it('garde la mémoire des tirages d’un jeu à l’autre', () => {
    expect(chargerTires()).toEqual([]);
    enregistrerTires(['ana', 'bob']);
    expect(chargerTires()).toEqual(['ana', 'bob']);
  });
});
