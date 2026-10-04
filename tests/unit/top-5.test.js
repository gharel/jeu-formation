import { describe, it, expect } from 'vitest';
import {
  NOMBRE_REPONSES,
  POINTS_PAR_QUESTION,
  pointsDuRang,
  reponseAffichee,
  validerQuestion,
  creerManche,
} from '../../jeux/top-5/logique.js';
import { schema, exemple } from '../../jeux/top-5/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';

const reseaux = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'X / Twitter'];

describe('Top 5', () => {
  it('donne 5 points à la réponse la plus attendue, 1 à la dernière', () => {
    expect(NOMBRE_REPONSES).toBe(5);
    expect([0, 1, 2, 3, 4].map(pointsDuRang)).toEqual([5, 4, 3, 2, 1]);
    expect(POINTS_PAR_QUESTION).toBe(15);
    expect(reponseAffichee('X / Twitter')).toBe('X');
  });

  it('retourne une réponse trouvée, même avec une variante ou une faute de frappe', () => {
    const manche = creerManche(reseaux);
    expect(manche.proposer('instagram')).toEqual({ resultat: 'trouvee', rang: 1 });
    expect(manche.proposer('Twitter')).toEqual({ resultat: 'trouvee', rang: 4 });
    expect(manche.proposer('Facebok')).toEqual({ resultat: 'trouvee', rang: 0 });
    expect(manche.points).toBe(5 + 4 + 1);
    expect(manche.estTrouvee(1)).toBe(true);
    expect(manche.estTrouvee(2)).toBe(false);
    // Déjà trouvée : ce n'est pas une erreur
    expect(manche.proposer('INSTAGRAM')).toEqual({ resultat: 'deja', rang: 1 });
    expect(manche.proposer('  ')).toEqual({ resultat: 'vide', rang: -1 });
    expect(manche.erreurs).toBe(0);
  });

  it('s’arrête au bout des erreurs permises', () => {
    const manche = creerManche(reseaux, { erreursMax: 2 });
    expect(manche.proposer('Snapchat')).toEqual({ resultat: 'erreur', rang: -1 });
    expect(manche.finie).toBe(false);
    expect(manche.compterErreur()).toEqual({ resultat: 'erreur', rang: -1 });
    expect(manche.finie).toBe(true);
    expect(manche.issue).toBe('erreurs');
    expect(manche.proposer('Facebook')).toBeNull();
    expect(manche.compterErreur()).toBeNull();
  });

  it('se termine quand les 5 réponses sont trouvées', () => {
    const manche = creerManche(reseaux);
    for (const r of ['facebook', 'instagram', 'tiktok', 'linkedin']) manche.proposer(r);
    expect(manche.finie).toBe(false);
    expect(manche.reveler(4)).toEqual({ resultat: 'trouvee', rang: 4 });
    expect(manche.issue).toBe('complet');
    expect(manche.points).toBe(15);
  });

  it('laisse l’animateur retourner une case à la main, ou tout dévoiler', () => {
    const manche = creerManche(reseaux);
    expect(manche.reveler(2)).toEqual({ resultat: 'trouvee', rang: 2 });
    expect(manche.reveler(2)).toBeNull();
    expect(manche.reveler(9)).toBeNull();
    expect(manche.abandonner()).toBe(true);
    expect(manche.issue).toBe('abandon');
    expect(manche.abandonner()).toBe(false);
    expect(manche.reveler(3)).toBeNull();
    expect(manche.points).toBe(3);
  });

  it('refuse deux réponses identiques dans une question', () => {
    expect(validerQuestion({ reponses: ['Chrome', 'Firefox', 'chrome ', 'Edge', 'Safari'] })).toBe(
      'deux réponses sont identiques.',
    );
    expect(validerQuestion({ reponses: reseaux })).toBeNull();
    expect(validerQuestion({ reponses: ['', '', '', '', ''] })).toBeNull();
  });

  it('a un exemple valide : 5 réponses par question', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, exemple)).toEqual(exemple);
    for (const element of exemple.elements) expect(element.reponses).toHaveLength(5);
  });

  it('exige exactement 5 réponses', () => {
    const contenu = nettoyerContenu(schema, {
      reglages: { erreursMax: 3 },
      elements: [{ question: 'Citez un réseau social.', reponses: ['Facebook', 'Instagram'] }],
    });
    expect(validerContenu(schema, contenu)).toEqual([
      'Question 1 : il faut au moins 5 « réponses ».',
    ]);
  });
});
