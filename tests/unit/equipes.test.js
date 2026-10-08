import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NOMBRE_EQUIPES_MAX,
  normaliserEquipes,
  equipeDe,
  membresParmi,
  sansEquipe,
  ajouterEquipe,
  retirerEquipe,
  renommerEquipe,
  placerDansEquipe,
  repartirAuHasard,
  classementEquipes,
} from '../../assets/js/commun/equipes.js';
import { creerGroupe } from '../../assets/js/commun/groupe.js';
import { creerScores } from '../../assets/js/commun/scores.js';
import { nommerGagnants, decrireGagnants } from '../../assets/js/commun/points.js';
import {
  FORMAT_GROUPE,
  preparerExportGroupe,
  lireImportGroupe,
} from '../../assets/js/commun/fichier-groupe.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';
import { lire } from '../../assets/js/commun/stockage.js';

const groupe4 = ['Ana', 'Bob', 'Chloé', 'David'];
const bleusRouges = [
  { id: 'e1', nom: 'Les Bleus', membres: ['ana', 'bob'] },
  { id: 'e2', nom: 'Les Rouges', membres: ['chloé', 'david'] },
];

beforeEach(() => localStorage.clear());

describe('équipes : fonctions pures', () => {
  it('nettoie les équipes : identifiant, nom par défaut, membres connus et sans doublon', () => {
    expect(
      normaliserEquipes(
        [
          { id: 'e1', nom: '  Les   Bleus ', membres: ['Ana', 'bob', 'Zoé', 42] },
          { nom: '', membres: ['ANA', 'Chloé'] },
          { id: 'e1', nom: 'Doublon', membres: [] },
          'pas une équipe',
        ],
        groupe4,
      ),
    ).toEqual([
      { id: 'e1', nom: 'Les Bleus', membres: ['ana', 'bob'] },
      // Ana est déjà chez les Bleus : elle n'y est qu'une fois
      { id: 'e2', nom: 'Équipe 2', membres: ['chloé'] },
      { id: 'e3', nom: 'Doublon', membres: [] },
    ]);
    expect(normaliserEquipes('nimporte', groupe4)).toEqual([]);
    const trop = Array.from({ length: 12 }, (_, i) => ({ nom: `É${i}` }));
    expect(normaliserEquipes(trop, groupe4)).toHaveLength(NOMBRE_EQUIPES_MAX);
  });

  it('retrouve l’équipe d’une personne et les membres qui jouent', () => {
    expect(equipeDe(bleusRouges, 'BOB')?.nom).toBe('Les Bleus');
    expect(equipeDe(bleusRouges, 'Emma')).toBeNull();
    expect(membresParmi(bleusRouges[1], ['Ana', 'David', 'Chloé'])).toEqual(['David', 'Chloé']);
    expect(sansEquipe(bleusRouges, ['Ana', 'Emma', 'Félix'])).toEqual(['Emma', 'Félix']);
  });

  it('ajoute, renomme, retire une équipe et change quelqu’un d’équipe', () => {
    let equipes = ajouterEquipe(bleusRouges);
    expect(equipes[2]).toEqual({ id: 'e3', nom: 'Équipe 3', membres: [] });
    equipes = renommerEquipe(equipes, 'e3', '  Les Verts ');
    expect(equipes[2].nom).toBe('Les Verts');
    expect(renommerEquipe(equipes, 'e3', '   ')[2].nom).toBe('Les Verts');
    equipes = placerDansEquipe(equipes, 'Ana', 'e3');
    expect(equipes.map((e) => e.membres)).toEqual([['bob'], ['chloé', 'david'], ['ana']]);
    equipes = placerDansEquipe(equipes, 'Bob', null);
    expect(equipeDe(equipes, 'Bob')).toBeNull();
    equipes = retirerEquipe(equipes, 'e1');
    expect(equipes.map((e) => e.id)).toEqual(['e2', 'e3']);
    // Le nom libre suivant ne reprend pas un nom déjà pris
    expect(ajouterEquipe([{ id: 'e1', nom: 'Équipe 2', membres: [] }])[1].nom).toBe('Équipe 3');
  });

  it('répartit au hasard en équipes de même taille, à une personne près', () => {
    const prenoms = ['Ana', 'Bob', 'Chloé', 'David', 'Emma'];
    const equipes = repartirAuHasard([], prenoms, 2, creerHasard(1));
    expect(equipes.map((e) => e.nom)).toEqual(['Équipe 1', 'Équipe 2']);
    expect(equipes.map((e) => e.membres.length)).toEqual([3, 2]);
    expect(equipes.flatMap((e) => e.membres).sort()).toEqual(
      ['ana', 'bob', 'chloé', 'david', 'emma'].sort(),
    );
    // Même graine, même tirage ; les équipes gardent leur nom et leur identifiant
    expect(repartirAuHasard([], prenoms, 2, creerHasard(1))).toEqual(equipes);
    const trois = repartirAuHasard(bleusRouges, prenoms, 3, creerHasard(2));
    expect(trois.map((e) => [e.id, e.nom])).toEqual([
      ['e1', 'Les Bleus'],
      ['e2', 'Les Rouges'],
      ['e3', 'Équipe 3'],
    ]);
    expect(repartirAuHasard(bleusRouges, prenoms, 1, creerHasard(2))).toHaveLength(1);
  });

  it('classe les équipes, ex æquo au même rang', () => {
    const scores = { e2: { motus: 3 }, e3: { bingo: 3 } };
    const equipes = [...bleusRouges, { id: 'e3', nom: 'Les Verts', membres: [] }];
    expect(classementEquipes(scores, equipes)).toEqual([
      { id: 'e2', nom: 'Les Rouges', points: 3, rang: 1 },
      { id: 'e3', nom: 'Les Verts', points: 3, rang: 1 },
      { id: 'e1', nom: 'Les Bleus', points: 0, rang: 3 },
    ]);
  });
});

