import { svg, ombrer, creerIllustration } from '../../assets/js/commun/illustration.js';

/** Un personnage masqué et sa bulle « ? ». État : 'trouve' (la bulle dit « ! »). */
export function creerIllustrationQuiSuisJe() {
  return creerIllustration({
    nom: 'qui-suis-je',
    dessin: [
      // Le personnage mystère, masqué
      svg('path', { d: 'M18 160 C18 112 122 112 122 160 Z', class: 'ill-nuit' }),
      svg('circle', { cx: 70, cy: 72, r: 32, class: 'ill-nuit' }),
      svg('rect', { x: 36, y: 60, width: 68, height: 18, rx: 9, class: 'ill-accent' }),
      svg('rect', { x: 36, y: 70, width: 68, height: 8, rx: 4, class: 'ill-ombre' }),
      svg('ellipse', { cx: 57, cy: 69, rx: 6, ry: 5, class: 'ill-blanc' }),
      svg('ellipse', { cx: 83, cy: 69, rx: 6, ry: 5, class: 'ill-blanc' }),
      svg('ellipse', {
        cx: 54,
        cy: 50,
        rx: 9,
        ry: 4,
        transform: 'rotate(-32 54 50)',
        class: 'quisuisje-ill__reflet',
      }),
      // La bulle de pensée
      ...ombrer(
        'ill-quisuisje',
        svg('path', {
          d: 'M130 8 H178 Q194 8 194 24 V58 Q194 74 178 74 H150 L128 92 L134 74 H130 Q114 74 114 58 V24 Q114 8 130 8 Z',
          class: 'ill-accent',
        }),
        svg('circle', { cx: 190, cy: 82, r: 44, class: 'ill-ombre' }),
      ),
      svg('rect', { x: 124, y: 14, width: 26, height: 5, rx: 2.5, class: 'ill-reflet' }),
      svg(
        'text',
        {
          x: 154,
          y: 42,
          'font-size': 46,
          class: 'quisuisje-ill__signe quisuisje-ill__signe--question',
        },
        '?',
      ),
      svg(
        'text',
        {
          x: 154,
          y: 42,
          'font-size': 46,
          class: 'quisuisje-ill__signe quisuisje-ill__signe--trouve',
        },
        '!',
      ),
    ],
  });
}
