import { svg, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Une loupe qui grossit des pixels. État : 'cherche' (la loupe balaie l'image pendant que les
 * chiffres s'éteignent).
 */
export function creerIllustrationZoom() {
  const couleurs = ['ill-accent', 'ill-jaune', 'ill-accent-clair', 'ill-bleu', 'ill-blanc'];
  const pixels = [];
  for (let ligne = 0; ligne < 7; ligne++) {
    for (let colonne = 0; colonne < 7; colonne++) {
      const couleur =
        couleurs[(ligne * 2 + colonne * 3 + ((ligne * colonne) % 3)) % couleurs.length];
      pixels.push(
        svg('rect', {
          x: 30 + colonne * 14,
          y: 22 + ligne * 14,
          width: 14,
          height: 14,
          class: couleur,
        }),
      );
    }
  }
  return creerIllustration({
    nom: 'zoom-mystere',
    dessin: [
      svg(
        'g',
        { class: 'zoom-ill__loupe' },
        // Le manche
        svg('rect', {
          x: -12,
          y: 0,
          width: 24,
          height: 70,
          rx: 11,
          transform: 'translate(116 104) rotate(-45)',
          class: 'ill-accent',
        }),
        svg('rect', {
          x: 2,
          y: 0,
          width: 10,
          height: 70,
          rx: 5,
          transform: 'translate(116 104) rotate(-45)',
          class: 'ill-ombre',
        }),
        // Le verre, avec des pixels grossis
        svg(
          'defs',
          {},
          svg('clipPath', { id: 'ill-zoom-verre' }, svg('circle', { cx: 78, cy: 70, r: 46 })),
        ),
        svg('g', { 'clip-path': 'url(#ill-zoom-verre)' }, ...pixels),
        svg('circle', { cx: 78, cy: 70, r: 46, class: 'zoom-ill__cerclage' }),
        svg('path', { d: 'M46 58 A34 34 0 0 1 64 38', class: 'zoom-ill__reflet' }),
      ),
    ],
  });
}
