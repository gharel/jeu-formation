import { OPTIONS_MECHE } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'meche',
      libelle: 'Mèche',
      type: 'choix',
      options: OPTIONS_MECHE,
      defaut: 'moyenne',
      aide: 'La patate brûle au bout d’un temps tiré au hasard dans cet intervalle : personne ne le connaît, pas même vous.',
    },
  ],
  elements: {
    libelle: 'Consigne',
    pluriel: 'consignes',
    feminin: true,
    min: 1,
    max: 30,
    champs: [
      {
        cle: 'consigne',
        libelle: 'Consigne',
        type: 'texte',
        requis: true,
        longueurMax: 120,
        exemple: 'Ex. : Citez une fonction d’Excel',
        aide: 'Une consigne qui a beaucoup de réponses possibles : chacun doit pouvoir en trouver une.',
      },
      {
        cle: 'idees',
        libelle: 'Quelques réponses possibles (facultatif)',
        type: 'texte-long',
        secret: true,
        longueurMax: 400,
        exemple: 'Ex. : SOMME, MOYENNE, SI, NB.SI, RECHERCHEV, MAX, MIN…',
        aide: 'Affichées quand la patate a brûlé : pour vous aider à juger une réponse et donner des idées.',
      },
    ],
  },
};

export const exemple = {
  reglages: { meche: 'moyenne' },
  elements: [
    {
      consigne: 'Citez un raccourci clavier avec la touche Ctrl',
      idees:
        'Ctrl + C (copier), Ctrl + V (coller), Ctrl + X (couper), Ctrl + Z (annuler), Ctrl + S (enregistrer), Ctrl + P (imprimer), Ctrl + A (tout sélectionner), Ctrl + F (rechercher)…',
    },
    {
      consigne: 'Citez un appareil qu’on peut brancher sur un port USB',
      idees:
        'Souris, clavier, clé USB, imprimante, disque dur externe, webcam, casque, téléphone, chargeur…',
    },
    {
      consigne: 'Citez une touche du clavier qui n’est ni une lettre ni un chiffre',
      idees: 'Entrée, Espace, Échap, Tab, Maj, Ctrl, Alt, Suppr, Retour arrière, les flèches, F5…',
    },
    {
      consigne: 'Citez une extension de fichier',
      idees: '.pdf, .docx, .xlsx, .pptx, .jpg, .png, .mp3, .mp4, .zip, .txt, .csv…',
    },
    {
      consigne: 'Citez un site ou une application pour regarder des vidéos',
      idees: 'YouTube, Netflix, TikTok, Dailymotion, Twitch, Disney+, Prime Video, Vimeo…',
    },
    {
      consigne: 'Citez un mot qu’on trouve dans un e-mail',
      idees:
        'Destinataire, objet, pièce jointe, signature, Cc, Cci, répondre, transférer, brouillon…',
    },
    {
      consigne: 'Citez un bon réflexe pour protéger ses comptes',
      idees:
        'Un mot de passe long, un mot de passe différent par site, la double authentification, se déconnecter, ne jamais donner son code, faire les mises à jour…',
    },
    {
      consigne: 'Citez un objet du quotidien qui se connecte à Internet',
      idees:
        'Téléphone, montre, télévision, enceinte, box, voiture, thermostat, caméra, console de jeux, réfrigérateur…',
    },
  ],
};
