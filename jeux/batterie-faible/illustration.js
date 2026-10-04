import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Un téléphone qui suit sa batterie : il sourit quand elle est pleine, transpire quand elle
 * faiblit, s'éteint à plat. `niveau(restants, total)` règle la jauge et l'expression.
 */
export function creerIllustrationBatterie() {
  const jauge = svg('rect', {
    x: 61,
    y: 38,
    width: 32,
    height: 12,
    rx: 2,
    class: 'batterie-ill__jauge',
  });
  const illustration = creerIllustration({
    nom: 'batterie-faible',
    largeur: 160,
    hauteur: 200,
    dessin: [
      ...ombrer(
        'ill-batterie',
        svg('rect', { x: 26, y: 6, width: 108, height: 188, rx: 20, class: 'ill-nuit' }),
        svg('rect', { x: 110, y: 6, width: 30, height: 188, class: 'batterie-ill__tranche' }),
      ),
      svg('rect', { x: 36, y: 22, width: 88, height: 156, rx: 10, class: 'batterie-ill__ecran' }),
      // La batterie, en haut de l'écran
      svg('rect', { x: 58, y: 35, width: 38, height: 18, rx: 4, class: 'batterie-ill__contour' }),
      svg('rect', { x: 96, y: 40, width: 4, height: 8, rx: 1, class: 'ill-nuit' }),
      jauge,
      // Le visage
      svg('circle', { cx: 64, cy: 98, r: 6, class: 'ill-nuit batterie-ill__oeil' }),
      svg('circle', { cx: 96, cy: 98, r: 6, class: 'ill-nuit batterie-ill__oeil' }),
      svg('path', {
        d: 'M58 92 L70 104 M70 92 L58 104 M90 92 L102 104 M102 92 L90 104',
        class: 'ill-trait batterie-ill__croix',
      }),
      svg('path', {
        d: 'M62 124 Q80 140 98 124',
        class: 'ill-trait batterie-ill__bouche batterie-ill__bouche--sourire',
      }),
      svg('path', {
        d: 'M64 134 Q80 122 96 134',
        class: 'ill-trait batterie-ill__bouche batterie-ill__bouche--inquiete',
      }),
      svg('path', {
        d: 'M112 66 Q122 82 112 86 Q102 82 112 66 Z',
        class: 'ill-bleu batterie-ill__goutte',
      }),
      svg('rect', { x: 66, y: 184, width: 28, height: 4, rx: 2, class: 'ill-reflet' }),
    ],
  });
  /** Jauge et expression selon les crans restants. */
  illustration.niveau = (restants, total) => {
    const part = total ? Math.max(0, restants) / total : 0;
    jauge.setAttribute('width', String(Math.max(0, 32 * part)));
    let etat = 'pleine';
    if (part <= 0) etat = 'vide';
    else if (part <= 0.25) etat = 'faible';
    else if (part <= 0.5) etat = 'moyenne';
    illustration.etat(etat);
  };
  return illustration;
}
