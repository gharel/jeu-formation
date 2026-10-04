import { svg, creerIllustration } from '../../assets/js/commun/illustration.js';

/**
 * Une pyramide de quatre étages, comme les quatre mots d'indice. États : 'etage-1' à 'etage-4'
 * (l'étage en jeu s'allume), 'trouve' (un drapeau se plante au sommet).
 */
export function creerIllustrationPyramide() {
  const etages = [
    { n: 1, x: 80, y: 34, largeur: 40 },
    { n: 2, x: 58, y: 64, largeur: 84 },
    { n: 3, x: 36, y: 94, largeur: 128 },
    { n: 4, x: 14, y: 124, largeur: 172 },
  ];
  return creerIllustration({
    nom: 'pyramide',
    dessin: [
      svg('circle', { cx: 166, cy: 30, r: 18, class: 'ill-jaune' }),
      ...etages.map(({ n, x, y, largeur }) =>
        svg(
          'g',
          { class: `pyramide-ill__etage pyramide-ill__etage--${n}` },
          svg('rect', { x, y, width: largeur, height: 30, rx: 4, class: 'pyramide-ill__pierre' }),
          svg('rect', {
            x: x + largeur * 0.7,
            y,
            width: largeur * 0.3,
            height: 30,
            rx: 4,
            class: 'ill-ombre',
          }),
          svg('rect', {
            x: x + 5,
            y: y + 5,
            width: largeur * 0.32,
            height: 5,
            rx: 2.5,
            class: 'ill-reflet',
          }),
        ),
      ),
      svg(
        'g',
        { class: 'pyramide-ill__drapeau' },
        svg('rect', { x: 98, y: 2, width: 4, height: 34, class: 'ill-nuit' }),
        svg('polygon', { points: '102,4 126,12 102,20', class: 'ill-rouge' }),
      ),
    ],
  });
}
