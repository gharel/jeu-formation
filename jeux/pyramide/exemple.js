export const schema = {
  reglages: [
    {
      cle: 'motsParBinome',
      libelle: 'Mots à faire deviner par binôme',
      type: 'nombre',
      defaut: 2,
      min: 1,
      max: 10,
      aide: 'Les rôles s’inversent à chaque mot : avec 2 mots, chacun fait deviner une fois.',
    },
  ],
  elements: {
    libelle: 'Mot',
    pluriel: 'mots',
    min: 1,
    max: 40,
    champs: [
      {
        cle: 'mot',
        libelle: 'Mot à faire deviner',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 40,
        exemple: 'Ex. : souris',
        aide: 'Un mot ou une courte expression. Les indices, ce sont les joueurs qui les trouvent.',
      },
    ],
  },
};

export const exemple = {
  reglages: { motsParBinome: 2 },
  elements: [
    { mot: 'Souris' },
    { mot: 'Corbeille' },
    { mot: 'Wi-Fi' },
    { mot: 'Imprimante' },
    { mot: 'Mot de passe' },
    { mot: 'Cloud' },
    { mot: 'Clavier' },
    { mot: 'Navigateur' },
    { mot: 'Pièce jointe' },
    { mot: 'Sauvegarde' },
  ],
};
