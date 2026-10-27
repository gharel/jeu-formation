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
    {
      cle: 'tempsManche',
      libelle: 'Temps par procédure',
      type: 'duree',
      defaut: 90,
      min: 30,
      max: 600,
      sansLimite: true,
      lancement: true,
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
    {
      titre: 'Se connecter à un réseau Wi-Fi',
      etapes: [
        'Ouvrir la liste des réseaux Wi-Fi',
        'Choisir le nom du réseau',
        'Saisir le mot de passe du Wi-Fi',
        'Cliquer sur « Se connecter »',
      ],
    },
    {
      titre: 'Installer un logiciel téléchargé',
      etapes: [
        'Télécharger le fichier d’installation depuis le site officiel',
        'Ouvrir le fichier téléchargé',
        'Accepter les conditions d’utilisation',
        'Cliquer sur « Installer »',
        'Attendre la fin de l’installation',
      ],
    },
    {
      titre: 'Changer son mot de passe',
      etapes: [
        'Ouvrir les paramètres du compte',
        'Aller dans la rubrique « Sécurité »',
        'Saisir l’ancien mot de passe',
        'Saisir deux fois le nouveau mot de passe',
        'Cliquer sur « Enregistrer »',
      ],
    },
    {
      titre: 'Imprimer un document',
      etapes: [
        'Ouvrir le document',
        'Ouvrir le menu Fichier',
        'Choisir « Imprimer »',
        'Choisir l’imprimante et le nombre de copies',
        'Cliquer sur « Imprimer »',
      ],
    },
    {
      titre: 'Partager un document en ligne',
      etapes: [
        'Ouvrir le document',
        'Cliquer sur « Partager »',
        'Saisir l’adresse e-mail de la personne',
        'Choisir son droit d’accès : lecture ou modification',
        'Cliquer sur « Envoyer »',
      ],
    },
    {
      titre: 'Éteindre correctement un ordinateur',
      etapes: [
        'Enregistrer son travail',
        'Fermer les logiciels ouverts',
        'Ouvrir le menu Démarrer',
        'Cliquer sur le bouton d’alimentation',
        'Choisir « Arrêter »',
      ],
    },
  ],
};
