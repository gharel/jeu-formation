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
  {
    slug: 'instant-defi',
    titre: 'Instant défi',
    icone: '⏱️',
    couleur: 'orange',
    accroche: 'La roue tire un défi éclair : « 30 secondes pour trouver… ». Top chrono !',
    duree: '5 à 15 min',
    preparation: 'Les fins de vos défis',
  },
  {
    slug: 'juste-chiffre',
    titre: 'Le Juste Chiffre',
    icone: '🎯',
    couleur: 'bleu',
    accroche: 'Estimez un chiffre du numérique. Le jeu répond « c’est plus » ou « c’est moins ».',
    duree: '5 à 10 min',
    preparation: 'Des questions à réponse chiffrée',
  },
];

export function trouverJeu(slug) {
  return JEUX.find((jeu) => jeu.slug === slug) ?? null;
}

/** { slug: titre } pour les messages d'import. */
export function titresDesJeux() {
  return Object.fromEntries(JEUX.map((jeu) => [jeu.slug, jeu.titre]));
}
