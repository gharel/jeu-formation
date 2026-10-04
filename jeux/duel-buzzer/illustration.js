import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/** Un buzzer de plateau télé et un éclair. État : 'buzze' (le dôme s'enfonce, l'éclair jaillit). */
export function creerIllustrationDuel() {
  return creerIllustration({
    nom: 'duel-buzzer',
    dessin: [
      svg('polygon', {
        points: '150,4 120,62 142,62 126,108 178,42 154,42 170,4',
        class: 'ill-jaune duel-ill__eclair',
      }),
      // Le socle
      svg('rect', { x: 34, y: 112, width: 132, height: 42, rx: 12, class: 'ill-nuit' }),
      svg('rect', { x: 120, y: 112, width: 46, height: 42, rx: 12, class: 'ill-ombre' }),
      svg('ellipse', { cx: 100, cy: 112, rx: 66, ry: 15, class: 'duel-ill__plateau' }),
      // Le dôme rouge
      svg(
        'g',
        { class: 'duel-ill__dome' },
        ...ombrer(
          'ill-duel',
          svg('path', { d: 'M54 112 A46 44 0 0 1 146 112 Z', class: 'ill-accent' }),
          svg('circle', { cx: 132, cy: 124, r: 46, class: 'ill-ombre' }),
        ),
        svg('ellipse', {
          cx: 80,
          cy: 88,
          rx: 13,
          ry: 7,
          transform: 'rotate(-35 80 88)',
          class: 'ill-reflet',
        }),
      ),
    ],
  });
}
