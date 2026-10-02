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
  {
    slug: 'debout-assis',
    titre: 'Debout ou assis ?',
    icone: '🧍',
    couleur: 'jaune',
    accroche: 'Vrai ? Tout le monde debout. Faux ? On s’assoit. Le jeu qui fait bouger !',
    duree: '5 min',
    preparation: 'Des affirmations vraies ou fausses',
  },
  {
    slug: 'bon-ordre',
    titre: 'Le Bon Ordre',
    icone: '🔢',
    couleur: 'rose',
    accroche: 'Les étapes d’une procédure sont mélangées. Le groupe dicte le bon ordre.',
    duree: '5 à 10 min',
    preparation: 'Des procédures étape par étape',
  },
  {
    slug: 'qui-suis-je',
    titre: 'Qui suis-je ?',
    icone: '❓',
    couleur: 'violet',
    accroche: 'Des indices de plus en plus faciles, des points qui fondent : 5, 4, 3, 2, 1…',
    duree: '5 à 10 min',
    preparation: 'Des mystères et leurs indices',
  },
  {
    slug: 'zoom-mystere',
    titre: 'Zoom mystère',
    icone: '🔍',
    couleur: 'bleu-numerique',
    accroche: 'Une capture d’écran très zoomée se dévoile peu à peu. Qui la reconnaît ?',
    duree: '5 à 10 min',
    preparation: 'Vos captures d’écran',
  },
];

export function trouverJeu(slug) {
  return JEUX.find((jeu) => jeu.slug === slug) ?? null;
}

/** { slug: titre } pour les messages d'import. */
export function titresDesJeux() {
  return Object.fromEntries(JEUX.map((jeu) => [jeu.slug, jeu.titre]));
}
