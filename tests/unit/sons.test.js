import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sons, basculerSon, sonActif } from '../../assets/js/commun/sons.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

/**
 * Faux contexte audio : enregistre chaque oscillateur (forme, fréquences, départ)
 * et chaque bruit joué, pour vérifier l'habillage sonore sans haut-parleur.
 */
const journal = { notes: [], bruits: 0, tampons: [] };

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
    const source = noeud({
      start: () => {
        journal.bruits += 1;
        journal.tampons.push(source.buffer);
      },
      stop: () => {},
    });
    return source;
  }
  resume() {}
}

globalThis.AudioContext = FauxContexte;

/**
 * Des applaudissements : des claquements sur toute la durée (du son dans au moins 80 % des
 * fenêtres de 0,1 s, au taux de 8 000 du faux contexte), sans saturer.
 */
function verifierApplaudissements(tampon, duree) {
  const donnees = tampon.getChannelData(0);
  const fenetres = Array.from({ length: Math.round(duree * 10) }, (_, i) =>
    donnees.slice(i * 800, (i + 1) * 800).reduce((max, v) => Math.max(max, Math.abs(v)), 0),
  );
  expect(fenetres.filter((crete) => crete > 0.001).length).toBeGreaterThanOrEqual(
    Math.ceil(fenetres.length * 0.8),
  );
  expect(Math.max(...fenetres)).toBeLessThan(1);
}

/** Les claquements tombent toujours aux mêmes endroits : un test reproductible. */
function avecHasardFixe(fonction) {
  vi.spyOn(Math, 'random').mockImplementation(creerHasard(7));
  try {
    fonction();
  } finally {
    vi.restoreAllMocks();
  }
}

beforeEach(() => {
  journal.notes = [];
  journal.bruits = 0;
  journal.tampons = [];
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
    journal.tampons = [];
    avecHasardFixe(() => fanfare(4));
    expect(journal.tampons).toHaveLength(1);
    verifierApplaudissements(journal.tampons[0], 1.8);
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

  it('Patate chaude : le tic-tac monte quand la patate chauffe, la brûlure grésille', () => {
    sons.patate.tic(0);
    const tiede = journal.notes[0].frequence;
    journal.notes = [];
    sons.patate.tic(1);
    expect(journal.notes[0].frequence).toBeGreaterThan(tiede);
    journal.bruits = 0;
    sons.patate.brule();
    expect(journal.bruits).toBeGreaterThanOrEqual(2);
  });

  it('Top 5 : la cloche est plus aiguë pour une réponse qui rapporte plus', () => {
    sons.top.trouvee(1);
    const un = journal.notes[0].frequence;
    journal.notes = [];
    sons.top.trouvee(5);
    expect(journal.notes[0].frequence).toBeGreaterThan(un);
  });

  it('Le Coffre-fort : la serrure cliquette, le coffre s’ouvre en fanfare', () => {
    sons.coffre.serrure();
    expect(journal.bruits).toBe(2);
    journal.notes = [];
    sons.coffre.ouvert();
    expect(journal.notes.length).toBeGreaterThan(5);
  });

  it('roue et applaudissements utilisent du bruit filtré', () => {
    sons.roueClic();
    expect(journal.bruits).toBe(1);
    // La foule de claquements est calculée dans un seul tampon, joué d'un coup
    avecHasardFixe(() => sons.applaudissements(1));
    expect(journal.bruits).toBe(2);
    verifierApplaudissements(journal.tampons[1], 1);
    // … une seule fois : la salve suivante réutilise le même tampon
    sons.applaudissements(1);
    expect(journal.tampons[2]).toBe(journal.tampons[1]);
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

  describe('ouverture de la sortie audio', () => {
    /** sons.js neuf (son activé), avec `Contexte` comme AudioContext du navigateur. */
    async function sonsNeufs(Contexte) {
      vi.resetModules();
      localStorage.setItem('skazy-jeux:son', 'true');
      globalThis.AudioContext = Contexte;
      return import('../../assets/js/commun/sons.js');
    }

    afterEach(() => {
      globalThis.AudioContext = FauxContexte;
    });

    it('preparerSon ouvre la sortie une seule fois, les sons suivants la réutilisent', async () => {
      let ouvertures = 0;
      const module = await sonsNeufs(
        class extends FauxContexte {
          constructor() {
            super();
            ouvertures += 1;
          }
        },
      );
      module.preparerSon();
      module.sons.fanfare(3);
      module.sons.batterie.lettre(2);
      expect(ouvertures).toBe(1);
    });

    it('sans sortie audio utilisable, on n’essaie plus à chaque son (chaque essai peut figer la page)', async () => {
      let essais = 0;
      const module = await sonsNeufs(
        class {
          constructor() {
            essais += 1;
            throw new Error('aucune sortie audio');
          }
        },
      );
      module.preparerSon();
      expect(() => module.sons.fanfare(3)).not.toThrow();
      module.sons.applaudissements(1);
      expect(essais).toBe(1);
    });
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
      () => sons.patate.passe(),
      () => sons.memoire.retourner(),
      () => sons.memoire.paire(),
      () => sons.memoire.ratee(),
      () => sons.bingo.tirage(),
      () => sons.bingo.revele(),
      () => sons.bingo.ligne(),
      () => sons.bingo.bingo(),
      () => sons.coffre.erreur(),
      () => sons.coffre.indice(),
      () => sons.coffre.alarme(),
      () => sons.top.erreur(),
      () => sons.top.devoile(),
      () => sons.top.complet(),
    ];
    for (const appel of appels) expect(appel).not.toThrow();
    expect(journal.notes.length).toBeGreaterThan(40);
  });
});
