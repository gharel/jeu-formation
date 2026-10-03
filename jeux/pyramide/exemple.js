import { NOMBRE_INDICES, validerMotPyramide } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'afficherLongueur',
      libelle: 'Afficher le nombre de lettres du mot à deviner',
      type: 'case',
      defaut: true,
    },
  ],
  elements: {
    libelle: 'Mot',
    pluriel: 'mots',
    min: 1,
    max: 30,
    champs: [
      {
        cle: 'mot',
        libelle: 'Mot à deviner',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 40,
        exemple: 'Ex. : souris',
      },
      {
        cle: 'indices',
        libelle: 'Les 3 indices, un seul mot chacun, du plus difficile au plus facile',
        type: 'liste',
        requis: true,
        min: NOMBRE_INDICES,
        max: NOMBRE_INDICES,
        nomItem: 'Indice',
        article: 'un',
        secret: true,
        longueurMax: 40,
        exemple: ['Ex. : rongeur', 'Ex. : molette', 'Ex. : clic'],
        aide: 'Trouvé au 1er indice : 3 points, au 2e : 2 points, au 3e : 1 point.',
      },
    ],
    valider: validerMotPyramide,
  },
};

export const exemple = {
  reglages: { afficherLongueur: true },
  elements: [
    { mot: 'Souris', indices: ['Rongeur', 'Molette', 'Clic'] },
    { mot: 'Corbeille', indices: ['Restaurer', 'Supprimer', 'Poubelle'] },
    { mot: 'Wi-Fi', indices: ['Ondes', 'Box', 'Sans-fil'] },
    { mot: 'Imprimante', indices: ['Bourrage', 'Cartouche', 'Papier'] },
    { mot: 'Mot de passe', indices: ['Secret', 'Connexion', 'Cadenas'] },
    { mot: 'Cloud', indices: ['Distant', 'Stockage', 'Nuage'] },
  ],
};
