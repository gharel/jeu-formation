/**
 * Images de l'animateur (captures d'écran collées ou importées), gardées dans IndexedDB :
 * localStorage serait trop petit pour plusieurs captures.
 */

const BASE = 'skazy-jeux';
const MAGASIN = 'images';
export const TAILLE_MAX = 15 * 1024 * 1024;

let ouverture = null;

function ouvrir() {
  if (!ouverture) {
    ouverture = new Promise((resoudre, rejeter) => {
      if (!globalThis.indexedDB) {
        rejeter(new Error('Ce navigateur ne permet pas d’enregistrer des images.'));
        return;
      }
      const requete = indexedDB.open(BASE, 1);
      requete.onupgradeneeded = () => requete.result.createObjectStore(MAGASIN);
      requete.onsuccess = () => resoudre(requete.result);
      requete.onerror = () => rejeter(requete.error);
    });
    ouverture.catch(() => {
      ouverture = null;
    });
  }
  return ouverture;
}

async function transaction(mode, action) {
  const base = await ouvrir();
  return new Promise((resoudre, rejeter) => {
    const tx = base.transaction(MAGASIN, mode);
    const requete = action(tx.objectStore(MAGASIN));
    tx.oncomplete = () => resoudre(requete?.result);
    tx.onerror = () => rejeter(tx.error);
    tx.onabort = () => rejeter(tx.error);
  });
}

function nouvelIdentifiant() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Enregistre une image (URL data:) et renvoie son identifiant. */
export async function enregistrerImage(donnees) {
  const id = nouvelIdentifiant();
  await transaction('readwrite', (magasin) => magasin.put(donnees, id));
  return id;
}

export async function lireImage(id) {
  return (await transaction('readonly', (magasin) => magasin.get(id))) ?? null;
}

export async function supprimerImage(id) {
  await transaction('readwrite', (magasin) => magasin.delete(id));
}

/** Supprime les images qui ne sont plus utilisées par aucun contenu. */
export async function nettoyerImages(idsUtilises) {
  const gardes = new Set(idsUtilises);
  const ids = await transaction('readonly', (magasin) => magasin.getAllKeys());
  await Promise.all(ids.filter((id) => !gardes.has(id)).map((id) => supprimerImage(id)));
}

/** Adresse à mettre dans <img src> : image d'exemple, image enregistrée ou image importée. */
export async function adresseImage(image) {
  if (!image) return null;
  if (image.src) return image.src;
  if (image.id) return lireImage(image.id);
  return image.donnees ?? null;
}

/** Lit un fichier image (bouton « Importer » ou glisser-déposer) et renvoie une URL data:. */
export function lireFichierImage(fichier) {
  return new Promise((resoudre, rejeter) => {
    if (!fichier || !fichier.type.startsWith('image/')) {
      rejeter(new Error('Ce fichier n’est pas une image.'));
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      rejeter(new Error('Cette image est trop lourde (15 Mo au maximum).'));
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => resoudre(lecteur.result);
    lecteur.onerror = () => rejeter(new Error('Impossible de lire cette image.'));
    lecteur.readAsDataURL(fichier);
  });
}

/** Image contenue dans un collage (Ctrl+V), ou null. */
export function imageDuCollage(evenement) {
  for (const item of evenement.clipboardData?.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
}
