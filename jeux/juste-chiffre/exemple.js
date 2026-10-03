export const schema = {
  reglages: [
    {
      cle: 'duree',
      libelle: 'Temps par question',
      type: 'nombre',
      unite: 'secondes',
      defaut: 30,
      min: 5,
      max: 600,
      aide: 'À zéro, la réponse est révélée et personne ne marque.',
    },
    {
      cle: 'tourDeRole',
      libelle: 'Tour de rôle automatique : chaque proposition passe au participant suivant',
      type: 'case',
      defaut: true,
    },
  ],
  elements: {
    libelle: 'Question',
    pluriel: 'questions',
    feminin: true,
    min: 1,
    max: 30,
    champs: [
      {
        cle: 'question',
        libelle: 'Question',
        type: 'texte-long',
        requis: true,
        exemple: 'Ex. : En quelle année le premier SMS a-t-il été envoyé ?',
      },
      {
        cle: 'reponse',
        libelle: 'Réponse (un nombre)',
        type: 'nombre',
        requis: true,
        secret: true,
        exemple: 'Ex. : 1992',
      },
      {
        cle: 'unite',
        libelle: 'Unité (facultatif)',
        type: 'texte',
        longueurMax: 30,
        exemple: 'Ex. : milliards, %, touches',
      },
      {
        cle: 'marge',
        libelle: 'Marge acceptée',
        type: 'nombre',
        unite: '%',
        defaut: 0,
        min: 0,
        max: 50,
        aide: '0 = réponse exacte. 10 % accepte une réponse proche, utile pour les grands nombres.',
      },
      {
        cle: 'anecdote',
        libelle: 'Anecdote ou source (facultatif)',
        type: 'texte-long',
        exemple: 'Ex. : Le 3 décembre 1992, un ingénieur envoie « Merry Christmas ».',
        aide: 'Affichée quand la réponse est révélée.',
      },
    ],
  },
};

export const exemple = {
  reglages: { duree: 30, tourDeRole: true },
  elements: [
    {
      question: 'En quelle année Tim Berners-Lee a-t-il proposé le World Wide Web au CERN ?',
      reponse: 1989,
      unite: '',
      marge: 0,
      anecdote: 'En mars 1989, il propose un système pour partager des documents liés entre eux.',
    },
    {
      question: 'En quelle année le tout premier SMS a-t-il été envoyé ?',
      reponse: 1992,
      unite: '',
      marge: 0,
      anecdote: 'Le 3 décembre 1992, un ingénieur envoie « Merry Christmas » vers un téléphone.',
    },
    {
      question: 'Combien de touches compte un clavier AZERTY complet, avec pavé numérique ?',
      reponse: 105,
      unite: 'touches',
      marge: 0,
      anecdote: 'Les claviers américains en ont souvent 104 : il leur manque une touche < >.',
    },
    {
      question: 'Combien de pixels compose une image Full HD de 1 920 × 1 080 ?',
      reponse: 2073600,
      unite: 'pixels',
      marge: 10,
      anecdote: '1 920 × 1 080 = 2 073 600 pixels, soit environ 2 millions de petits points.',
    },
    {
      question: 'Combien d’octets dans un kilooctet (ko), selon le système international ?',
      reponse: 1000,
      unite: 'octets',
      marge: 0,
      anecdote: 'Le kibioctet (Kio), lui, vaut 1 024 octets.',
    },
  ],
};
