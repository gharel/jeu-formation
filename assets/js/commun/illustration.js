/**
 * Illustrations des jeux : un petit dessin en SVG par jeu (une cible, un coffre, une patate…),
 * dans le même style partout : aplats aux couleurs de la charte, une ombre et un reflet communs,
 * une ombre portée douce (classes .ill-* de composants.css). Elles sont décoratives
 * (aria-hidden) : le texte de la page suffit pour jouer.
 *
 * Chaque jeu dessine la sienne dans jeux/<slug>/illustration.js, avec svg(), puis la fait vivre :
 * etat('juste') pose un état durable (illustration--juste), reagir('hop') rejoue une courte
 * animation (hop, secousse ou fete).
 */
import { el, animer } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const REACTIONS = ['hop', 'secousse', 'fete'];

/** Élément SVG : svg('circle', { cx: 10, cy: 10, r: 5, class: 'ill-accent' }). */
export function svg(balise, attributs = {}, ...enfants) {
  const noeud = document.createElementNS(NS, balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    noeud.setAttribute(cle, String(valeur));
  }
  for (const enfant of enfants.flat(Infinity)) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    noeud.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
  }
  return noeud;
}

/**
 * Une forme et son ombre, découpée dans la forme elle-même : `contour` est la forme (cercle,
 * chemin…), `ombre` l'élément qui assombrit son côté bas-droit, `dedans` ce qui se dessine sur
 * la forme, sous l'ombre. `id` doit être unique dans la page (une seule illustration par jeu).
 */
export function ombrer(id, contour, ombre, dedans = []) {
  const decoupe = svg('clipPath', { id }, contour.cloneNode());
  ombre.setAttribute('clip-path', `url(#${id})`);
  return [svg('defs', {}, decoupe), contour, ...dedans, ombre];
}

/** Étoile à cinq branches centrée en (cx, cy), de rayon r. */
export function etoile(cx, cy, r, classe) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const rayon = i % 2 ? r * 0.45 : r;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + rayon * Math.cos(angle)).toFixed(1)},${(cy + rayon * Math.sin(angle)).toFixed(1)}`;
  });
  return svg('polygon', { points: points.join(' '), class: classe });
}

/**
 * Illustration prête à placer dans la page : { element, etat(nom), reagir(nom) }.
 * `dessin` : les éléments SVG, dans un repère de `largeur` × `hauteur`.
 */
export function creerIllustration({ nom, dessin, largeur = 200, hauteur = 160, classe = '' }) {
  const element = el(
    'div',
    {
      class: `illustration illustration--${nom}${classe ? ` ${classe}` : ''}`,
      'aria-hidden': 'true',
    },
    svg(
      'svg',
      { viewBox: `0 0 ${largeur} ${hauteur}`, class: 'illustration__dessin', focusable: 'false' },
      dessin,
    ),
  );
  let etatActuel = null;
  return {
    element,
    /** Un seul état durable à la fois (null pour revenir au repos). */
    etat(nouveau = null) {
      if (etatActuel) element.classList.remove(`illustration--${etatActuel}`);
      etatActuel = nouveau;
      if (etatActuel) element.classList.add(`illustration--${etatActuel}`);
    },
    get etatActuel() {
      return etatActuel;
    },
    /** Courte animation : 'hop' (petit saut), 'secousse' ou 'fete'. */
    reagir(reaction) {
      for (const r of REACTIONS) element.classList.remove(`illustration--${r}`);
      animer(element, `illustration--${reaction}`);
    },
  };
}
