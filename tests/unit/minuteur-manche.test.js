import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { creerMinuteurManche, formaterTemps } from '../../assets/js/commun/minuteur-manche.js';
import {
  libelleDuree,
  optionsDuree,
  nettoyerContenu,
  validerContenu,
  validerReglages,
} from '../../assets/js/commun/contenu.js';
import {
  valeursDeLancement,
  lireLancement,
  ecrireLancement,
} from '../../assets/js/commun/lancement.js';
import { effacer } from '../../assets/js/commun/stockage.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function minuteur(options = {}) {
  const sons = { tic: vi.fn(), fin: vi.fn() };
  const annoncer = vi.fn();
  const passer = { libelle: 'Mot suivant', faire: vi.fn() };
  const m = creerMinuteurManche({ duree: 10, sons, annoncer, passer, ...options });
  return { m, sons, annoncer, passer };
}

describe('minuteur de manche', () => {
  it('écrit le temps restant, puis le dépassement', () => {
    expect(formaterTemps(90_000)).toBe('1:30');
    expect(formaterTemps(500)).toBe('0:01');
    expect(formaterTemps(0)).toBe('0:00');
    expect(formaterTemps(-12_400)).toBe('+0:12');
  });

  it('à zéro, alerte sans rien arrêter : le temps continue en dépassement', () => {
    const { m, sons, annoncer, passer } = minuteur();
    const temps = m.element.querySelector('[role="timer"]');
    const boutonPasser = m.element.querySelector('.minuteur-manche__passer');
    m.demarrer();
    expect(temps.textContent).toBe('0:10');
    expect(boutonPasser.hidden).toBe(true);
    vi.advanceTimersByTime(5500);
    expect(sons.tic).toHaveBeenCalledTimes(1);
    expect(m.element.classList.contains('minuteur-manche--urgent')).toBe(true);
    vi.advanceTimersByTime(4500);
    expect(m.depasse).toBe(true);
    expect(sons.fin).toHaveBeenCalledTimes(1);
    expect(annoncer).toHaveBeenCalledWith(expect.stringMatching(/^Temps écoulé/));
    expect(m.element.classList.contains('minuteur-manche--depasse')).toBe(true);
    expect(boutonPasser.hidden).toBe(false);
    vi.advanceTimersByTime(12_000);
    expect(m.enCours).toBe(true);
    expect(temps.textContent).toBe('+0:12');
    expect(sons.fin).toHaveBeenCalledTimes(1);
    boutonPasser.click();
    expect(passer.faire).toHaveBeenCalled();
  });

  it('« +30 s » repart du temps ajouté, même après zéro', () => {
    const { m } = minuteur();
    m.demarrer();
    vi.advanceTimersByTime(15_000);
    expect(m.depasse).toBe(true);
    m.element.querySelector('.minuteur-manche__plus').click();
    expect(m.depasse).toBe(false);
    expect(m.restant()).toBe(30_000);
    vi.advanceTimersByTime(10_000);
    expect(m.restant()).toBe(20_000);
  });

  it('se met en pause, repart du temps complet et s’arrête sans alerte', () => {
    const { m, sons } = minuteur();
    m.demarrer();
    vi.advanceTimersByTime(4000);
    m.pause();
    vi.advanceTimersByTime(20_000);
    expect(m.restant()).toBe(6000);
    expect(m.depasse).toBe(false);
    m.reprendre();
    vi.advanceTimersByTime(1000);
    expect(m.restant()).toBe(5000);
    m.relancer();
    expect(m.restant()).toBe(10_000);
    m.arreter();
    vi.advanceTimersByTime(30_000);
    expect(sons.fin).not.toHaveBeenCalled();
    expect(m.enCours).toBe(false);
    expect(m.element.classList.contains('minuteur-manche--arrete')).toBe(true);
  });
});

const schema = {
  reglages: [
    {
      cle: 'tempsManche',
      libelle: 'Temps par mot',
      type: 'duree',
      defaut: 120,
      min: 15,
      max: 600,
      sansLimite: true,
      lancement: true,
    },
    {
      cle: 'palier',
      libelle: 'Durée',
      type: 'nombre',
      defaut: 6,
      min: 2,
      max: 30,
      lancement: true,
    },
    { cle: 'essais', libelle: 'Essais', type: 'nombre', defaut: 3, min: 1, max: 5 },
  ],
  elements: { libelle: 'Mot', pluriel: 'mots', min: 1, champs: [{ cle: 'mot', type: 'texte' }] },
};

describe('réglage de durée', () => {
  it('se lit en minutes et en secondes', () => {
    expect(libelleDuree(0)).toBe('Sans limite');
    expect(libelleDuree(45)).toBe('45 s');
    expect(libelleDuree(120)).toBe('2 min');
    expect(libelleDuree(90)).toBe('1 min 30');
  });

  it('propose « Sans limite », les durées entre min et max, et la valeur importée', () => {
    const options = optionsDuree(schema.reglages[0], 75).map((o) => o.valeur);
    expect(options[0]).toBe(0);
    expect(options).toContain(75);
    expect(options).toContain(120);
    expect(options).not.toContain(10);
    expect(options).not.toContain(900);
  });

  it('se nettoie : bornes, « Sans limite », valeur illisible', () => {
    const nettoyer = (v) =>
      nettoyerContenu(schema, { reglages: { tempsManche: v }, elements: [] }).reglages.tempsManche;
    expect(nettoyer(0)).toBe(0);
    expect(nettoyer(5)).toBe(15);
    expect(nettoyer(5000)).toBe(600);
    expect(nettoyer('abc')).toBe(120);
    expect(nettoyer(44.6)).toBe(45);
  });
});

describe('réglages de lancement', () => {
  beforeEach(() => effacer('motus:lancement'));

  it('préfère le choix du lancement, puis le contenu, puis la valeur par défaut', () => {
    expect(valeursDeLancement(schema, {}, {})).toEqual({ tempsManche: 120, palier: 6 });
    expect(valeursDeLancement(schema, {}, { palier: 10 })).toEqual({
      tempsManche: 120,
      palier: 10,
    });
    expect(valeursDeLancement(schema, { tempsManche: 0 }, { tempsManche: 30 })).toEqual({
      tempsManche: 0,
      palier: 6,
    });
    expect(valeursDeLancement(schema, ['bizarre'], {})).toEqual({ tempsManche: 120, palier: 6 });
    ecrireLancement('motus', { tempsManche: 45 });
    expect(lireLancement('motus', schema, {})).toEqual({ tempsManche: 45, palier: 6 });
  });

  it('se vérifie sur l’accueil, pas avec le contenu', () => {
    const contenu = { reglages: { palier: 99, essais: 3 }, elements: [{ mot: 'clic' }] };
    expect(validerContenu(schema, contenu)).toEqual([]);
    expect(validerReglages(schema.reglages.slice(0, 2), { palier: 99 })).toEqual([
      'Réglage « Durée » doit être au plus 30.',
    ]);
  });
});
