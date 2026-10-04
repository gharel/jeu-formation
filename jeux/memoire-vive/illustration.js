import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Une barrette de mémoire vive : ses puces s'allument à mesure que les paires sont trouvées.
 * `progression(trouvees, total)` règle les voyants.
 */
export function creerIllustrationMemoire() {
  const puces = [24, 78, 132, 186].map((x) =>
    svg(
      'g',
      { class: 'memoire-ill__puce' },
      svg('rect', { x, y: 22, width: 34, height: 34, rx: 4, class: 'ill-nuit' }),
      svg('circle', { cx: x + 17, cy: 39, r: 9, class: 'memoire-ill__voyant' }),
    ),
  );
  const contacts = Array.from({ length: 16 }, (_, i) =>
    svg('rect', {
      x: 12 + i * 13 + (i >= 8 ? 10 : 0),
      y: 70,
      width: 8,
      height: 12,
      rx: 2,
      class: 'ill-jaune',
    }),
  );
  const illustration = creerIllustration({
    nom: 'memoire-vive',
    largeur: 240,
    hauteur: 92,
    dessin: [
      ...ombrer(
        'ill-memoire',
        svg('path', {
          d: 'M14 8 H226 Q234 8 234 16 V84 H126 V74 H116 V84 H6 V16 Q6 8 14 8 Z',
          class: 'ill-accent',
        }),
        svg('rect', { x: 6, y: 62, width: 228, height: 30, class: 'ill-ombre' }),
      ),
      ...contacts,
      ...puces,
      svg('rect', { x: 14, y: 12, width: 60, height: 5, rx: 2.5, class: 'ill-reflet' }),
    ],
  });
  /** Allume une puce par quart de paires trouvées. */
  illustration.progression = (trouvees, total) => {
    const allumees = total ? Math.round((puces.length * trouvees) / total) : 0;
    puces.forEach((puce, i) => puce.classList.toggle('memoire-ill__puce--allumee', i < allumees));
  };
  return illustration;
}
