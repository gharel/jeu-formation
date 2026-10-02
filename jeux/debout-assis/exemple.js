export const schema = {
  reglages: [
    {
      cle: 'duree',
      libelle: 'Temps pour se décider',
      type: 'nombre',
      unite: 'secondes',
      defaut: 10,
      min: 3,
      max: 60,
    },
    {
      cle: 'consigne',
      libelle: 'Comment répondre',
      type: 'choix',
      options: [
        { valeur: 'debout', libelle: 'Debout = Vrai, assis = Faux' },
        { valeur: 'main', libelle: 'Main levée = Vrai, main baissée = Faux (sans se lever)' },
      ],
    },
    {
      cle: 'survie',
      libelle: 'Mode survie : qui se trompe est éliminé, le dernier en jeu gagne',
      type: 'case',
      defaut: false,
    },
  ],
  elements: {
    libelle: 'Affirmation',
    pluriel: 'affirmations',
    feminin: true,
    min: 1,
    max: 40,
    champs: [
      {
        cle: 'affirmation',
        libelle: 'Affirmation',
        type: 'texte-long',
        requis: true,
        exemple: 'Ex. : Un fichier PDF ne peut pas être modifié.',
      },
      {
        cle: 'reponse',
        libelle: 'Réponse',
        type: 'choix',
        secret: true,
        options: [
          { valeur: 'vrai', libelle: 'Vrai' },
          { valeur: 'faux', libelle: 'Faux' },
        ],
      },
      {
        cle: 'explication',
        libelle: 'Explication (facultatif)',
        type: 'texte-long',
        aide: 'Affichée avec la réponse.',
      },
    ],
  },
};

export const exemple = {
  reglages: { duree: 10, consigne: 'debout', survie: false },
  elements: [
    {
      affirmation: 'Le raccourci Ctrl + Z annule la dernière action.',
      reponse: 'vrai',
      explication: 'Et Ctrl + Y (ou Ctrl + Maj + Z) la rétablit.',
    },
    {
      affirmation: 'Un fichier PDF ne peut pas être modifié.',
      reponse: 'faux',
      explication:
        'Avec les bons logiciels, et même certains navigateurs, on peut annoter ou modifier un PDF.',
    },
    {
      affirmation: 'La navigation privée vous rend anonyme sur Internet.',
      reponse: 'faux',
      explication:
        'Elle n’enregistre pas l’historique sur votre ordinateur, mais les sites et votre fournisseur d’accès peuvent toujours vous identifier.',
    },
    {
      affirmation: 'Un octet est composé de 8 bits.',
      reponse: 'vrai',
      explication: 'Un bit vaut 0 ou 1 ; 8 bits permettent 256 combinaisons.',
    },
    {
      affirmation: 'Le cadenas dans la barre d’adresse prouve que le site est honnête.',
      reponse: 'faux',
      explication:
        'Il garantit seulement que la connexion est chiffrée. Un site d’arnaque peut aussi avoir un cadenas.',
    },
    {
      affirmation: 'On peut attraper un virus en ouvrant une pièce jointe d’e-mail.',
      reponse: 'vrai',
      explication:
        'C’est l’un des moyens les plus courants : méfiez-vous des pièces jointes inattendues.',
    },
    {
      affirmation:
        'Une phrase de passe longue est plus sûre qu’un mot de passe court et compliqué.',
      reponse: 'vrai',
      explication:
        'La longueur compte beaucoup : plusieurs mots mis bout à bout sont très difficiles à deviner.',
    },
    {
      affirmation: 'Fermer un logiciel enregistre toujours automatiquement le document.',
      reponse: 'faux',
      explication:
        'Certains logiciels le font, beaucoup demandent, d’autres non : enregistrez avant de fermer !',
    },
  ],
};
