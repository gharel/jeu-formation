/**
 * Règles du Duel buzzer : deux joueurs, deux touches (A à gauche, L à droite).
 * Les buzzers ne marchent qu'une fois la question affichée (pas de faux départ).
 * Une mauvaise réponse donne la main à l'adversaire ; le premier à N points gagne.
 */

export const TOUCHES = { gauche: 'a', droite: 'l' };

export function autre(cote) {
  return cote === 'gauche' ? 'droite' : 'gauche';
}

export function creerDuel({ pointsVictoire = 3 } = {}) {
  let phase = 'attente'; // attente → ouvert → buzze → resolu
  let main = null;
  let bloque = null;
  let vainqueur = null;
  const points = { gauche: 0, droite: 0 };

  return {
    get phase() {
      return phase;
    },
    get main() {
      return main;
    },
    get vainqueur() {
      return vainqueur;
    },
    get points() {
      return { ...points };
    },

    /** Nouvelle question pas encore affichée : buzzers fermés. */
    preparer() {
      if (vainqueur) return false;
      phase = 'attente';
      main = null;
      bloque = null;
      return true;
    },

    /** La question s'affiche : les buzzers s'ouvrent. */
    ouvrir() {
      if (phase !== 'attente') return false;
      phase = 'ouvert';
      return true;
    },

    /** Un joueur buzze. Refusé avant la question, après un premier buzz, ou s'il s'est déjà trompé. */
    buzzer(cote) {
      if (phase !== 'ouvert' || cote === bloque) return false;
      phase = 'buzze';
      main = cote;
      return true;
    },

    /**
     * L'animateur valide la réponse du joueur qui a la main.
     * Renvoie 'point', 'main-adverse' (mauvaise réponse : l'autre peut répondre) ou 'personne'.
     */
    valider(bonne) {
      if (phase !== 'buzze') return null;
      if (bonne) {
        points[main] += 1;
        phase = 'resolu';
        if (points[main] >= pointsVictoire) vainqueur = main;
        return 'point';
      }
      if (bloque === null) {
        bloque = main;
        main = autre(main);
        return 'main-adverse';
      }
      phase = 'resolu';
      main = null;
      return 'personne';
    },

    /** Personne ne trouve : on révèle la réponse sans point. */
    passer() {
      if (phase === 'resolu' || phase === 'attente') return false;
      phase = 'resolu';
      main = null;
      return true;
    },
  };
}

/** Clé d'un affrontement, dans un sens comme dans l'autre : « e1|e2 ». */
export function cleAffrontement(a, b) {
  return [a, b].sort().join('|');
}

/**
 * En équipes : deux équipes différentes ({ id }) tirées au hasard, de préférence parmi les
 * affrontements pas encore joués (`dejaJoues` : leurs clés). Null s'il y a moins de deux équipes.
 */
export function tirerEquipesDuel(equipes, dejaJoues = [], hasard = Math.random) {
  if (equipes.length < 2) return null;
  const paires = [];
  equipes.forEach((a, i) => equipes.slice(i + 1).forEach((b) => paires.push([a.id, b.id])));
  const joues = new Set(dejaJoues);
  const nouvelles = paires.filter(([a, b]) => !joues.has(cleAffrontement(a, b)));
  const choix = nouvelles.length ? nouvelles : paires;
  const paire = choix[Math.floor(hasard() * choix.length)];
  return hasard() < 0.5 ? paire : [paire[1], paire[0]];
}

/** Qui répond pour une équipe à la question `numero` (0, 1, 2…) : ses membres à tour de rôle. */
export function repondant(membres, numero) {
  return membres.length ? membres[numero % membres.length] : null;
}
