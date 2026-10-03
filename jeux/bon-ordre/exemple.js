import { ETAPES_MIN, ETAPES_MAX, validerProcedure } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'essais',
      libelle: 'Nombre d’essais par procédure',
      type: 'nombre',
      defaut: 3,
      min: 1,
      max: 5,
      aide: 'Moins on utilise d’essais, plus on marque de points.',
    },
  ],
  elements: {
    libelle: 'Procédure',
    pluriel: 'procédures',
    feminin: true,
    min: 1,
    max: 20,
    champs: [
      {
        cle: 'titre',
        libelle: 'Titre de la procédure',
        type: 'texte',
        requis: true,
        longueurMax: 120,
        exemple: 'Ex. : Envoyer un e-mail avec une pièce jointe',
      },
      {
        cle: 'etapes',
        libelle: 'Étapes, dans le bon ordre',
        type: 'liste',
        requis: true,
        min: ETAPES_MIN,
        max: ETAPES_MAX,
        nomItem: 'Étape',
        article: 'une',
        longueurMax: 120,
        exemple: [
          'Ex. : Cliquer sur « Nouveau message »',
          'Ex. : Saisir l’adresse du destinataire',
          'Ex. : Écrire l’objet et le message',
          'Ex. : Joindre le fichier avec le trombone',
          'Ex. : Cliquer sur « Envoyer »',
        ],
        aide: `De ${ETAPES_MIN} à ${ETAPES_MAX} étapes. Le jeu les mélangera.`,
      },
    ],
    valider: validerProcedure,
  },
};

export const exemple = {
  reglages: { essais: 3 },
  elements: [
    {
      titre: 'Envoyer un e-mail avec une pièce jointe',
      etapes: [
        'Cliquer sur « Nouveau message »',
        'Saisir l’adresse du destinataire',
        'Écrire l’objet et le message',
        'Cliquer sur le trombone et choisir le fichier',
        'Cliquer sur « Envoyer »',
      ],
    },
    {
      titre: 'Enregistrer un document sous un nouveau nom',
      etapes: [
        'Ouvrir le menu Fichier',
        'Choisir « Enregistrer sous »',
        'Choisir le dossier de destination',
        'Taper le nouveau nom du fichier',
        'Cliquer sur « Enregistrer »',
      ],
    },
    {
      titre: 'Faire une capture d’écran et la coller dans un document',
      etapes: [
        'Appuyer sur Windows + Maj + S',
        'Sélectionner la zone à capturer',
        'Ouvrir le document de destination',
        'Coller avec Ctrl + V',
      ],
    },
    {
      titre: 'Créer un dossier et y ranger un fichier',
      etapes: [
        'Faire un clic droit sur le bureau',
        'Choisir « Nouveau » puis « Dossier »',
        'Taper le nom du dossier et valider',
        'Glisser le fichier sur le dossier',
      ],
    },
  ],
};
