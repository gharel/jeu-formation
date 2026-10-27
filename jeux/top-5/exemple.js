import { NOMBRE_REPONSES, validerQuestion } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'erreursMax',
      libelle: 'Erreurs permises par question',
      type: 'nombre',
      defaut: 3,
      min: 1,
      max: 6,
    },
    {
      cle: 'tempsManche',
      libelle: 'Temps par question',
      type: 'duree',
      defaut: 120,
      min: 30,
      max: 600,
      sansLimite: true,
      lancement: true,
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
        longueurMax: 200,
        exemple: 'Ex. : Citez un réseau social.',
      },
      {
        cle: 'reponses',
        libelle: 'Réponses',
        type: 'liste',
        requis: true,
        min: NOMBRE_REPONSES,
        max: NOMBRE_REPONSES,
        nomItem: 'Réponse',
        article: 'une',
        secret: true,
        longueurMax: 80,
        exemple: [
          'Ex. : Facebook',
          'Ex. : Instagram',
          'Ex. : TikTok',
          'Ex. : LinkedIn',
          'Ex. : X / Twitter',
        ],
        aide: 'De la plus attendue (réponse 1 : 5 points) à la moins attendue (réponse 5 : 1 point). Plusieurs façons de dire la même réponse ? Séparez-les par « / ». Pendant la partie, un seul de ses mots suffit (« passe » pour « Mot de passe »).',
      },
    ],
    valider: validerQuestion,
  },
};

export const exemple = {
  reglages: { erreursMax: 3, tempsManche: 120 },
  elements: [
    {
      question: 'Citez un navigateur web.',
      reponses: [
        'Google Chrome / Chrome',
        'Mozilla Firefox / Firefox',
        'Microsoft Edge / Edge',
        'Safari',
        'Opera',
      ],
    },
    {
      question: 'Citez un appareil qu’on branche sur un port USB.',
      reponses: ['Clé USB', 'Souris', 'Clavier', 'Imprimante', 'Disque dur externe / Disque dur'],
    },
    {
      question: 'Citez une touche du clavier qui n’est ni une lettre ni un chiffre.',
      reponses: [
        'Entrée',
        'Espace / Barre d’espace',
        'Échap / Esc',
        'Suppr / Supprimer',
        'Tab / Tabulation',
      ],
    },
    {
      question: 'Citez une extension de fichier.',
      reponses: ['.pdf', '.docx / .doc', '.jpg / .jpeg', '.xlsx / .xls', '.png'],
    },
    {
      question: 'Citez un réseau social.',
      reponses: ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'X / Twitter'],
    },
    {
      question: 'Citez une chose à faire pour protéger ses comptes en ligne.',
      reponses: [
        'Un mot de passe long / Mot de passe fort / Mot de passe solide',
        'La double authentification / Authentification à deux facteurs / Double facteur',
        'Un mot de passe par site / Un mot de passe différent',
        'Ne jamais donner son mot de passe / Ne pas partager son mot de passe',
        'Se déconnecter / Déconnexion',
      ],
    },
    {
      question: 'Citez un logiciel de Microsoft 365.',
      reponses: ['Word', 'Excel', 'PowerPoint', 'Outlook', 'Teams'],
    },
    {
      question: 'Citez une application de messagerie instantanée.',
      reponses: ['WhatsApp', 'Messenger / Facebook Messenger', 'Telegram', 'Signal', 'Snapchat'],
    },
    {
      question: 'Citez une marque de smartphone.',
      reponses: ['Apple / iPhone', 'Samsung', 'Xiaomi', 'Huawei', 'Google / Pixel'],
    },
    {
      question: 'Citez un service pour stocker ses fichiers en ligne.',
      reponses: ['Google Drive / Drive', 'OneDrive', 'Dropbox', 'iCloud', 'Mega'],
    },
  ],
};
