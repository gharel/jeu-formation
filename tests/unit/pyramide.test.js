import { describe, it, expect } from 'vitest';
import {
  pointsPourIndice,
  nombreDeLettres,
  verifierIndice,
  validerMotPyramide,
} from '../../jeux/pyramide/logique.js';
import { schema, exemple } from '../../jeux/pyramide/exemple.js';
import { nettoyerContenu, validerContenu, elementVide } from '../../assets/js/commun/contenu.js';

describe('Pyramide', () => {
  it('donne 3, 2 ou 1 point selon le nombre d’indices', () => {
    expect([1, 2, 3].map(pointsPourIndice)).toEqual([3, 2, 1]);
    expect(pointsPourIndice(4)).toBe(0);
  });

  it('compte les lettres sans les espaces ni les tirets', () => {
    expect(nombreDeLettres('Mot de passe')).toBe(10);
    expect(nombreDeLettres('Wi-Fi')).toBe(4);
    expect(nombreDeLettres('Clé')).toBe(3);
  });

  it('exige un seul mot par indice', () => {
    expect(verifierIndice('Clic', 'Souris')).toBeNull();
    expect(verifierIndice('Sans-fil', 'Wi-Fi')).toBeNull();
    expect(verifierIndice('petit animal', 'Souris')).toBe('doit être un seul mot');
  });

  it('refuse un indice qui reprend le mot à deviner', () => {
    expect(verifierIndice('Souriceau', 'Souris')).toBeNull();
    expect(verifierIndice('Passe', 'Mot de passe')).toBe('ne doit pas reprendre le mot à deviner');
    expect(verifierIndice('Imprimantes', 'Imprimante')).toBe(
      'ne doit pas reprendre le mot à deviner',
    );
    expect(verifierIndice('CLOUD', 'cloud')).toBe('ne doit pas reprendre le mot à deviner');
    expect(validerMotPyramide({ mot: 'Souris', indices: ['Clic', 'deux mots', 'x'] })).toBe(
      'l’indice 2 (« deux mots ») doit être un seul mot.',
    );
  });

  it('a un exemple valide et propose toujours 3 indices', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(elementVide(schema).indices).toEqual(['', '', '']);
    const incomplet = nettoyerContenu(schema, { elements: [{ mot: 'Souris', indices: ['Clic'] }] });
    expect(validerContenu(schema, incomplet)[0]).toMatch(/il faut au moins 3/);
  });
});
