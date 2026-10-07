import { describe, it, expect } from 'vitest';
import {
  decouper,
  motsDeCases,
  validerMot,
  etatInitial,
  jouerLettre,
  proposerMot,
  estDecouvert,
  batterieVide,
} from '../../jeux/batterie-faible/logique.js';
import { schema, exemple } from '../../jeux/batterie-faible/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';

describe('Batterie faible', () => {
  it('découpe le mot : lettres à deviner, le reste visible', () => {
    expect(decouper(' Clé  USB ')).toEqual([
      { lettre: 'C', affichage: 'C' },
      { lettre: 'L', affichage: 'L' },
      { lettre: 'E', affichage: 'É' },
      { lettre: null, affichage: ' ' },
      { lettre: 'U', affichage: 'U' },
      { lettre: 'S', affichage: 'S' },
      { lettre: 'B', affichage: 'B' },
    ]);
    expect(decouper('cœur').map((c) => c.lettre)).toEqual(['C', 'O', 'E', 'U', 'R']);
    expect(decouper('e-mail').map((c) => c.lettre)).toEqual(['E', null, 'M', 'A', 'I', 'L']);
  });

  it('regroupe les cases par mot, pour ne passer à la ligne qu’entre deux mots', () => {
    expect(motsDeCases(decouper('Clé USB'))).toEqual([
      [0, 1, 2],
      [4, 5, 6],
    ]);
    // Le tiret et l'apostrophe restent dans leur mot
    expect(motsDeCases(decouper('Wi-Fi'))).toEqual([[0, 1, 2, 3, 4]]);
    expect(motsDeCases(decouper('Mot de passe')).map((m) => m.length)).toEqual([3, 2, 5]);
  });

  it('vérifie les mots préparés', () => {
    expect(validerMot('Pièce jointe')).toBeNull();
    expect(validerMot('aujourd’hui')).toBeNull();
    expect(validerMot('5G')).toMatch(/au moins 3 lettres/);
    expect(validerMot('www.site.fr')).toMatch(/seulement des lettres/);
    expect(validerMot('')).toBeNull();
  });

  it('joue les lettres : bonnes, mauvaises, déjà proposées, accents', () => {
    const cases = decouper('Pièce');
    let r = jouerLettre(cases, etatInitial(), 'e');
    expect(r).toMatchObject({ resultat: 'bonne', occurrences: 2, lettre: 'E' });
    r = jouerLettre(cases, r.etat, 'É');
    expect(r.resultat).toBe('deja');
    r = jouerLettre(cases, r.etat, 'z');
    expect(r.resultat).toBe('mauvaise');
    expect(r.etat).toEqual({ proposees: ['E', 'Z'], erreurs: 1 });
    expect(jouerLettre(cases, r.etat, '3').resultat).toBe('invalide');
  });

  it('découvre le mot lettre par lettre ou d’un coup', () => {
    const cases = decouper('Wi-Fi');
    let etat = etatInitial();
    for (const l of ['W', 'I']) etat = jouerLettre(cases, etat, l).etat;
    expect(estDecouvert(cases, etat)).toBe(false);
    etat = jouerLettre(cases, etat, 'F').etat;
    expect(estDecouvert(cases, etat)).toBe(true);

    const motDePasse = decouper('Mot de passe');
    const faux = proposerMot(motDePasse, etatInitial(), 'mot de pass');
    expect(faux).toEqual({ etat: { proposees: [], erreurs: 1 }, juste: false });
    const juste = proposerMot(motDePasse, faux.etat, 'MOT-DE-PASSE');
    expect(juste.juste).toBe(true);
    expect(estDecouvert(motDePasse, juste.etat)).toBe(true);
  });

  it('vide la batterie cran par cran', () => {
    expect(batterieVide({ proposees: [], erreurs: 6 }, 7)).toBe(false);
    expect(batterieVide({ proposees: [], erreurs: 7 }, 7)).toBe(true);
  });

  it('a un exemple valide, 7 crans par défaut', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, {}).reglages.crans).toBe(7);
  });
});
