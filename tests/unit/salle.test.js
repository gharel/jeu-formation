import { describe, it, expect, beforeEach } from 'vitest';
import {
  DISPOSITIONS,
  LARGEUR,
  HAUTEUR,
  HAUT_SALLE,
  PLACES_MAX,
  taillePourGroupe,
  nombreDePlaces,
  dessinerSalle,
  planVide,
  normaliserPlan,
  nettoyerPlan,
  occupant,
  placeDe,
  placer,
  liberer,
  echanger,
  nonPlaces,
  placerDansLOrdre,
  melanger,
  vider,
  libellePlace,
  charger,
  enregistrer,
} from '../../assets/js/commun/salle.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

const prenoms = (n) => Array.from({ length: n }, (_, i) => `P${i + 1}`);
const plan = (disposition, nombre = null, extra = {}) => ({
  ...planVide(),
  disposition,
  nombre,
  ...extra,
});

describe('plan de salle : dispositions', () => {
  for (const { valeur } of DISPOSITIONS) {
    for (const n of [1, 2, 3, 5, 8, 12, 13, 20, 30]) {
      it(`${valeur} avec ${n} places : toutes dans la salle, sans chevauchement`, () => {
        const extra = valeur === 'ilots' ? { parIlot: n % 3 === 0 ? 6 : 4 } : {};
        const { places, taille, tables } = dessinerSalle(plan(valeur, n, extra), []);
        expect(places).toHaveLength(n);
        expect(places.map((p) => p.id)).toEqual(prenoms(n).map((_, i) => `p${i + 1}`));
        expect(taille.l).toBeGreaterThan(2);
        expect(taille.h).toBeGreaterThan(2);
        expect(tables.length).toBeGreaterThan(0);
        for (const p of places) {
          expect(p.x - taille.l / 2).toBeGreaterThanOrEqual(0);
          expect(p.x + taille.l / 2).toBeLessThanOrEqual(LARGEUR);
          expect(p.y - taille.h / 2).toBeGreaterThanOrEqual(HAUT_SALLE);
          expect(p.y + taille.h / 2).toBeLessThanOrEqual(HAUTEUR);
        }
        for (let i = 0; i < places.length; i++) {
          for (let j = i + 1; j < places.length; j++) {
            const a = places[i];
            const b = places[j];
            const separees =
              Math.abs(a.x - b.x) >= taille.l - 0.01 || Math.abs(a.y - b.y) >= taille.h - 0.01;
            expect(separees, `${a.id} et ${b.id}`).toBe(true);
          }
        }
      });
    }
  }

  it('laisse le même écart entre l’avatar et la table, au-dessus, en dessous et sur le côté', () => {
    // L'avatar occupe 56 % de sa place : centré sur le côté, au bord vers la table sinon
    const { places, taille, tables } = dessinerSalle(plan('cercle', 8), []);
    const [table] = tables;
    const d = taille.l * 0.56;
    const haut = places.find((p) => p.inverse);
    const bas = places.find((p) => p.y > table.y + table.h / 2);
    const bout = places.find((p) => p.x > table.x + table.l / 2);
    const ecartHaut = table.y - table.h / 2 - (haut.y + taille.h / 2);
    const ecartBas = bas.y - taille.h / 2 - (table.y + table.h / 2);
    const ecartBout = bout.x - d / 2 - (table.x + table.l / 2);
    expect(ecartHaut).toBeCloseTo(ecartBout, 5);
    expect(ecartBas).toBeCloseTo(ecartBout, 5);
    // En bout de table, l'avatar est centré sur la hauteur de la table
    expect(bout.y - taille.h / 2 + d / 2).toBeCloseTo(table.y, 5);
  });

  it('numérote les îlots', () => {
    const { places } = dessinerSalle(plan('ilots', 9, { parIlot: 4 }), []);
    expect(places.map((p) => p.groupe)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3]);
  });
});

