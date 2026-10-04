import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/** Un chronomètre de poche. État : 'en-cours' (l'aiguille tourne pendant le défi). */
export function creerIllustrationDefi() {
  const cx = 100;
  const cy = 104;
  const graduations = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    const grande = i % 3 === 0;
    const r1 = grande ? 37 : 42;
    return svg('line', {
      x1: (cx + r1 * Math.sin(angle)).toFixed(1),
      y1: (cy - r1 * Math.cos(angle)).toFixed(1),
      x2: (cx + 47 * Math.sin(angle)).toFixed(1),
      y2: (cy - 47 * Math.cos(angle)).toFixed(1),
      class: `defi-ill__graduation${grande ? ' defi-ill__graduation--grande' : ''}`,
    });
  });
  return creerIllustration({
    nom: 'instant-defi',
    hauteur: 172,
    dessin: [
      // Le remontoir et le bouton du côté
      svg('rect', { x: 92, y: 18, width: 16, height: 18, class: 'ill-nuit' }),
      svg('rect', { x: 80, y: 6, width: 40, height: 16, rx: 6, class: 'ill-nuit' }),
      svg('rect', {
        x: 146,
        y: 32,
        width: 24,
        height: 13,
        rx: 5,
        transform: 'rotate(42 158 38)',
        class: 'ill-nuit',
      }),
      ...ombrer(
        'ill-defi',
        svg('circle', { cx, cy, r: 64, class: 'ill-accent' }),
        svg('circle', { cx: cx + 28, cy: cy + 28, r: 66, class: 'ill-ombre' }),
      ),
      svg('circle', { cx, cy, r: 50, class: 'ill-blanc' }),
      ...graduations,
      svg(
        'g',
        { class: 'defi-ill__aiguille' },
        svg('line', { x1: cx, y1: cy, x2: cx, y2: cy - 38, class: 'ill-trait' }),
      ),
      svg('circle', { cx, cy, r: 7, class: 'ill-nuit' }),
      svg('ellipse', {
        cx: 66,
        cy: 60,
        rx: 15,
        ry: 7,
        transform: 'rotate(-40 66 60)',
        class: 'ill-reflet',
      }),
    ],
  });
}
