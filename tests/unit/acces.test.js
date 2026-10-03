import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  calculerEmpreinte,
  motDePasseCorrect,
  estDeverrouille,
  verrouiller,
  EMPREINTE,
} from '../../assets/js/commun/acces.js';
import { ecrire } from '../../assets/js/commun/stockage.js';

describe('accès par mot de passe', () => {
  beforeEach(() => localStorage.clear());

  it('calcule une empreinte PBKDF2-SHA-256 standard', async () => {
    // Vecteur de test connu : « password », sel « salt » (73616c74 en hexadécimal), 1 itération
    expect(await calculerEmpreinte('password', '73616c74', 1)).toBe(
      '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    );
  });

  it('refuse un mot de passe vide ou faux', async () => {
    expect(await motDePasseCorrect('')).toBe(false);
    expect(await motDePasseCorrect('motdepasse')).toBe(false);
  });

  it('ne garde dans le code que l’empreinte (64 caractères hexadécimaux)', () => {
    expect(EMPREINTE).toMatch(/^[0-9a-f]{64}$/);
    const source = readFileSync('assets/js/commun/acces.js', 'utf8');
    expect(source).toMatch(/ITERATIONS = 600_000/);
  });

  it('se souvient de l’accès ouvert, jusqu’à « Verrouiller »', () => {
    expect(estDeverrouille()).toBe(false);
    ecrire('acces', EMPREINTE);
    expect(estDeverrouille()).toBe(true);
    verrouiller();
    expect(estDeverrouille()).toBe(false);
  });

  it('n’accepte pas une autre valeur enregistrée', () => {
    ecrire('acces', true);
    expect(estDeverrouille()).toBe(false);
  });
});
