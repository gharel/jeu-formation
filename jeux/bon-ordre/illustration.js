import { svg, creerIllustration } from '../../assets/js/commun/illustration.js';

/** Trois cartes numérotées. État : 'range' (elles s'alignent dans l'ordre), sinon en vrac. */
export function creerIllustrationOrdre() {
  const carte = (n) =>
    svg(
      'g',
      { class: `ordre-ill__carte ordre-ill__carte--${n}` },
      svg('rect', { x: -30, y: -40, width: 60, height: 80, rx: 9, class: 'ordre-ill__fond' }),
      svg('rect', { x: 2, y: -40, width: 28, height: 80, rx: 9, class: 'ordre-ill__ombre' }),
      svg('text', { x: 0, y: -10, 'font-size': 34, class: 'ill-texte-nuit' }, String(n)),
      svg('rect', { x: -18, y: 14, width: 36, height: 6, rx: 3, class: 'ill-accent' }),
      svg('rect', { x: -18, y: 25, width: 24, height: 6, rx: 3, class: 'ill-accent' }),
    );
  return creerIllustration({
    nom: 'bon-ordre',
    hauteur: 150,
    dessin: [carte(2), carte(3), carte(1)],
  });
}
