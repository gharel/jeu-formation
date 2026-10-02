import { describe, it, expect } from 'vitest';
import {
  dureeDepuisAmorce,
  formulerDefi,
  resoudreDefi,
  validerDefi,
  AMORCES,
} from '../../jeux/instant-defi/logique.js';
import { schema, exemple } from '../../jeux/instant-defi/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('Instant défi', () => {
  it.each([
    ['30 secondes pour trouver…', 30],
    ['45 s pour retrouver', 45],
    ['20sec pour expliquer', 20],
    ['1 minute pour montrer', 60],
    ['2 min pour créer', 120],
    ['1 min 30 pour ranger', 90],
    ['Pour trouver (sans durée)', 30],
    ['2 souris pour 1 minute', 60],
  ])('lit la durée dans « %s »', (texte, duree) => {
    expect(dureeDepuisAmorce(texte)).toBe(duree);
  });

  it('assemble le début et la fin sans points de suspension en double', () => {
    expect(formulerDefi('30 secondes pour trouver…', '… le menu Fichier')).toBe(
      '30 secondes pour trouver le menu Fichier',
    );
    expect(formulerDefi('20 s pour expliquer...', '...le cloud')).toBe(
      '20 s pour expliquer le cloud',
    );
    expect(formulerDefi('1 minute pour montrer', 'un raccourci')).toBe(
      '1 minute pour montrer un raccourci',
    );
  });

  it('résout le début choisi, personnalisé ou surprise', () => {
    expect(resoudreDefi({ amorce: 'montrer60', fin: 'un dossier' })).toEqual({
      texte: '1 minute pour montrer à tout le monde un dossier',
      duree: 60,
    });
    expect(
      resoudreDefi({ amorce: 'perso', amorcePerso: '90 secondes pour ranger…', fin: 'le bureau' }),
    ).toEqual({ texte: '90 secondes pour ranger le bureau', duree: 90 });
    const surprise = resoudreDefi({ amorce: 'surprise', fin: 'la corbeille' }, creerHasard(4));
    expect(AMORCES.some((a) => surprise.texte.startsWith(a.texte.replace('…', '')))).toBe(true);
  });

  it('exige un début personnalisé quand « Autre » est choisi', () => {
    expect(validerDefi({ amorce: 'perso', amorcePerso: ' ' })).toMatch(/écrivez le début/);
    expect(validerDefi({ amorce: 'trouver30' })).toBeNull();
  });

  it('a un exemple valide', () => {
    const contenu = nettoyerContenu(schema, exemple);
    expect(validerContenu(schema, contenu)).toEqual([]);
    expect(contenu.elements.length).toBeGreaterThanOrEqual(2);
  });
});