describe('équipes : état partagé (groupe.js)', () => {
  it('garde les équipes cohérentes avec la liste, et leurs points d’un jeu à l’autre', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(groupe4);
    groupe.changerEquipes(bleusRouges);
    groupe.ajouterPointsEquipes(['e1'], 'motus', 2);
    creerGroupe().ajouterPointsEquipes(['e1', 'e2', 'e9'], 'bingo', 1);
    groupe.rechargerScores();
    expect(groupe.scoresEquipes).toEqual({ e1: { motus: 2, bingo: 1 }, e2: { bingo: 1 } });

    // Une personne retirée quitte son équipe ; une équipe retirée perd ses points
    groupe.changerParticipants(['Ana', 'Chloé', 'David']);
    expect(groupe.equipes[0].membres).toEqual(['ana']);
    groupe.changerEquipes([bleusRouges[1]]);
    expect(groupe.scoresEquipes).toEqual({ e2: { bingo: 1 } });
    expect(lire('scores-equipes')).toEqual({ e2: { bingo: 1 } });

    groupe.fixerTotalEquipe('e2', 5);
    expect(creerGroupe().scoresEquipes).toEqual({ e2: { bingo: 1, correction: 4 } });
    groupe.reinitialiserScores();
    expect(creerGroupe().scoresEquipes).toEqual({});
    expect(creerGroupe().equipeDe('David')?.nom).toBe('Les Rouges');
  });

  it('un groupe remplacé (fichier importé) prend ses équipes', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Zoé']);
    groupe.changerEquipes([{ id: 'e1', nom: 'Seule', membres: ['zoé'] }]);
    groupe.remplacer({
      participants: groupe4,
      equipes: bleusRouges,
      scoresEquipes: { e2: { motus: 1 }, e7: { motus: 4 } },
    });
    expect(groupe.equipes).toEqual(bleusRouges);
    expect(groupe.scoresEquipes).toEqual({ e2: { motus: 1 } });
    groupe.remplacer({ participants: groupe4 });
    expect(groupe.equipes).toEqual([]);
  });
});

