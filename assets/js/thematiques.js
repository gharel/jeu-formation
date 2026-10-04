/**
 * Thématiques prêtes à jouer : un jeu de données JSON par thème, dans contenus/thematiques/.
 * La page « Les contenus » les charge dans tous les jeux en un clic. Le titre et la
 * description sont aussi dans le fichier (tests/unit/thematiques.test.js vérifie qu'ils
 * concordent). `icone` : nom d'une icône Font Awesome (style solid).
 */
export const THEMATIQUES = [
  {
    slug: 'initiation-ia',
    titre: 'Initiation à l’IA',
    icone: 'robot',
  },
  {
    slug: 'google-docs',
    titre: 'Google Docs',
    icone: 'file-lines',
  },
  {
    slug: 'google-sheets',
    titre: 'Google Sheets',
    icone: 'table-cells',
  },
  {
    slug: 'microsoft-365',
    titre: 'Microsoft 365',
    icone: 'briefcase',
  },
  {
    slug: 'facebook',
    titre: 'Facebook',
    icone: 'thumbs-up',
  },
];

/** Chemin du fichier d'une thématique, depuis la racine du site. */
export function fichierThematique(slug) {
  return `contenus/thematiques/${slug}.json`;
}

export function trouverThematique(slug) {
  return THEMATIQUES.find((t) => t.slug === slug) ?? null;
}
