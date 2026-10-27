import { describe, it, expect } from 'vitest';
import {
  INDICES_MAX,
  pointsPourIndices,
  creerMot,
  roles,
  nombreDeBinomes,
  planDeLaPartie,
} from '../../jeux/pyramide/logique.js';
import { schema, exemple } from '../../jeux/pyramide/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';
import { tirerDansLePlan } from '../../assets/js/commun/passages.js';

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
      reglages: { motsParBinome: 2, tempsManche: 45 },
      elements: [{ mot: 'Souris' }],
    });
  });
});

describe('Pyramide : le mot se recache en cours de jeu', () => {
  it('recache puis réaffiche le mot sans changer d’indice ni de points', () => {
    const mot = creerMot();
    expect(mot.cacher()).toBe(false);
    expect(mot.reafficher()).toBe(false);
    mot.afficher();
    mot.rater();
    expect(mot.indice).toBe(2);
    expect(mot.cacher()).toBe(true);
    expect(mot.masque).toBe(true);
    expect(mot.phase).toBe('jeu');
    expect(mot.indice).toBe(2);
    expect(mot.points).toBe(3);
    // Déjà caché : rien à faire de plus
    expect(mot.cacher()).toBe(false);
    expect(mot.reafficher()).toBe(true);
    expect(mot.masque).toBe(false);
    expect(mot.indice).toBe(2);
    expect(mot.points).toBe(3);
    expect(mot.reafficher()).toBe(false);
  });

  it('refuse de valider, rater ou signaler une faute tant que le mot est caché', () => {
    const mot = creerMot();
    mot.afficher();
    mot.cacher();
    expect(mot.trouver()).toBeNull();
    expect(mot.rater()).toBeNull();
    expect(mot.faute()).toBe(false);
    expect(mot.phase).toBe('jeu');
    expect(mot.indice).toBe(1);
    mot.reafficher();
    expect(mot.trouver()).toBe(4);
    expect(mot.cacher()).toBe(false);
  });

  it('perd quand même le mot si le temps est écoulé alors qu’il est caché', () => {
    const mot = creerMot();
    mot.afficher();
    mot.cacher();
    expect(mot.abandonner()).toBe(true);
    expect(mot.issue).toBe('temps');
    expect(mot.masque).toBe(false);
    expect(mot.cacher()).toBe(false);
  });

  it('ne se cache pas avant d’être affiché', () => {
    const mot = creerMot();
    expect(mot.cacher()).toBe(false);
    expect(mot.masque).toBe(false);
    expect(mot.phase).toBe('cache');
  });
});

describe('Pyramide : plan des binômes', () => {
  const bleus = { id: 'e1', nom: 'Les Bleus', membres: ['Ana', 'Bob'] };
  const rouges = { id: 'e2', nom: 'Les Rouges', membres: ['Chloé', 'David', 'Eva'] };
  const seul = { id: 'e3', nom: 'Seul', membres: ['Zoé'] };

  it('compte les binômes : le dernier peut n’avoir qu’un mot', () => {
    expect(nombreDeBinomes(6, 2)).toBe(3);
    expect(nombreDeBinomes(7, 2)).toBe(4);
    expect(nombreDeBinomes(5, 1)).toBe(5);
    expect(nombreDeBinomes(5, 0)).toBe(5);
  });

  it('prévoit un binôme par tour, chacun passe autant de fois', () => {
    const participants = ['Ana', 'Bob', 'Chloé'];
    const plan = planDeLaPartie({
      participants,
      mots: 6,
      motsParBinome: 2,
      hasard: creerHasard(3),
    });
    expect(plan).toHaveLength(3);
    for (const { equipe } of plan) expect(equipe).toBeNull();
    const passages = plan.flatMap(({ binome }) => binome);
    for (const p of participants) expect(passages.filter((x) => x === p)).toHaveLength(2);
  });

  it('ne prévoit rien avec moins de deux participants', () => {
    const base = { mots: 4, motsParBinome: 2, hasard: creerHasard(1) };
    expect(planDeLaPartie({ ...base, participants: ['Ana'] })).toEqual([]);
    expect(planDeLaPartie({ ...base, participants: [] })).toEqual([]);
  });

  it('en équipes : les équipes d’au moins deux joueurs jouent chacune leur tour', () => {
    const plan = planDeLaPartie({
      participants: ['Ana', 'Bob', 'Chloé', 'David', 'Eva', 'Zoé'],
      equipes: [bleus, seul, rouges],
      mots: 8,
      motsParBinome: 2,
      hasard: creerHasard(2),
    });
    expect(plan.map((p) => p.equipe.id)).toEqual(['e1', 'e2', 'e1', 'e2']);
    for (const { equipe, binome } of plan) {
      for (const prenom of binome) expect(equipe.membres).toContain(prenom);
    }
  });

  it('une seule équipe jouable joue tous les binômes ; sans équipe jouable, tout le monde joue', () => {
    const base = { participants: ['Ana', 'Bob', 'Zoé'], mots: 4, motsParBinome: 2 };
    const une = planDeLaPartie({ ...base, equipes: [bleus, seul], hasard: creerHasard(1) });
    expect(une.map((p) => p.equipe.id)).toEqual(['e1', 'e1']);
    const aucune = planDeLaPartie({ ...base, equipes: [seul], hasard: creerHasard(1) });
    expect(aucune).toHaveLength(2);
    expect(aucune.every((p) => p.equipe === null)).toBe(true);
  });

  it('« Tirer au sort » échange le binôme prévu avec un binôme qui reste à jouer', () => {
    const plan = [
      { equipe: null, binome: ['A', 'B'] },
      { equipe: null, binome: ['C', 'D'] },
      { equipe: null, binome: ['E', 'F'] },
    ];
    const avant = plan.map((p) => p.binome.join(''));
    for (let graine = 1; graine <= 20; graine++) {
      const copie = structuredClone(plan);
      tirerDansLePlan(copie, 1, creerHasard(graine));
      // Rien avant la position ; le plan garde les mêmes binômes
      expect(copie[0].binome).toEqual(['A', 'B']);
      expect(copie.map((p) => p.binome.join('')).sort()).toEqual([...avant].sort());
    }
  });

  it('« Tirer au sort » reste dans la même équipe', () => {
    const plan = [
      { equipe: bleus, binome: ['Ana', 'Bob'] },
      { equipe: rouges, binome: ['Chloé', 'David'] },
      { equipe: bleus, binome: ['Bob', 'Ana'] },
      { equipe: rouges, binome: ['David', 'Eva'] },
    ];
    for (let graine = 1; graine <= 20; graine++) {
      const copie = structuredClone(plan);
      tirerDansLePlan(copie, 1, creerHasard(graine));
      for (const { equipe, binome } of copie) {
        for (const prenom of binome) expect(equipe.membres).toContain(prenom);
      }
    }
    expect(tirerDansLePlan([], 0, creerHasard(1))).toEqual([]);
  });
});

describe('Pyramide, temps écoulé', () => {
  it('perd le mot quand le temps est écoulé', () => {
    const mot = creerMot();
    expect(mot.abandonner()).toBe(false);
    mot.afficher();
    expect(mot.abandonner()).toBe(true);
    expect(mot.issue).toBe('temps');
    expect(mot.points).toBe(0);
  });
});
