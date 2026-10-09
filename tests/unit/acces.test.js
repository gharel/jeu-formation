import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  calculerEmpreinte,
  motDePasseCorrect,
  estDeverrouille,
  verrouiller,
  lireEchecs,
  ajouterEchec,
  finBlocage,
  estBloque,
  messageBlocage,
  EMPREINTE,
  CLE_ECHECS,
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

describe('blocage après un mot de passe incorrect', () => {
  const MINUTE = 60_000;
  const HEURE = 60 * MINUTE;
  const JOUR = 24 * HEURE;
  // Jeudi 8 octobre 2026, 14 h 32 min 20 s (heure locale)
  const t0 = new Date(2026, 9, 8, 14, 32, 20).getTime();
  const apres = (n) => {
    let echecs = null;
    for (let i = 0; i < n; i += 1) echecs = ajouterEchec(echecs, t0);
    return echecs;
  };
  // Message avec des espaces ordinaires, plus lisible dans les attentes
  const message = (echecs, maintenant) =>
    messageBlocage(echecs, maintenant).replaceAll('\xa0', ' ');

  beforeEach(() => localStorage.clear());

  it('n’est pas bloqué sans échec', () => {
    expect(finBlocage(null)).toBe(0);
    expect(estBloque(null, t0)).toBe(false);
    expect(messageBlocage(null, t0)).toBe('');
  });

  it('bloque 5 minutes, 1 heure, 24 heures, 1 semaine, 1 mois, puis définitivement', () => {
    const durees = [5 * MINUTE, HEURE, JOUR, 7 * JOUR, 30 * JOUR];
    durees.forEach((duree, i) => {
      const echecs = apres(i + 1);
      expect(finBlocage(echecs)).toBe(t0 + duree);
      expect(estBloque(echecs, t0 + duree - 1)).toBe(true);
      expect(estBloque(echecs, t0 + duree)).toBe(false);
    });
    expect(finBlocage(apres(6))).toBe(Infinity);
    expect(estBloque(apres(6), t0 + 100 * 365 * JOUR)).toBe(true);
    expect(estBloque(apres(9), t0 + 100 * 365 * JOUR)).toBe(true);
  });

  it('compte les échecs à partir du précédent', () => {
    expect(ajouterEchec(null, t0)).toEqual({ nombre: 1, dernier: t0 });
    expect(ajouterEchec({ nombre: 2, dernier: t0 }, t0 + JOUR)).toEqual({
      nombre: 3,
      dernier: t0 + JOUR,
    });
  });

  it('dit jusqu’à quand, minute arrondie au-dessus', () => {
    expect(message(apres(1), t0)).toBe(
      'Mot de passe incorrect : accès bloqué 5 minutes, jusqu’à 14 h 38.',
    );
    expect(message(apres(2), t0)).toBe(
      'Mot de passe incorrect : accès bloqué 1 heure, jusqu’à 15 h 33.',
    );
    expect(message(apres(3), t0)).toBe(
      'Mot de passe incorrect : accès bloqué 24 heures, jusqu’au vendredi 9 octobre à 14 h 33.',
    );
    expect(message(apres(4), t0)).toBe(
      'Mot de passe incorrect : accès bloqué 1 semaine, jusqu’au jeudi 15 octobre à 14 h 33.',
    );
  });

  it('ne coupe pas l’heure en fin de ligne', () => {
    expect(messageBlocage(apres(1), t0)).toContain('jusqu’à\xa014\xa0h\xa038.');
  });

  it('prévient avant le blocage définitif', () => {
    expect(message(apres(5), t0)).toBe(
      'Mot de passe incorrect : accès bloqué 1 mois, jusqu’au samedi 7 novembre à 14 h 33. ' +
        'Au prochain échec, il sera bloqué définitivement.',
    );
    expect(message(apres(6), t0)).toBe(
      'Trop de mots de passe incorrects : l’accès est bloqué définitivement sur ce navigateur.',
    );
  });

  it('donne l’année quand le blocage finit l’année suivante', () => {
    const decembre = new Date(2026, 11, 20, 9, 0).getTime();
    expect(message({ nombre: 5, dernier: decembre }, decembre)).toMatch(
      /jusqu’au mardi 19 janvier 2027 à 9 h 00\./,
    );
  });

  it('n’a plus de message une fois le blocage fini', () => {
    expect(messageBlocage(apres(1), t0 + 5 * MINUTE)).toBe('');
  });

  it('ignore des échecs enregistrés invalides', () => {
    ecrire(CLE_ECHECS, { nombre: 2, dernier: t0 });
    expect(lireEchecs()).toEqual({ nombre: 2, dernier: t0 });
    for (const valeur of [
      true,
      { nombre: 0, dernier: t0 },
      { nombre: 1.5, dernier: t0 },
      { nombre: 1 },
    ]) {
      ecrire(CLE_ECHECS, valeur);
      expect(lireEchecs()).toBe(null);
    }
  });
});
