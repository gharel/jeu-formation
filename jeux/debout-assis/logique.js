/**
 * Règles de « Debout ou assis ? » : vrai = debout, faux = assis (ou main levée / baissée).
 */

export const CONSIGNES = {
  debout: {
    depart: 'Tout le monde debout !',
    vrai: { geste: 'Debout', icone: 'person' },
    faux: { geste: 'Assis', icone: 'chair' },
  },
  main: {
    depart: 'Préparez vos mains !',
    vrai: { geste: 'Main levée', icone: 'hand' },
    faux: { geste: 'Main baissée', icone: 'hand-point-down' },
  },
};

export function consigne(nom) {
  return CONSIGNES[nom] ?? CONSIGNES.debout;
}

/** « Debout = VRAI · Assis = FAUX » */
export function legende(nom) {
  const c = consigne(nom);
  return `${c.vrai.geste} = VRAI · ${c.faux.geste} = FAUX`;
}

/**
 * Mode survie : retire les éliminés. Si tout le monde s'est trompé, personne n'est éliminé
 * (sinon la partie s'arrêterait sans gagnant).
 */
export function appliquerEliminations(enJeu, elimines) {
  const retires = new Set(elimines);
  const restants = enJeu.filter((p) => !retires.has(p));
  if (restants.length === 0) return { enJeu: [...enJeu], tousElimines: true };
  return { enJeu: restants, tousElimines: false };
}

/** Le dernier en jeu, ou null s'il en reste plusieurs. */
export function gagnant(enJeu) {
  return enJeu.length === 1 ? enJeu[0] : null;
}
