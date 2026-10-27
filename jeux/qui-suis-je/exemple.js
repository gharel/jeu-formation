import { INDICES_MIN, INDICES_MAX } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'dureePalier',
      libelle: 'Durée de chaque palier',
      type: 'nombre',
      unite: 'secondes',
      defaut: 6,
      min: 2,
      max: 30,
      aide: '5 paliers : avec 6 secondes, chaque mystère dure 30 secondes au plus.',
      lancement: true,
    },
  ],
  elements: {
    libelle: 'Mystère',
    pluriel: 'mystères',
    min: 1,
    max: 30,
    champs: [
      {
        cle: 'reponse',
        libelle: 'Réponse',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 80,
        exemple: 'Ex. : la souris',
      },
      {
        cle: 'indices',
        libelle: 'Indices, du plus difficile au plus facile',
        type: 'liste',
        requis: true,
        min: INDICES_MIN,
        max: INDICES_MAX,
        nomItem: 'Indice',
        article: 'un',
        secret: true,
        longueurMax: 160,
        exemple: [
          'Ex. : Je suis née dans les années 1960, dans un laboratoire.',
          'Ex. : On me tient dans la main presque toute la journée.',
          'Ex. : J’ai souvent deux boutons et une molette.',
          'Ex. : Je déplace une flèche sur l’écran.',
          'Ex. : Je porte le nom d’un petit animal.',
        ],
        aide: `De ${INDICES_MIN} à ${INDICES_MAX} indices, écrits à la première personne. Un nouvel indice apparaît à chaque palier.`,
      },
    ],
  },
};

export const exemple = {
  reglages: { dureePalier: 6 },
  elements: [
    {
      reponse: 'La souris',
      indices: [
        'Je suis née dans les années 1960, dans un laboratoire américain.',
        'On me tient dans la main presque toute la journée.',
        'J’ai souvent deux boutons et une molette.',
        'Je déplace une flèche sur l’écran.',
        'Je porte le nom d’un petit animal.',
      ],
    },
    {
      reponse: 'La touche Échap',
      indices: [
        'Je suis petite, mais je sauve souvent la situation.',
        'Je ferme un menu ou annule une action en cours.',
        'Je permets de sortir du plein écran.',
        'Je suis tout en haut à gauche du clavier.',
        'On m’écrit souvent « Esc ».',
      ],
    },
    {
      reponse: 'Le cloud',
      indices: [
        'Je ne suis pas dans votre ordinateur, et pourtant je garde vos fichiers.',
        'Je suis fait de milliers de serveurs dans des centres de données.',
        'Grâce à moi, vos photos se retrouvent sur tous vos appareils.',
        'En français, on parle d’informatique « en nuage ».',
        'Mon nom anglais veut dire « nuage ».',
      ],
    },
    {
      reponse: 'Le Wi-Fi',
      indices: [
        'Je voyage dans l’air grâce aux ondes radio.',
        'On me cherche partout : à l’hôtel, au café, à l’aéroport.',
        'Je relie votre ordinateur à la box sans aucun câble.',
        'On me demande souvent un code avant de pouvoir m’utiliser.',
        'Mon symbole ressemble à un éventail de petites ondes.',
      ],
    },
    {
      reponse: 'Le copier-coller',
      indices: [
        'Je suis né dans les années 1970, chez Xerox.',
        'Je fais gagner un temps fou à tout le monde.',
        'Je me sers d’une mémoire cachée qu’on appelle le presse-papiers.',
        'Je fonctionne en deux temps.',
        'Mes raccourcis sont Ctrl + C puis Ctrl + V.',
      ],
    },
    {
      reponse: 'La clé USB',
      indices: [
        'Je suis apparue au tournant des années 2000.',
        'Je tiens dans une poche, et je finis souvent perdue au fond d’un sac.',
        'Je garde des fichiers même quand l’ordinateur est éteint.',
        'On me branche sur un port rectangulaire de l’ordinateur.',
        'On me prête pour transporter des documents d’un poste à l’autre.',
      ],
    },
    {
      reponse: 'Le moteur de recherche',
      indices: [
        'Je réponds à des millions de questions chaque jour.',
        'Je classe les pages du web pour mettre les plus utiles en premier.',
        'Vous me posez une question en quelques mots, et je réponds par une liste de liens.',
        'Google est le plus connu d’entre nous.',
      ],
    },
    {
      reponse: 'L’e-mail',
      indices: [
        'Je suis plus ancien que le web : mon premier message date de 1971.',
        'Vous m’écrivez avec un objet, un message et parfois une pièce jointe.',
        'Je remplace la lettre sur papier, mais j’arrive en quelques secondes.',
        'Mon adresse contient toujours un @.',
      ],
    },
    {
      reponse: 'Le QR code',
      indices: [
        'Je suis né au Japon, dans les années 1990, pour suivre des pièces de voitures.',
        'On me trouve sur des menus de restaurant, des billets et des affiches.',
        'Je cache une adresse de site web ou un texte.',
        'Je suis un carré rempli de petits carrés noirs et blancs.',
        'Pour me lire, pointez l’appareil photo de votre téléphone vers moi.',
      ],
    },
    {
      reponse: 'Le Bluetooth',
      indices: [
        'Mon nom vient d’un roi danois du Xe siècle.',
        'Je relie sans fil des appareils situés à quelques mètres l’un de l’autre.',
        'Je connecte vos écouteurs ou votre enceinte à votre téléphone.',
        'Mon nom anglais évoque une couleur et une dent.',
      ],
    },
  ],
};
