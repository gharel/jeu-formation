import { describe, it, expect } from 'vitest';
import {
  normaliserMot,
  validerMotSecret,
  verifierProposition,
  evaluer,
  estTrouve,
  etatClavier,
  lettresConnues,
} from '../../jeux/motus/logique.js';
import { schema, exemple } from '../../jeux/motus/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';

describe('Motus : préparation', () => {
  it('normalise les mots (accents, ligatures, majuscules)', () => {
    expect(normaliserMot('réseau')).toBe('RESEAU');
    expect(normaliserMot('Cœur')).toBe('COEUR');
    expect(normaliserMot(' mot-de passe ')).toBe('MOTDEPASSE');
  });

  it('refuse les mots trop courts, trop longs ou avec des chiffres', () => {
    expect(validerMotSecret('clavier')).toBeNull();
    expect(validerMotSecret('')).toBeNull();
    expect(validerMotSecret('web')).toMatch(/entre 4 et 10 lettres/);
    expect(validerMotSecret('anticonstitution')).toMatch(/entre 4 et 10 lettres/);
    expect(validerMotSecret('web2')).toMatch(/que des lettres/);
  });

  it('a un exemple valide de 5 mots', () => {
    const contenu = nettoyerContenu(schema, exemple);
    expect(contenu.elements).toHaveLength(5);
    expect(validerContenu(schema, contenu)).toEqual([]);
  });

  it('exige exactement 5 mots', () => {
    const contenu = nettoyerContenu(schema, { elements: exemple.elements.slice(0, 3) });
    expect(validerContenu(schema, contenu)[0]).toMatch(/exactement 5 mots/);
  });
});

describe('Motus : propositions', () => {
  it('vérifie la longueur et la première lettre', () => {
    expect(verifierProposition('CLAVIER', 'CLAVIER')).toBeNull();
    expect(verifierProposition('CLAVIER', 'CLAVIERS')).toMatch(/7 lettres/);
    expect(verifierProposition('CLAVIER', 'PLAVIER')).toMatch(/commencer par C/);
  });

  it('colore bien, mal et absent', () => {
    expect(evaluer('PIXEL', 'PELLE')).toEqual(['bien', 'mal', 'mal', 'absent', 'absent']);
    expect(estTrouve(evaluer('PIXEL', 'PIXEL'))).toBe(true);
  });

  it('gère les lettres en double', () => {
    // un seul E dans le mot, mal placé : seul le premier E proposé est signalé
    expect(evaluer('PIXEL', 'PEEPE')).toEqual(['bien', 'mal', 'absent', 'absent', 'absent']);
    // un seul E, déjà bien placé : les autres E sont absents
    expect(evaluer('CLAVIER', 'CEEEEEE')).toEqual([
      'bien',
      'absent',
      'absent',
      'absent',
      'absent',
      'bien',
      'absent',
    ]);
    // deux L dans le mot
    expect(evaluer('LILLE', 'LALLA')).toEqual(['bien', 'absent', 'bien', 'bien', 'absent']);
    expect(evaluer('ALLER', 'ALORS')).toEqual(['bien', 'bien', 'absent', 'mal', 'absent']);
  });

  it('garde le meilleur état de chaque lettre pour le clavier', () => {
    const essais = [
      { mot: 'PELLE', evaluation: evaluer('PIXEL', 'PELLE') },
      { mot: 'PIXEL', evaluation: evaluer('PIXEL', 'PIXEL') },
    ];
    const etats = etatClavier(essais);
    expect(etats.get('E')).toBe('bien');
    expect(etats.get('L')).toBe('bien');
    expect(etats.get('P')).toBe('bien');
  });

  it('retient les lettres bien placées pour aider la ligne suivante', () => {
    expect(lettresConnues('CLAVIER', [])).toEqual(['C', null, null, null, null, null, null]);
    const essais = [{ mot: 'CLOVIER', evaluation: evaluer('CLAVIER', 'CLOVIER') }];
    expect(lettresConnues('CLAVIER', essais)).toEqual(['C', 'L', null, 'V', 'I', 'E', 'R']);
  });
});