describe('plan de salle : taille', () => {
  it('prévoit autant de places que de participants, de 1 à 12', () => {
    expect([0, 1, 7, 12, 15, 40].map(taillePourGroupe)).toEqual([1, 1, 7, 12, 12, 12]);
    expect(nombreDePlaces(planVide(), prenoms(5))).toBe(5);
    expect(nombreDePlaces(plan('u', 20), prenoms(5))).toBe(20);
  });

  it('borne le nombre saisi entre 1 et 30, et garde des réglages valides', () => {
    expect(normaliserPlan({ nombre: 99 }).nombre).toBe(PLACES_MAX);
    expect(normaliserPlan({ nombre: 0 }).nombre).toBe(1);
    expect(normaliserPlan({ nombre: 2.5 }).nombre).toBeNull();
    expect(normaliserPlan({ disposition: 'pirate', parIlot: 9 })).toEqual(planVide());
    expect(normaliserPlan('abîmé')).toEqual(planVide());
    expect(normaliserPlan({ places: { p1: 'ana', x: 'bob', p2: 3 } }).places).toEqual({
      p1: 'ana',
    });
  });
});

describe('plan de salle : placement', () => {
  const groupe = ['Ana', 'Bob', 'Chloé', 'David'];

  it('place, déplace avec échange, libère', () => {
    let p = placer(planVide(), 'p1', 'Ana');
    expect(occupant(p, groupe, 'p1')).toBe('Ana');
    p = placer(p, 'p2', 'Bob');
    // Ana va sur la place de Bob : ils échangent
    p = placer(p, 'p2', 'Ana');
    expect(p.places).toEqual({ p1: 'bob', p2: 'ana' });
    // Chloé, qui n'était pas assise, prend la place d'Ana : Ana retourne à placer
    p = placer(p, 'p2', 'Chloé');
    expect(p.places).toEqual({ p1: 'bob', p2: 'chloé' });
    expect(nonPlaces(p, groupe)).toEqual(['Ana', 'David']);
    expect(placeDe(p, 'BOB')).toBe('p1');
    expect(liberer(p, 'p1').places).toEqual({ p2: 'chloé' });
  });

  it('échange deux places, même si l’une est libre', () => {
    const p = { ...planVide(), places: { p1: 'ana', p2: 'bob' } };
    expect(echanger(p, 'p1', 'p2').places).toEqual({ p1: 'bob', p2: 'ana' });
    expect(echanger(p, 'p1', 'p4').places).toEqual({ p2: 'bob', p4: 'ana' });
  });

  it('place les autres dans l’ordre, sur les places libres', () => {
    const p = placerDansLOrdre({ ...planVide(), places: { p2: 'chloé' } }, groupe);
    expect(p.places).toEqual({ p1: 'ana', p2: 'chloé', p3: 'bob', p4: 'david' });
    // Plus de monde que de places : les derniers restent à placer
    const serre = placerDansLOrdre(plan('u', 3), groupe);
    expect(nonPlaces(serre, groupe)).toEqual(['David']);
  });

  it('mélange de façon reproductible avec une graine', () => {
    const a = melanger(planVide(), groupe, creerHasard(7));
    const b = melanger(planVide(), groupe, creerHasard(7));
    expect(a.places).toEqual(b.places);
    expect(Object.values(a.places).sort()).toEqual(['ana', 'bob', 'chloé', 'david']);
    expect(vider(a).places).toEqual({});
  });

  it('nettoie le plan : prénom retiré, place disparue, doublon', () => {
    const brut = { ...plan('u', 3), places: { p1: 'ana', p2: 'zoé', p3: 'bob', p4: 'chloé' } };
    expect(nettoyerPlan(brut, groupe).places).toEqual({ p1: 'ana', p3: 'bob' });
    const doublon = { ...planVide(), places: { p1: 'ana', p2: 'ana' } };
    expect(nettoyerPlan(doublon, groupe).places).toEqual({ p1: 'ana' });
  });

  it('décrit une place, avec son îlot', () => {
    expect(libellePlace(plan('u', 4), groupe, 'p3')).toBe('Place 3');
    expect(libellePlace(plan('ilots', 8, { parIlot: 4 }), groupe, 'p6')).toBe('Place 6, îlot 2');
    expect(libellePlace(plan('u', 4), groupe, 'p9')).toBe('');
  });
});

describe('plan de salle : stockage', () => {
  beforeEach(() => localStorage.clear());

  it('enregistre et relit le plan, nettoyé pour le groupe', () => {
    expect(charger(['Ana'])).toEqual(planVide());
    enregistrer({ ...plan('cercle', 6), places: { p1: 'ana', p2: 'bob' } });
    expect(charger(['Ana'])).toEqual({ ...plan('cercle', 6), places: { p1: 'ana' } });
    localStorage.setItem('skazy-jeux:plan-salle', '{pas du json');
    expect(charger(['Ana'])).toEqual(planVide());
  });
});
