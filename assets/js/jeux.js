/**
 * Liste des mini-jeux. L'accueil affiche une carte par jeu, et chaque jeu
 * a sa page dans jeux/<slug>/index.html.
 */
export const JEUX = [
  {
    slug: 'motus',
    titre: 'Motus numérique',
    icone: '🔤',
    couleur: 'vert',
    accroche:
      'Devinez 5 mots du numérique en 6 essais. Les lettres se colorent à chaque proposition.',
    duree: '10 min',
    preparation: '5 mots à deviner',
  },
];

export function trouverJeu(slug) {
  return JEUX.find((jeu) => jeu.slug === slug) ?? null;
}

/** { slug: titre } pour les messages d'import. */
export function titresDesJeux() {
  return Object.fromEntries(JEUX.map((jeu) => [jeu.slug, jeu.titre]));
}
