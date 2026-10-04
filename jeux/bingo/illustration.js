import { svg, creerIllustration } from '../../assets/js/commun/illustration.js';
import { animer } from '../../assets/js/commun/ui.js';

/** Une sphère de loto pleine de boules. `melanger()` la fait tourner pour un tirage. */
export function creerIllustrationBingo() {
  const boules = [
    [76, 104, 'ill-jaune'],
    [102, 116, 'ill-rose'],
    [128, 102, 'ill-bleu'],
    [88, 78, 'ill-orange'],
    [116, 80, 'ill-violet'],
    [62, 82, 'ill-accent'],
    [104, 54, 'ill-blanc'],
    [138, 74, 'ill-jaune'],
  ];
  const illustration = creerIllustration({
    nom: 'bingo',
    hauteur: 180,
    dessin: [
      // Le pied
      svg('path', { d: 'M100 144 L70 168 M100 144 L130 168', class: 'ill-trait' }),
      svg('rect', { x: 48, y: 164, width: 104, height: 12, rx: 6, class: 'ill-nuit' }),
      // La sphère et ses boules
      svg('circle', { cx: 100, cy: 86, r: 60, class: 'ill-accent-clair' }),
      svg(
        'g',
        { class: 'bingo-ill__boules' },
        ...boules.map(([cx, cy, couleur]) => [
          svg('circle', { cx, cy, r: 12, class: couleur }),
          svg('circle', { cx: cx - 4, cy: cy - 4, r: 3.5, class: 'ill-reflet' }),
        ]),
      ),
      svg('circle', { cx: 100, cy: 86, r: 60, class: 'bingo-ill__cage' }),
      svg('ellipse', { cx: 100, cy: 86, rx: 60, ry: 22, class: 'bingo-ill__fil' }),
      svg('ellipse', { cx: 100, cy: 86, rx: 22, ry: 60, class: 'bingo-ill__fil' }),
      svg('ellipse', {
        cx: 70,
        cy: 50,
        rx: 15,
        ry: 7,
        transform: 'rotate(-38 70 50)',
        class: 'ill-reflet',
      }),
      // La manivelle
      svg('path', { d: 'M160 86 H180 V108', class: 'ill-trait' }),
      svg('circle', { cx: 180, cy: 112, r: 8, class: 'ill-accent' }),
      svg('circle', { cx: 100, cy: 86, r: 7, class: 'ill-nuit' }),
    ],
  });
  /** La sphère tourne : les boules se mélangent. */
  illustration.melanger = () => animer(illustration.element, 'bingo-ill--melange');
  return illustration;
}
