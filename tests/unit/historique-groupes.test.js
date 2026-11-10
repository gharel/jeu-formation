import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CLE_HISTORIQUE,
  NOMBRE_MAX,
  purger,
  mettreDeCote,
  supprimer,
  resumer,
  decrireDates,
  fusionner,
  decrireParties,
  charger,
  chargerCourant,
} from '../../assets/js/commun/historique-groupes.js';
import { preparerExportGroupe, lireGroupe } from '../../assets/js/commun/fichier-groupe.js';
import { creerGroupe } from '../../assets/js/commun/groupe.js';
import { lire, ecrire } from '../../assets/js/commun/stockage.js';

const maintenant = new Date('2026-11-03T09:00:00Z');
const ilYA = (jours) => new Date(maintenant.getTime() - jours * 24 * 60 * 60 * 1000);

beforeEach(() => {
  localStorage.clear();
  // charger() et le groupe datent leurs entrées d'aujourd'hui : on fige la date
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(maintenant);
});
afterEach(() => vi.useRealTimers());

/** Ana (place 1, 5 points), Bob (absent, 2 points), Chloé ; une équipe ; salle en îlots. */
function groupeExemple() {
  return {
    nom: 'Excel, mairie',
    participants: ['Ana', 'Bob', 'Chloé'],
    infos: { ana: { theme: 'dessert', texte: 'le tiramisu' } },
    absents: ['bob'],
    plan: { disposition: 'ilots', nombre: 8, parIlot: 4, places: { p1: 'ana', p3: 'chloé' } },
    scores: { ana: { motus: 5 }, bob: { bingo: 2 } },
    equipes: [{ id: 'e1', nom: 'Les Bleus', membres: ['ana', 'bob'] }],
    scoresEquipes: { e1: { motus: 4 } },
  };
}

const entree = (id, utiliseLe, groupe = preparerExportGroupe(groupeExemple()).groupe) => ({
  id,
  creeLe: ilYA(40).toISOString(),
  utiliseLe: utiliseLe.toISOString(),
  groupe,
});

