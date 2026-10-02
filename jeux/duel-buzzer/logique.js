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

/** Deux participants différents tirés au hasard. */
export function tirerDuellistes(participants, hasard = Math.random) {
  if (participants.length < 2) return null;
  const i = Math.floor(hasard() * participants.length);
  let j = Math.floor(hasard() * (participants.length - 1));
  if (j >= i) j += 1;
  return [participants[i], participants[j]];
}