describe('équipes en partie', () => {
  it('compte les points de chaque équipe à part, une seule fois par attribution', () => {
    const surAjout = vi.fn();
    const surAjoutEquipes = vi.fn();
    const surChangement = vi.fn();
    const scores = creerScores(groupe4, {
      equipes: [
        { id: 'e1', nom: 'Les Bleus' },
        { id: 'e2', nom: 'Les Rouges' },
      ],
      surAjout,
      surAjoutEquipes,
      surChangement,
    });
    scores.ajouterGagnants({ prenoms: ['Ana', 'Bob'], equipes: ['e1', 'e9'] }, 3);
    expect(scores.valeurEquipe('e1')).toBe(3);
    expect(scores.valeurEquipe('e2')).toBe(0);
    expect(scores.valeur('Ana')).toBe(3);
    expect(surAjout).toHaveBeenCalledWith(['Ana', 'Bob'], 3);
    expect(surAjoutEquipes).toHaveBeenCalledWith(['e1'], 3);
    expect(surChangement).toHaveBeenCalledTimes(1);
    // Des points sans équipe : les équipes n'en reçoivent pas
    scores.ajouterATous(['Chloé'], 1);
    expect(surAjoutEquipes).toHaveBeenCalledTimes(1);
    expect(scores.classementEquipes()).toEqual([
      { id: 'e1', nom: 'Les Bleus', points: 3, rang: 1 },
      { id: 'e2', nom: 'Les Rouges', points: 0, rang: 2 },
    ]);
    scores.ajouterGagnants({ prenoms: [], equipes: [] }, 1);
    expect(surChangement).toHaveBeenCalledTimes(2);
    scores.reinitialiser();
    expect(scores.valeurEquipe('e1')).toBe(0);
  });

  it('nomme les équipes gagnantes à la place de leurs membres', () => {
    const bleus = { nom: 'Les Bleus', membres: ['Ana', 'Bob'] };
    const rouges = { nom: 'Les Rouges', membres: ['Chloé', 'David'] };
    expect(nommerGagnants(['Ana', 'Bob'], groupe4, 3, [bleus])).toBe('Les Bleus');
    expect(nommerGagnants(['Ana', 'Bob', 'Chloé'], groupe4, 3, [bleus])).toBe('Les Bleus et Chloé');
    expect(nommerGagnants(groupe4, groupe4, 3, [bleus, rouges])).toBe('Les Bleus et Les Rouges');
    expect(nommerGagnants(groupe4, groupe4, 1, [bleus, rouges])).toBe('tout le monde');
    const ctx = { participants: groupe4, equipes: [{ id: 'e1', ...bleus }] };
    expect(decrireGagnants(ctx, { prenoms: ['Ana', 'Bob'], equipes: ['e1'] })).toBe('Les Bleus');
    expect(decrireGagnants(ctx, { prenoms: ['Ana', 'Bob'], equipes: [] })).toBe('Ana et Bob');
  });
});

describe('équipes dans le fichier du groupe', () => {
  const groupe = {
    nom: '',
    participants: groupe4,
    infos: {},
    absents: [],
    plan: { disposition: 'u', nombre: null, parIlot: 4, places: {} },
    equipes: bleusRouges,
    scoresEquipes: { e2: { motus: 3 } },
  };

  it('écrit les équipes avec les prénoms de leurs membres et leurs points', () => {
    const fichier = preparerExportGroupe(groupe);
    expect(fichier.format).toBe(FORMAT_GROUPE);
    expect(fichier.groupe.equipes).toEqual([
      { nom: 'Les Bleus', membres: ['Ana', 'Bob'] },
      { nom: 'Les Rouges', membres: ['Chloé', 'David'], points: { motus: 3 } },
    ]);
    // Sans équipe, le fichier n'en parle pas
    expect(preparerExportGroupe({ ...groupe, equipes: [] }).groupe).not.toHaveProperty('equipes');
  });

  it('relit les équipes, et signale un membre inconnu ou cité deux fois', () => {
    const lu = lireImportGroupe(
      JSON.stringify({
        participants: ['Ana', 'Bob', 'Chloé'],
        equipes: [
          { nom: 'Les Bleus', membres: ['ana', 'Zoé'], points: 4 },
          { nom: 'Les Rouges', membres: ['Chloé', 'Ana'], points: { motus: 2 } },
          'rien',
        ],
      }),
    );
    expect(lu.equipes).toEqual([
      { id: 'e1', nom: 'Les Bleus', membres: ['ana'] },
      { id: 'e2', nom: 'Les Rouges', membres: ['chloé'] },
    ]);
    expect(lu.scoresEquipes).toEqual({ e1: { correction: 4 }, e2: { motus: 2 } });
    expect(lu.avertissements).toEqual([
      '« Zoé », dans Les Bleus, n’est pas dans le groupe : ce nom est ignoré.',
      'Ana est déjà dans Les Bleus : pas aussi dans Les Rouges.',
    ]);
    expect(
      lireImportGroupe(JSON.stringify({ participants: ['Ana'], equipes: 'non' })).avertissements,
    ).toEqual(['Équipes ignorées : une liste d’équipes est attendue.']);
  });
});
