import { validerMot } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'crans',
      libelle: 'Crans de batterie (mauvaises lettres permises)',
      type: 'nombre',
      defaut: 7,
      min: 3,
      max: 12,
      aide: 'Proposer le mot entier et se tromper coûte aussi un cran.',
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
        libelle: 'Mot ou expression à découvrir',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 30,
        exemple: 'Ex. : pièce jointe',
        aide: 'Lettres, espaces, tirets et apostrophes. Les accents se devinent sans accent (E pour É).',
      },
      {
        cle: 'theme',
        libelle: 'Thème affiché pendant le jeu (facultatif)',
        type: 'texte',
        longueurMax: 60,
        exemple: 'Ex. : la messagerie',
      },
      {
        cle: 'definition',
        libelle: 'Explication affichée à la fin (facultatif)',
        type: 'texte-long',
      },
    ],
    valider: (element) => validerMot(element.mot),
  },
};

export const exemple = {
  reglages: { crans: 7 },
  elements: [
    {
      mot: 'Clavier',
      theme: 'Le matériel',
      definition: 'AZERTY en France, QWERTY dans les pays anglophones.',
    },
    {
      mot: 'Pièce jointe',
      theme: 'La messagerie',
      definition: 'Le fichier envoyé avec un e-mail. Méfiez-vous de celles qui sont inattendues !',
    },
    {
      mot: 'Mot de passe',
      theme: 'La sécurité',
      definition: 'Long, unique pour chaque site et gardé secret.',
    },
    {
      mot: 'Navigateur',
      theme: 'Internet',
      definition: 'Le logiciel qui affiche les sites web.',
    },
    {
      mot: 'Tableur',
      theme: 'La bureautique',
      definition: 'Le logiciel des tableaux, des calculs et des graphiques.',
    },
    {
      mot: 'Clé USB',
      theme: 'Le matériel',
      definition:
        'Pratique pour transporter des fichiers… et à ne jamais brancher si on l’a trouvée par terre !',
    },
  ],
};
