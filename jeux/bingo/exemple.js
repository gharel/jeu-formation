import { MOTS_MIN } from './logique.js';

export const schema = {
  reglages: [
    {
      cle: 'tempsManche',
      libelle: 'Temps entre deux tirages',
      type: 'duree',
      defaut: 30,
      min: 10,
      max: 180,
      sansLimite: true,
      lancement: true,
    },
  ],
  elements: {
    libelle: 'Mot',
    pluriel: 'mots',
    min: MOTS_MIN,
    max: 40,
    champs: [
      {
        cle: 'mot',
        libelle: 'Mot',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 30,
        exemple: 'Ex. : navigateur',
        aide: 'Court : chacun le recopie dans sa grille.',
      },
      {
        cle: 'definition',
        libelle: 'Définition lue avant le mot (facultatif)',
        type: 'texte-long',
        longueurMax: 200,
        exemple: 'Ex. : Le logiciel qui affiche les sites web.',
        aide: 'Avec une définition, on cherche d’abord le mot. Sans définition, le mot est annoncé directement, comme au loto.',
      },
    ],
  },
};

export const exemple = {
  elements: [
    {
      mot: 'Navigateur',
      definition: 'Le logiciel qui affiche les sites web, comme Chrome, Firefox ou Edge.',
    },
    { mot: 'Mot de passe', definition: 'La suite de caractères secrète qui protège un compte.' },
    { mot: 'Pièce jointe', definition: 'Le fichier envoyé avec un e-mail.' },
    { mot: 'Clavier', definition: 'Le périphérique qui sert à taper du texte.' },
    { mot: 'Souris', definition: 'Elle déplace la flèche sur l’écran.' },
    {
      mot: 'Corbeille',
      definition: 'Les fichiers supprimés y attendent avant d’être effacés pour de bon.',
    },
    {
      mot: 'Onglet',
      definition: 'Il permet d’ouvrir plusieurs pages dans la même fenêtre du navigateur.',
    },
    {
      mot: 'Lien',
      definition: 'Un texte ou une image sur lequel on clique pour aller vers une autre page.',
    },
    { mot: 'Dossier', definition: 'Il sert à ranger des fichiers, comme une chemise cartonnée.' },
    { mot: 'Imprimante', definition: 'Elle met sur papier ce qui s’affiche à l’écran.' },
    { mot: 'Wi-Fi', definition: 'La connexion à Internet sans câble.' },
    { mot: 'Cloud', definition: 'Des serveurs sur Internet où l’on range ses fichiers.' },
    {
      mot: 'Mise à jour',
      definition: 'La nouvelle version d’un logiciel, qui corrige souvent des failles.',
    },
    {
      mot: 'Hameçonnage',
      definition: 'Un faux message qui imite une banque ou un service pour voler des codes.',
    },
    {
      mot: 'Moteur de recherche',
      definition: 'Le site qui trouve des pages web à partir de mots-clés.',
    },
    { mot: 'Sauvegarde', definition: 'Une copie de ses fichiers, gardée en lieu sûr.' },
    { mot: 'Arobase', definition: 'Le signe @ des adresses e-mail.' },
    {
      mot: 'Application',
      definition: 'Un programme qu’on installe sur son téléphone ou son ordinateur.',
    },
    { mot: 'Écran', definition: 'Il affiche les images de l’ordinateur.' },
    { mot: 'Fichier', definition: 'Un document enregistré : un texte, une photo, un tableau…' },
    {
      mot: 'Ordinateur',
      definition: 'La machine qui permet de taper, de calculer et d’aller sur Internet.',
    },
    { mot: 'E-mail', definition: 'Le message écrit qu’on envoie à une adresse, comme une lettre.' },
    { mot: 'Télécharger', definition: 'Copier un fichier depuis Internet sur son ordinateur.' },
    {
      mot: 'Icône',
      definition: 'Un petit dessin sur l’écran, sur lequel on clique pour ouvrir un programme.',
    },
    {
      mot: 'Bureau',
      definition: 'La première image de l’ordinateur, où l’on pose ses raccourcis.',
    },
    {
      mot: 'Copier-coller',
      definition: 'Dupliquer un passage pour le déposer ailleurs, avec Ctrl + C puis Ctrl + V.',
    },
    { mot: 'Clé USB', definition: 'Un petit support qu’on branche pour transporter des fichiers.' },
    {
      mot: 'Disque dur',
      definition: 'La mémoire de l’ordinateur où tout reste enregistré, même éteint.',
    },
    {
      mot: 'Casque',
      definition: 'Il se pose sur les oreilles pour écouter sans gêner les autres.',
    },
    { mot: 'Webcam', definition: 'La petite caméra qui sert aux appels en visio.' },
    {
      mot: 'Visioconférence',
      definition: 'Une réunion à distance, où l’on se voit à l’écran.',
    },
    {
      mot: 'Raccourci',
      definition: 'Une combinaison de touches pour agir plus vite, comme Ctrl + C.',
    },
    {
      mot: 'Favori',
      definition: 'Un site mis de côté dans le navigateur pour le retrouver en un clic.',
    },
    { mot: 'Historique', definition: 'La liste des sites visités récemment.' },
    {
      mot: 'Compte',
      definition: 'L’espace personnel auquel on accède avec un identifiant et un mot de passe.',
    },
    { mot: 'Antivirus', definition: 'Le logiciel qui détecte les programmes dangereux.' },
    {
      mot: 'Smartphone',
      definition:
        'Le téléphone qui sert aussi à aller sur Internet et à installer des applications.',
    },
    {
      mot: 'Bluetooth',
      definition: 'La liaison sans fil à courte portée, pour un casque ou une enceinte.',
    },
    {
      mot: 'Capture d’écran',
      definition: 'Une photo de ce qui est affiché à cet instant sur le moniteur.',
    },
    { mot: 'Câble', definition: 'Le fil qui relie deux appareils.' },
  ],
};
