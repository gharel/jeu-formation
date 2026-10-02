import { OPTIONS_AMORCE, validerDefi } from './logique.js';

export const schema = {
  elements: {
    libelle: 'Défi',
    pluriel: 'défis',
    min: 2,
    max: 30,
    champs: [
      {
        cle: 'amorce',
        libelle: 'Début du défi',
        type: 'choix',
        options: OPTIONS_AMORCE,
        aide: 'La durée du chrono vient du début choisi.',
      },
      {
        cle: 'amorcePerso',
        libelle: 'Votre début (si « Autre »)',
        type: 'texte',
        longueurMax: 80,
        exemple: 'Ex. : 2 minutes pour créer…',
        aide: 'Indiquez la durée dans le texte : « 90 secondes », « 2 min »… (30 s par défaut).',
      },
      {
        cle: 'fin',
        libelle: 'Fin du défi',
        type: 'texte',
        requis: true,
        longueurMax: 160,
        exemple: 'Ex. : … le menu pour enregistrer un fichier',
      },
    ],
    valider: validerDefi,
  },
};

export const exemple = {
  elements: [
    { amorce: 'trouver30', fin: '… le menu pour enregistrer un fichier sous un autre nom' },
    { amorce: 'trouver30', fin: '… le raccourci clavier qui annule la dernière action' },
    { amorce: 'montrer60', fin: '… comment créer un nouveau dossier sur le bureau' },
    { amorce: 'expliquer20', fin: '… ce qu’est le cloud, sans dire le mot « Internet »' },
    { amorce: 'retrouver45', fin: '… l’année de création de Wikipédia, en cherchant sur le web' },
    { amorce: 'surprise', fin: '… où se trouvent les paramètres de votre navigateur' },
  ],
};
