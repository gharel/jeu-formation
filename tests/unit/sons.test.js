import { describe, it, expect, beforeEach } from 'vitest';
import { sons, basculerSon, sonActif } from '../../assets/js/commun/sons.js';

/**
 * Faux contexte audio : enregistre chaque oscillateur (forme, fréquences, départ)
 * et chaque bruit joué, pour vérifier l'habillage sonore sans haut-parleur.
 */
const journal = { notes: [], bruits: 0 };

function parametre() {
  const valeurs = [];
  return {
    valeurs,
    value: 0,
    setValueAtTime: (v, t) => valeurs.push({ v, t }),
    exponentialRampToValueAtTime: (v, t) => valeurs.push({ v, t, rampe: true }),
    linearRampToValueAtTime: (v, t) => valeurs.push({ v, t, rampe: true }),
  };
}

function noeud(extra = {}) {
  return { connect: (cible) => cible, ...extra };
}

class FauxContexte {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.state = 'running';
    this.destination = noeud();
  }
  createOscillator() {
    const osc = noeud({ type: 'sine', frequency: parametre() });
    osc.start = (t) => {
      journal.notes.push({
        forme: osc.type,
        frequence: osc.frequency.valeurs[0].v,
        arrivee: osc.frequency.valeurs.find((p) => p.rampe)?.v ?? null,
        debut: t,
      });
    };
    osc.stop = () => {};
    return osc;
  }
  createGain() {
    return noeud({ gain: parametre() });
  }
  createBiquadFilter() {
    return noeud({ type: 'bandpass', frequency: parametre(), Q: { value: 1 } });
  }
  createDynamicsCompressor() {
    return noeud();
  }
  createBuffer(_canaux, longueur) {
    const donnees = new Float32Array(longueur);
    return { getChannelData: () => donnees };
  }
  createBufferSource() {
    return noeud({
      start: () => {
        journal.bruits += 1;
      },
      stop: () => {},
    });
  }
  resume() {}
}

globalThis.AudioContext = FauxContexte;

beforeEach(() => {
  journal.notes = [];
  journal.bruits = 0;
  if (!sonActif()) basculerSon();
});

describe('sons', () => {
  it('Motus : une note par lettre, au rythme de l’animation, différente selon l’état', () => {
    sons.motus.lettres(['bien', 'mal', 'absent']);
    const departs = [...new Set(journal.notes.map((n) => n.debut))];
    expect(departs).toEqual([0, 0.12, 0.24]);
    const principale = (debut) => journal.notes.find((n) => n.debut === debut).frequence;
    expect(principale(0)).toBeGreaterThan(principale(0.12));
    expect(principale(0.12)).toBeGreaterThan(principale(0.24));
  });

  it('Motus : fanfare quand le mot est trouvé, « boum » grave sinon', () => {
    sons.motus.trouve({ debut: 1 });
    expect(journal.notes.length).toBeGreaterThanOrEqual(8);
    expect(Math.min(...journal.notes.map((n) => n.debut))).toBe(1);
    journal.notes = [];
    sons.motus.perdu();
    expect(journal.notes[0].frequence).toBeLessThan(150);
    expect(journal.notes[0].arrivee).toBeLessThan(journal.notes[0].frequence);
  });

  it('Pyramide : la cloche monte à chaque mot d’indice, la fanfare dépend des points', () => {
    const etage = (n) => {
      journal.notes = [];
      sons.pyramide.etage(n);
      return journal.notes[0].frequence;
    };
    expect(etage(2)).toBeGreaterThan(etage(1));
    expect(etage(3)).toBeGreaterThan(etage(2));
    expect(etage(4)).toBeGreaterThan(etage(3));
    const fanfare = (points) => {
      journal.notes = [];
      journal.bruits = 0;
      sons.pyramide.trouve(points);
      return journal.notes.length;
    };
    expect(fanfare(3)).toBeGreaterThan(fanfare(1));
    // Trouvé avec un seul mot d'indice : la salle applaudit
    fanfare(4);
    expect(journal.bruits).toBeGreaterThan(20);
  });

  it('Duel : un buzzer différent à gauche et à droite', () => {
    sons.duel.buzz('gauche');
    const gauche = journal.notes.map((n) => `${n.forme}:${n.frequence}`);
    journal.notes = [];
    sons.duel.buzz('droite');
    const droite = journal.notes.map((n) => `${n.forme}:${n.frequence}`);
    expect(gauche).not.toEqual(droite);
  });

  it('Juste Chiffre : ça monte pour « plus », ça descend pour « moins »', () => {
    sons.juste.plus();
    expect(journal.notes[0].arrivee).toBeGreaterThan(journal.notes[0].frequence);
    journal.notes = [];
    sons.juste.moins();
    expect(journal.notes[0].arrivee).toBeLessThan(journal.notes[0].frequence);
  });

  it('paliers : un chiffre plus petit donne un son plus grave, Stop fait un gong', () => {
    sons.paliers.chiffre(5);
    const cinq = journal.notes[0].frequence;
    journal.notes = [];
    sons.paliers.chiffre(1);
    expect(journal.notes[0].frequence).toBeLessThan(cinq);
    journal.notes = [];
    sons.paliers.stop();
    expect(journal.notes.some((n) => n.frequence < 120)).toBe(true);
  });

  it('Bon Ordre : une note par étape juste, puis fanfare si tout est bon', () => {
    sons.ordre.verification(2, 5);
    const partiel = journal.notes.length;
    journal.notes = [];
    sons.ordre.verification(5, 5);
    expect(journal.notes.length).toBeGreaterThan(partiel + 3);
  });

  it('roue et applaudissements utilisent du bruit filtré', () => {
    sons.roueClic();
    expect(journal.bruits).toBe(1);
    sons.applaudissements(1);
    expect(journal.bruits).toBeGreaterThan(20);
  });

  it('le bouton Son coupe tout', () => {
    basculerSon();
    expect(sonActif()).toBe(false);
    sons.motus.trouve();
    sons.duel.victoire();
    sons.roueClic();
    expect(journal.notes).toEqual([]);
    expect(journal.bruits).toBe(0);
    basculerSon();
  });

  it('chaque son de jeu se joue sans erreur', () => {
    const appels = [
      () => sons.tic(),
      () => sons.succes(),
      () => sons.erreur(),
      () => sons.fin(),
      () => sons.ding(),
      () => sons.fanfare(2, { debut: 0.5 }),
      () => sons.pyramide.perdu(),
      () => sons.pyramide.faute(),
      () => sons.paliers.tictac(true),
      () => sons.paliers.bonne(4),
      () => sons.paliers.mauvaise(),
      () => sons.duel.bonne(),
      () => sons.duel.mauvaise(),
      () => sons.duel.victoire(),
      () => sons.juste.juste(),
      () => sons.batterie.lettre(3),
      () => sons.batterie.cran(),
      () => sons.batterie.aPlat(),
      () => sons.verite.vrai(),
      () => sons.verite.faux(),
      () => sons.ordre.carte(),
    ];
    for (const appel of appels) expect(appel).not.toThrow();
    expect(journal.notes.length).toBeGreaterThan(40);
  });
});
