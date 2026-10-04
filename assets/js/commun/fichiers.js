/**
 * Fichiers JSON échangés avec l'animateur : téléchargement d'un export et nom du fichier.
 */
import { el } from './ui.js';

/** « Google Sheets, mairie » → « google-sheets-mairie » (pour un nom de fichier). */
export function enSlug(texte, longueur = 40) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, longueur)
    .replace(/^-+|-+$/g, '');
}

/** « skazy-groupe-mairie-2026-10-04.json » (sans titre : « skazy-groupe-2026-10-04.json »). */
export function nomDeFichier(prefixe, titre = '', maintenant = new Date()) {
  const date = maintenant.toISOString().slice(0, 10);
  return [prefixe, enSlug(titre), date].filter(Boolean).join('-') + '.json';
}

/** Fait télécharger `donnees` en JSON lisible (indenté). */
export function telechargerJson(nom, donnees) {
  const lien = el('a', {
    href: URL.createObjectURL(
      new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' }),
    ),
    download: nom,
  });
  document.body.append(lien);
  lien.click();
  setTimeout(() => {
    URL.revokeObjectURL(lien.href);
    lien.remove();
  }, 1000);
}