describe('groupes récents : la liste', () => {
  it('garde un mois après la dernière utilisation, les plus récents d’abord', () => {
    const liste = [entree('a', ilYA(31)), entree('b', ilYA(2)), entree('c', ilYA(29))];
    expect(purger(liste, maintenant).map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('garde 20 groupes au plus et ignore une entrée abîmée', () => {
    const liste = Array.from({ length: 25 }, (_, i) => entree(`g${i}`, ilYA(i)));
    liste.push({ id: 'x' }, null, 'texte', { ...entree('y', ilYA(1)), groupe: { nom: 'sans' } });
    const gardees = purger(liste, maintenant);
    expect(gardees).toHaveLength(NOMBRE_MAX);
    expect(gardees[0].id).toBe('g0');
    expect(purger('pas une liste', maintenant)).toEqual([]);
  });

  it('met un groupe de côté : même identifiant, même entrée (en tête, date du jour)', () => {
    const groupe = preparerExportGroupe(groupeExemple()).groupe;
    let liste = [entree('a', ilYA(5)), entree('b', ilYA(3))];
    liste = mettreDeCote(liste, { id: 'a', creeLe: ilYA(10).toISOString(), groupe }, maintenant);
    expect(liste.map((e) => e.id)).toEqual(['a', 'b']);
    expect(liste[0]).toMatchObject({
      creeLe: ilYA(10).toISOString(),
      utiliseLe: maintenant.toISOString(),
    });
    liste = mettreDeCote(liste, { id: 'n', creeLe: null, groupe }, maintenant);
    expect(liste.map((e) => e.id)).toEqual(['n', 'a', 'b']);
    expect(liste[0].creeLe).toBe(maintenant.toISOString());
  });

  it('ne garde pas un groupe vide, et en supprime un', () => {
    const liste = [entree('a', ilYA(1))];
    expect(
      mettreDeCote(liste, { id: 'v', creeLe: null, groupe: { participants: [] } }, maintenant),
    ).toEqual(liste);
    expect(supprimer(liste, 'a')).toEqual([]);
  });

  it('résume une entrée : nom, nombres, disposition, qui est en tête', () => {
    expect(resumer(entree('a', ilYA(1)))).toEqual({
      titre: 'Excel, mairie',
      prenoms: ['Ana', 'Bob', 'Chloé'],
      participants: 3,
      equipes: 1,
      places: 2,
      disposition: 'Îlots',
      meilleur: { prenom: 'Ana', points: 5 },
      suivi: '',
    });
    const sansNom = resumer(entree('b', ilYA(1), { participants: ['Léa', { prenom: 'Marc' }] }));
    expect(sansNom).toMatchObject({ titre: 'Groupe sans nom', participants: 2, meilleur: null });
    // Les notes de suivi : où le groupe s'est arrêté
    const avecNotes = entree('c', ilYA(1), {
      participants: ['Léa'],
      suivi: { diapositive: 'diapo 42', logiciels: ['Word', 'Excel'] },
    });
    expect(resumer(avecNotes).suivi).toBe('arrêté à : diapo 42 · 2 logiciels vus');
  });

  it('dit quand le groupe a été créé et utilisé', () => {
    expect(decrireDates(entree('a', ilYA(0)))).toBe('créé le 24 septembre, utilisé le 3 novembre');
    expect(
      decrireDates({ creeLe: maintenant.toISOString(), utiliseLe: maintenant.toISOString() }),
    ).toBe('utilisé le 3 novembre');
  });
});

describe('groupes récents : recharger tout ou partie', () => {
  const archive = () => lireGroupe(preparerExportGroupe(groupeExemple()).groupe);
  const actuel = () => ({
    nom: 'Aujourd’hui',
    participants: ['Ana', 'David'],
    infos: {},
    absents: ['david'],
    plan: { disposition: 'u', nombre: null, parIlot: 4, places: { p2: 'david' } },
    scores: { david: { motus: 1 } },
    equipes: [{ id: 'e1', nom: 'Les Verts', membres: ['david'] }],
    scoresEquipes: { e1: { motus: 9 } },
  });

  it('tout : le groupe revient tel quel, présent au complet', () => {
    const fusion = fusionner(actuel(), archive(), ['prenoms', 'salle', 'equipes', 'scores']);
    expect(fusion).toMatchObject({
      nom: 'Excel, mairie',
      participants: ['Ana', 'Bob', 'Chloé'],
      infos: { ana: { theme: 'dessert', texte: 'le tiramisu' } },
      absents: [],
      plan: { disposition: 'ilots', places: { p1: 'ana', p3: 'chloé' } },
      scores: { ana: { motus: 5 }, bob: { bingo: 2 } },
      scoresEquipes: { e1: { motus: 4 } },
    });
    expect(fusion.equipes[0]).toMatchObject({ nom: 'Les Bleus', membres: ['ana', 'bob'] });
  });

  it('seulement les prénoms : la salle, les équipes et les scores du jour restent', () => {
    const fusion = fusionner(actuel(), archive(), ['prenoms']);
    expect(fusion.participants).toEqual(['Ana', 'Bob', 'Chloé']);
    expect(fusion.plan.disposition).toBe('u');
    expect(fusion.equipes[0].nom).toBe('Les Verts');
    expect(fusion.scores).toEqual({ david: { motus: 1 } });
  });

  it('seulement la disposition, ou les scores : pour le groupe actuel', () => {
    const salle = fusionner(actuel(), archive(), ['salle']);
    expect(salle.participants).toEqual(['Ana', 'David']);
    expect(salle.absents).toEqual(['david']);
    expect(salle.plan.disposition).toBe('ilots');
    const scores = fusionner(actuel(), archive(), ['scores']);
    expect(scores.scores).toEqual({ ana: { motus: 5 }, bob: { bingo: 2 } });
    // Sans leurs équipes, les points d'équipes de l'archive ne veulent rien dire
    expect(scores.scoresEquipes).toEqual({ e1: { motus: 9 } });
    expect(fusionner(actuel(), archive(), ['equipes']).scoresEquipes).toEqual({});
  });

  it('les notes de suivi reviennent si on les demande, sinon celles du jour restent', () => {
    const duJour = { ...actuel(), suivi: { diapositive: 'Diapo 3', logiciels: ['Canva'] } };
    const gardees = { ...archive(), suivi: { diapositive: 'Diapo 42', logiciels: ['Excel'] } };
    expect(fusionner(duJour, gardees, ['prenoms', 'suivi']).suivi).toEqual(gardees.suivi);
    expect(fusionner(duJour, gardees, ['prenoms', 'scores']).suivi).toEqual(duJour.suivi);
  });

  it('nomme ce qui est rechargé', () => {
    expect(decrireParties(['scores', 'prenoms', 'salle'])).toBe(
      'les prénoms, la disposition et les scores',
    );
    expect(decrireParties(['equipes'])).toBe('les équipes');
    expect(decrireParties(['suivi', 'prenoms'])).toBe('les prénoms et les notes');
  });
});

describe('groupes récents : le groupe en cours', () => {
  it('un groupe vidé est mis de côté, puis rechargé en entier sous la même entrée', () => {
    const groupe = creerGroupe();
    groupe.remplacer(groupeExemple());
    const id = groupe.idHistorique;
    expect(id).toMatch(/^g/);
    expect(chargerCourant().id).toBe(id);

    groupe.mettreDeCote({ nouveau: true });
    groupe.remplacer({});
    expect(groupe.idHistorique).toBeNull();
    const [mise] = charger();
    expect(mise.id).toBe(id);
    expect(mise.groupe.participants).toHaveLength(3);

    groupe.changerParticipants(['Léa']);
    const autre = groupe.idHistorique;
    expect(autre).not.toBe(id);
    groupe.recharger(mise, ['prenoms', 'salle', 'equipes', 'scores']);
    expect(groupe.participants).toEqual(['Ana', 'Bob', 'Chloé']);
    expect(groupe.totalDe('Ana')).toBe(5);
    expect(groupe.placeDe('Chloé')).toMatch(/^Place 3/);
    expect(groupe.idHistorique).toBe(id);
    // Léa, le groupe d'avant, est mise de côté à son tour
    expect(charger().map((e) => e.id)).toEqual([autre, id]);
  });

  it('effacer la liste met le groupe de côté', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Ana', 'Bob']);
    groupe.changerParticipants([]);
    expect(charger()[0].groupe.participants).toEqual([{ prenom: 'Ana' }, { prenom: 'Bob' }]);
    expect(lire('groupe-courant')).toBeNull();
  });

  it('recharger seulement les scores garde le groupe en cours et son entrée', () => {
    ecrire(CLE_HISTORIQUE, [entree('vieux', ilYA(1))]);
    const groupe = creerGroupe();
    groupe.changerParticipants(['Ana', 'Chloé']);
    const id = groupe.idHistorique;
    groupe.recharger(charger()[0], ['scores']);
    expect(groupe.participants).toEqual(['Ana', 'Chloé']);
    expect(groupe.totalDe('Ana')).toBe(5);
    expect(groupe.idHistorique).toBe(id);
  });
});
