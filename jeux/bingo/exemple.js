import { MOTS_MIN } from './logique.js';

export const schema = {
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
  ],
};
