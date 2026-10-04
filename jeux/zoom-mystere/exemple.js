import { lireImage, enregistrerImage, nettoyerImages } from '../../assets/js/commun/images.js';
import { idsImages } from './logique.js';

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
      aide: '5 paliers : l’image se dézoome d’un cran à chaque fois.',
    },
    {
      cle: 'zoom',
      libelle: 'Zoom de départ',
      type: 'choix',
      options: [
        { valeur: 'moyen', libelle: 'Moyen (× 10)' },
        { valeur: 'fort', libelle: 'Fort (× 16) : pour les grandes captures' },
        { valeur: 'leger', libelle: 'Léger (× 6) : pour les petites images' },
      ],
    },
  ],
  elements: {
    libelle: 'Image',
    pluriel: 'images',
    feminin: true,
    min: 1,
    max: 20,
    champs: [
      {
        cle: 'image',
        libelle: 'Capture d’écran ou image',
        type: 'image',
        requis: true,
        secret: true,
        aide: 'Astuce : Windows + Maj + S pour capturer une zone de l’écran, puis Ctrl + V ici.',
      },
      {
        cle: 'reponse',
        libelle: 'Réponse attendue',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 120,
        exemple: 'Ex. : le menu Fichier',
      },
      {
        cle: 'explication',
        libelle: 'Explication (facultatif)',
        type: 'texte-long',
        exemple: 'Ex. : Il regroupe Ouvrir, Enregistrer et Imprimer.',
        aide: 'Affichée avec la réponse.',
      },
    ],
  },
};

export const exemple = {
  reglages: { dureePalier: 6, zoom: 'moyen' },
  elements: [
    {
      image: { src: 'exemples/barre-outils.svg', focus: { x: 0.045, y: 0.242 } },
      reponse: 'Le bouton Enregistrer (la disquette)',
      explication:
        'Raccourci : Ctrl + S. La disquette a disparu des bureaux, mais pas des logiciels !',
    },
    {
      image: { src: 'exemples/barre-adresse.svg', focus: { x: 0.156, y: 0.123 } },
      reponse: 'Le cadenas de la barre d’adresse',
      explication: 'Il indique une connexion chiffrée (https), pas forcément un site honnête.',
    },
    {
      image: { src: 'exemples/clavier.svg', focus: { x: 0.763, y: 0.205 } },
      reponse: 'La touche à / 0 / @ du clavier',
      explication: 'Alt Gr + à donne l’arobase @, indispensable pour écrire une adresse e-mail.',
    },
    {
      image: { src: 'exemples/bureau.svg', focus: { x: 0.0625, y: 0.107 } },
      reponse: 'La corbeille du bureau',
      explication: 'Les fichiers supprimés y attendent avant d’être effacés pour de bon.',
    },
  ],
};

/**
 * Import et export du contenu (bouton du jeu et page « Les contenus ») : les images enregistrées
 * dans le navigateur partent dans le fichier exporté, et reviennent dans IndexedDB à l'import.
 */
export const transfert = {
  async exporter(contenu) {
    const elements = await Promise.all(
      contenu.elements.map(async (e) => {
        if (!e.image?.id) return e;
        const donnees = await lireImage(e.image.id);
        return { ...e, image: { focus: e.image.focus, donnees } };
      }),
    );
    return { ...contenu, elements };
  },
  async importer(contenu) {
    const elements = await Promise.all(
      (contenu.elements ?? []).map(async (e) => {
        if (typeof e?.image?.donnees !== 'string') return e;
        const id = await enregistrerImage(e.image.donnees);
        return { ...e, image: { id, focus: e.image.focus } };
      }),
    );
    return { ...contenu, elements };
  },
  async apresEnregistrement(contenu) {
    await nettoyerImages(idsImages(contenu)).catch(() => {});
  },
};
