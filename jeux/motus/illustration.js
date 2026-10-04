import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Un écran d'ordinateur et une ligne de lettres colorées, comme sur la grille du jeu :
 * bien placée, mal placée, absente. État : 'trouve' (toutes les lettres justes).
 */
export function creerIllustrationMotus() {
  const lettres = [
    ['M', 'bien'],
    ['O', 'mal'],
    ['T', 'absent'],
    ['U', 'bien'],
    ['S', 'bien'],
  ];
  const tuiles = lettres.map(([lettre, etat], i) => {
    const x = 32 + i * 28;
    return svg(
      'g',
      { class: `motus-ill__tuile motus-ill__tuile--${etat}` },
      svg('rect', { x, y: 30, width: 24, height: 24, rx: 4, class: 'motus-ill__case' }),
      svg('circle', { cx: x + 12, cy: 42, r: 11, class: 'motus-ill__rond' }),
      svg('text', { x: x + 12, y: 43, 'font-size': 15, class: 'motus-ill__lettre' }, lettre),
    );
  });
  const lignesVides = [62, 92].flatMap((y) =>
    Array.from({ length: 5 }, (_, i) =>
      svg('rect', { x: 32 + i * 28, y, width: 24, height: 24, rx: 4, class: 'motus-ill__vide' }),
    ),
  );
  return creerIllustration({
    nom: 'motus',
    hauteur: 170,
    dessin: [
      // Le pied de l'écran
      svg('rect', { x: 90, y: 130, width: 20, height: 22, class: 'ill-nuit' }),
      svg('rect', { x: 56, y: 148, width: 88, height: 14, rx: 7, class: 'ill-nuit' }),
      // L'écran : un cadre aux couleurs du jeu, la grille sombre
      ...ombrer(
        'ill-motus',
        svg('rect', { x: 12, y: 6, width: 176, height: 128, rx: 14, class: 'ill-accent' }),
        svg('rect', { x: 118, y: 74, width: 110, height: 90, rx: 44, class: 'ill-ombre' }),
      ),
      svg('rect', { x: 24, y: 18, width: 152, height: 104, rx: 8, class: 'ill-nuit' }),
      ...tuiles,
      ...lignesVides,
      svg('path', {
        d: 'M24 26 Q24 18 32 18 L78 18 L40 122 L32 122 Q24 122 24 114 Z',
        class: 'motus-ill__reflet',
      }),
      svg('rect', { x: 26, y: 9, width: 36, height: 5, rx: 2.5, class: 'ill-reflet' }),
    ],
  });
}
