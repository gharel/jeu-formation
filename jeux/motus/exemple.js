import { validerMotSecret, NOMBRE_MOTS } from './logique.js';

export const schema = {
  elements: {
    libelle: 'Mot',
    pluriel: 'mots',
    min: NOMBRE_MOTS,
    max: NOMBRE_MOTS,
    champs: [
      {
        cle: 'mot',
        libelle: 'Mot à deviner',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 20,
        exemple: 'Ex. : clavier',
        aide: 'De 4 à 10 lettres, sans espace. Les accents sont retirés automatiquement.',
      },
      {
        cle: 'definition',
        libelle: 'Définition (facultatif)',
        type: 'texte',
        exemple: 'Ex. : Le périphérique qui sert à saisir du texte.',
        aide: 'Affichée quand le mot est révélé.',
      },
    ],
    valider: (element) => validerMotSecret(element.mot),
  },
};

export const exemple = {
  elements: [
    { mot: 'CLAVIER', definition: 'Le périphérique qui sert à saisir du texte.' },
    { mot: 'PIXEL', definition: 'Le plus petit point qui compose une image numérique.' },
    { mot: 'FICHIER', definition: 'Un document enregistré sur un ordinateur ou dans le cloud.' },
    { mot: 'RÉSEAU', definition: 'Des appareils reliés entre eux pour échanger des données.' },
    { mot: 'NAVIGATEUR', definition: 'Le logiciel qui permet de consulter des sites web.' },
  ],
};
