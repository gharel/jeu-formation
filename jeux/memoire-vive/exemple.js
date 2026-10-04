import { PAIRES_MIN, validerPaire } from './logique.js';

export const schema = {
  elements: {
    libelle: 'Paire',
    pluriel: 'paires',
    feminin: true,
    min: PAIRES_MIN,
    max: 40,
    champs: [
      {
        cle: 'carteA',
        libelle: 'Première carte',
        type: 'texte',
        requis: true,
        longueurMax: 40,
        exemple: 'Ex. : Ctrl + Z',
        aide: 'Un raccourci, un sigle, un mot… Court : il doit tenir sur la carte.',
      },
      {
        cle: 'carteB',
        libelle: 'Seconde carte, qui va avec la première',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 50,
        exemple: 'Ex. : Annuler',
        aide: 'Son action, son sens ou une définition très courte.',
      },
      {
        cle: 'explication',
        libelle: 'Explication affichée quand la paire est trouvée (facultatif)',
        type: 'texte-long',
        longueurMax: 300,
        exemple: 'Ex. : Et Ctrl + Y rétablit ce qui vient d’être annulé.',
      },
    ],
    valider: validerPaire,
  },
};

export const exemple = {
  elements: [
    {
      carteA: 'Ctrl + C',
      carteB: 'Copier',
      explication: 'Le texte copié attend dans le presse-papiers, prêt à être collé.',
    },
    {
      carteA: 'Ctrl + V',
      carteB: 'Coller',
      explication: 'Colle ce qui a été copié ou coupé, autant de fois qu’on veut.',
    },
    {
      carteA: 'Ctrl + Z',
      carteB: 'Annuler',
      explication: 'Et Ctrl + Y rétablit ce qui vient d’être annulé.',
    },
    {
      carteA: 'Ctrl + S',
      carteB: 'Enregistrer',
      explication: 'À faire souvent : une coupure de courant ne prévient pas !',
    },
    {
      carteA: 'Ctrl + P',
      carteB: 'Imprimer',
      explication: 'P comme « print », imprimer en anglais.',
    },
    {
      carteA: 'Ctrl + F',
      carteB: 'Chercher un mot dans la page',
      explication: 'F comme « find », trouver en anglais. Pratique dans un long document.',
    },
    {
      carteA: '@',
      carteB: 'Arobase',
      explication:
        'Elle sépare le nom et le domaine d’une adresse e-mail. Sur un clavier AZERTY : Alt Gr + à.',
    },
    {
      carteA: 'PDF',
      carteB: 'Document à la mise en page figée',
      explication:
        'Il s’affiche pareil sur tous les appareils : idéal pour envoyer un document fini.',
    },
    {
      carteA: 'Wi-Fi',
      carteB: 'Réseau sans fil',
      explication: 'Il relie vos appareils à la box par ondes radio, sans câble.',
    },
    {
      carteA: 'URL',
      carteB: 'Adresse d’une page web',
      explication:
        'Elle s’écrit dans la barre d’adresse du navigateur et commence souvent par https://',
    },
  ],
};
