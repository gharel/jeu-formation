import { SERRURES_MIN, SERRURES_MAX } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'duree',
      libelle: 'Temps pour ouvrir le coffre',
      type: 'nombre',
      unite: 'minutes',
      defaut: 10,
      min: 2,
      max: 30,
      lancement: true,
    },
    {
      cle: 'penalite',
      libelle: 'Temps perdu à chaque mauvaise réponse',
      type: 'nombre',
      unite: 'secondes',
      defaut: 30,
      min: 0,
      max: 120,
    },
    {
      cle: 'coutIndice',
      libelle: 'Prix d’un indice',
      type: 'nombre',
      unite: 'secondes',
      defaut: 60,
      min: 0,
      max: 300,
    },
  ],
  elements: {
    libelle: 'Énigme',
    pluriel: 'énigmes',
    feminin: true,
    min: SERRURES_MIN,
    max: SERRURES_MAX,
    champs: [
      {
        cle: 'enigme',
        libelle: 'Énigme',
        type: 'texte-long',
        requis: true,
        longueurMax: 400,
        exemple:
          'Ex. : Je ferme les menus et je fais sortir du plein écran. Quelle touche suis-je ?',
        aide: 'Une question, une charade, ou quelque chose à chercher sur l’ordinateur.',
      },
      {
        cle: 'reponse',
        libelle: 'Réponse qui ouvre la serrure',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 120,
        exemple: 'Ex. : Échap / Esc',
        aide: 'Plusieurs réponses acceptées ? Séparez-les par « / ». Majuscules, accents et petites fautes de frappe sont pardonnés, mais pas les chiffres. Un seul mot de la réponse suffit : « passe » ouvre « Mot de passe ».',
      },
      {
        cle: 'indice',
        libelle: 'Indice (facultatif)',
        type: 'texte',
        secret: true,
        longueurMax: 160,
        exemple: 'Ex. : Je suis tout en haut à gauche du clavier.',
      },
    ],
  },
};

export const exemple = {
  reglages: { duree: 10, penalite: 30, coutIndice: 60 },
  elements: [
    {
      enigme:
        'Je ferme les menus, j’arrête une action en cours et je fais sortir du plein écran. Quelle touche suis-je ?',
      reponse: 'Échap / Esc / Escape',
      indice: 'Je suis tout en haut à gauche du clavier.',
    },
    {
      enigme:
        'Je me remplis quand vous supprimez des fichiers, et je ne me vide que si vous me le demandez. Qui suis-je ?',
      reponse: 'La corbeille',
      indice: 'Mon icône est sur le bureau de l’ordinateur.',
    },
    {
      enigme: 'Le code de cette serrure : le nombre de bits dans un octet.',
      reponse: '8 / huit',
      indice: 'C’est deux fois quatre.',
    },
    {
      enigme:
        'Je dois être long, différent pour chaque site, et je ne me prête jamais. Qui suis-je ?',
      reponse: 'Le mot de passe / La phrase de passe',
      indice: 'On me demande à chaque connexion.',
    },
    {
      enigme:
        'Un code à quatre chiffres, l’année où Tim Berners-Lee a proposé le World Wide Web au CERN.',
      reponse: '1989',
      indice: 'C’est aussi l’année de la chute du mur de Berlin.',
    },
    {
      enigme:
        'Je suis une copie de vos fichiers gardée ailleurs, au cas où l’original disparaîtrait. Qui suis-je ?',
      reponse: 'Une sauvegarde / Sauvegarde / Backup',
      indice: 'On me fait régulièrement, sur une clé USB ou dans le cloud.',
    },
    {
      enigme:
        'Je commence par « https » et je finis souvent par « .com » ou « .fr ». Qui suis-je ?',
      reponse: 'Une adresse web / Adresse de site / URL',
      indice: 'On me tape tout en haut du navigateur.',
    },
    {
      enigme:
        'Je suis un faux message qui se fait passer pour votre banque afin de vous voler vos codes. Quel est mon nom ?',
      reponse: 'Hameçonnage / Phishing',
      indice: 'En français, mon nom évoque la pêche.',
    },
    {
      enigme: 'Je repère et j’arrête les virus avant qu’ils fassent du mal. Quel est mon nom ?',
      reponse: 'Antivirus',
      indice: 'Mon nom commence par un préfixe qui veut dire « contre ».',
    },
    {
      enigme:
        'Je suis une longue bande en bas de l’écran, avec le bouton Démarrer, l’heure et les icônes des logiciels ouverts. Qui suis-je ?',
      reponse: 'La barre des tâches / Barre des tâches',
      indice: 'Mon nom évoque une liste de choses à faire.',
    },
  ],
};
