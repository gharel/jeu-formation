/**
 * Liste des mini-jeux. L'accueil affiche une carte par jeu, et chaque jeu
 * a sa page dans jeux/<slug>/index.html. `icone` : nom d'une icône Font Awesome (style solid).
 */
export const JEUX = [
  {
    slug: 'motus',
    titre: 'Motus numérique',
    icone: 'spell-check',
    couleur: 'vert',
    accroche:
      'Devinez 5 mots du numérique en 6 essais. Les lettres se colorent à chaque proposition.',
    duree: '10 min',
    preparation: '5 mots à deviner',
  },
  {
    slug: 'instant-defi',
    titre: 'Instant défi',
    icone: 'stopwatch',
    couleur: 'orange',
    accroche: 'La roue tire un défi éclair : « 30 secondes pour trouver… ». Top chrono !',
    duree: '5 à 15 min',
    preparation: 'Les fins de vos défis',
  },
  {
    slug: 'juste-chiffre',
    titre: 'Le Juste Chiffre',
    icone: 'bullseye',
    couleur: 'bleu',
    accroche: 'Estimez un chiffre du numérique. Le jeu répond « c’est plus » ou « c’est moins ».',
    duree: '5 à 10 min',
    preparation: 'Des questions à réponse chiffrée',
  },
  {
    slug: 'debout-assis',
    titre: 'Debout ou assis ?',
    icone: 'person',
    couleur: 'jaune',
    accroche: 'Vrai ? Tout le monde debout. Faux ? On s’assoit. Le jeu qui fait bouger !',
    duree: '5 min',
    preparation: 'Des affirmations vraies ou fausses',
  },
  {
    slug: 'bon-ordre',
    titre: 'Le Bon Ordre',
    icone: 'list-ol',
    couleur: 'rose',
    accroche: 'Les étapes d’une procédure sont mélangées. Le groupe dicte le bon ordre.',
    duree: '5 à 10 min',
    preparation: 'Des procédures étape par étape',
  },
  {
    slug: 'qui-suis-je',
    titre: 'Qui suis-je ?',
    icone: 'circle-question',
    couleur: 'violet',
    accroche: 'Des indices de plus en plus faciles, des points qui fondent : 5, 4, 3, 2, 1…',
    duree: '5 à 10 min',
    preparation: 'Des mystères et leurs indices',
  },
  {
    slug: 'zoom-mystere',
    titre: 'Zoom mystère',
    icone: 'magnifying-glass-plus',
    couleur: 'bleu-numerique',
    accroche: 'Une capture d’écran très zoomée se dévoile peu à peu. Qui la reconnaît ?',
    duree: '5 à 10 min',
    preparation: 'Vos captures d’écran',
  },
  {
    slug: 'duel-buzzer',
    titre: 'Duel buzzer',
    icone: 'bolt',
    couleur: 'rouge',
    accroche: 'Deux participants, deux buzzers : clavier ou écran tactile. Le plus rapide répond !',
    duree: '5 à 10 min',
    preparation: 'Des questions et leurs réponses',
  },
  {
    slug: 'pyramide',
    titre: 'Pyramide',
    icone: 'cubes-stacked',
    couleur: 'ciel',
    accroche:
      'Faites deviner un mot à votre binôme en 1, 2, 3 ou 4 mots. Du premier coup : 4 points !',
    duree: '5 à 15 min',
    preparation: 'Une liste de mots à faire deviner',
  },
  {
    slug: 'batterie-faible',
    titre: 'Batterie faible',
    icone: 'battery-quarter',
    couleur: 'beige',
    accroche: 'Chaque mauvaise lettre vide la batterie. Trouvez le mot avant qu’elle lâche !',
    duree: '5 à 10 min',
    preparation: 'Des mots ou courtes expressions',
  },
  {
    slug: 'patate-chaude',
    titre: 'Patate chaude',
    icone: 'fire',
    couleur: 'caramel',
    accroche:
      'Une consigne, une patate qui chauffe : on répond, puis on la passe. Quand elle brûle, tous les autres marquent !',
    duree: '5 à 10 min',
    preparation: 'Des consignes « Citez… »',
  },
  {
    slug: 'memoire-vive',
    titre: 'Mémoire vive',
    icone: 'memory',
    couleur: 'sapin',
    accroche:
      'Retournez deux cartes : « Ctrl + Z » et « Annuler » ? C’est une paire ! Qui a la meilleure mémoire ?',
    duree: '5 à 10 min',
    preparation: 'Des paires à associer',
  },
  {
    slug: 'bingo',
    titre: 'Bingo',
    icone: 'table-cells-large',
    couleur: 'anis',
    accroche:
      'Chacun recopie des mots du thème dans sa grille. Le jeu les tire un par un : « Ligne ! », puis « Bingo ! »',
    duree: '10 à 15 min',
    preparation: 'Des mots, avec ou sans définition',
  },
  {
    slug: 'coffre-fort',
    titre: 'Le Coffre-fort',
    icone: 'vault',
    couleur: 'ardoise',
    accroche:
      'Des serrures, un compte à rebours : résolvez les énigmes ensemble pour ouvrir le coffre. Une erreur coûte du temps !',
    duree: '10 à 15 min',
    preparation: 'Des énigmes et leur réponse',
  },
  {
    slug: 'top-5',
    titre: 'Top 5',
    icone: 'ranking-star',
    couleur: 'prune',
    accroche:
      '« Citez un réseau social » : trouvez les 5 réponses cachées, de la plus attendue à la moins attendue. Trois erreurs, et c’est fini !',
    duree: '10 à 15 min',
    preparation: 'Des questions et leurs 5 réponses',
  },
];

export function trouverJeu(slug) {
  return JEUX.find((jeu) => jeu.slug === slug) ?? null;
}

/** Libellé court pour un segment de roue : « Juste Chiffre ». */
export function libelleCourt(jeu) {
  return jeu.titre.replace(/^(Le|La|Les) /, '').replace(/\s*\?$/, '');
}

/** { slug: titre } pour les messages d'import. */
export function titresDesJeux() {
  return Object.fromEntries(JEUX.map((jeu) => [jeu.slug, jeu.titre]));
}
