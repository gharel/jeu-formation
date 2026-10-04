import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Une cible et sa flèche. États : 'plus' (la flèche se plante sous le centre : c'est plus),
 * 'moins' (au-dessus : c'est moins), 'juste' (en plein centre).
 */
export function creerIllustrationJuste() {
  const cx = 88;
  const cy = 84;
  return creerIllustration({
    nom: 'juste-chiffre',
    hauteur: 172,
    dessin: [
      // Le chevalet, derrière la cible
      svg('path', { d: `M${cx - 34} 166 L${cx} 120 L${cx + 34} 166`, class: 'ill-trait' }),
      ...ombrer(
        'ill-juste',
        svg('circle', { cx, cy, r: 66, class: 'ill-accent' }),
        svg('circle', { cx: cx + 28, cy: cy + 28, r: 68, class: 'ill-ombre' }),
        [
          svg('circle', { cx, cy, r: 51, class: 'ill-blanc' }),
          svg('circle', { cx, cy, r: 36, class: 'ill-accent' }),
          svg('circle', { cx, cy, r: 21, class: 'ill-blanc' }),
          svg('circle', { cx, cy, r: 9, class: 'ill-rouge' }),
        ],
      ),
      svg('ellipse', {
        cx: cx - 38,
        cy: cy - 36,
        rx: 14,
        ry: 6,
        transform: `rotate(-42 ${cx - 38} ${cy - 36})`,
        class: 'ill-reflet',
      }),
      // La flèche : sa pointe est à l'origine, la page la place selon l'état
      svg(
        'g',
        { class: 'juste-ill__fleche' },
        svg('line', { x1: 8, y1: -8, x2: 66, y2: -66, class: 'ill-trait' }),
        svg('polygon', { points: '0,0 20,-6 6,-20', class: 'ill-nuit' }),
        svg('polygon', { points: '58,-58 80,-62 70,-72 54,-70', class: 'ill-jaune' }),
        svg('polygon', { points: '58,-58 62,-80 72,-70 70,-54', class: 'ill-jaune' }),
      ),
    ],
  });
}
