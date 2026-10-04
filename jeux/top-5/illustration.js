import { svg, ombrer, etoile, creerIllustration } from '../../assets/js/commun/illustration.js';

/** Un trophée « TOP 5 » entouré d'étoiles. État : 'complet' (les étoiles scintillent). */
export function creerIllustrationTop5() {
  return creerIllustration({
    nom: 'top-5',
    hauteur: 172,
    dessin: [
      svg(
        'g',
        { class: 'top5-ill__etoiles' },
        etoile(28, 44, 15, 'ill-accent'),
        etoile(174, 34, 12, 'ill-jaune'),
        etoile(178, 96, 9, 'ill-accent'),
        etoile(22, 104, 8, 'ill-jaune'),
      ),
      // Les anses
      svg('path', { d: 'M60 36 C26 36 30 88 72 92', class: 'top5-ill__anse' }),
      svg('path', { d: 'M140 36 C174 36 170 88 128 92', class: 'top5-ill__anse' }),
      // La coupe
      ...ombrer(
        'ill-top5',
        svg('path', {
          d: 'M54 20 H146 V50 C146 86 126 106 100 106 C74 106 54 86 54 50 Z',
          class: 'ill-jaune',
        }),
        svg('circle', { cx: 136, cy: 92, r: 50, class: 'ill-ombre' }),
      ),
      svg('ellipse', { cx: 72, cy: 44, rx: 7, ry: 16, class: 'ill-reflet' }),
      svg('text', { x: 100, y: 60, 'font-size': 42, class: 'ill-texte-nuit' }, '5'),
      // Le pied et le socle
      svg('rect', { x: 91, y: 104, width: 18, height: 22, class: 'ill-jaune' }),
      svg('rect', { x: 100, y: 104, width: 9, height: 22, class: 'ill-ombre' }),
      svg('rect', { x: 64, y: 124, width: 72, height: 14, rx: 4, class: 'ill-jaune' }),
      svg('rect', { x: 50, y: 136, width: 100, height: 30, rx: 7, class: 'ill-accent' }),
      svg('text', { x: 100, y: 152, 'font-size': 15, class: 'ill-texte-accent' }, 'TOP'),
    ],
  });
}
