/**
 * Roue aléatoire : logique de tirage (pure) et dessin SVG animé.
 */
import { entierEntre } from './hasard.js';

const SVG = 'http://www.w3.org/2000/svg';

/** Couleurs de la charte Skazy Formation : [fond, texte] avec un contraste suffisant. */
const PALETTE = [
  ['#00AEA0', '#0E1027'],
  ['#F7CA45', '#0E1027'],
  ['#374AA5', '#FFFFFF'],
  ['#FF86A5', '#0E1027'],
  ['#009BCA', '#0E1027'],
  ['#FF6E3D', '#0E1027'],
  ['#A977DA', '#0E1027'],
  ['#CEF4F1', '#0E1027'],
];

/** Couleurs des segments, sans que le dernier ait la même couleur que le premier. */
export function couleursRoue(nombre) {
  const couleurs = Array.from({ length: nombre }, (_, i) => PALETTE[i % PALETTE.length]);
  if (nombre > 1 && couleurs[nombre - 1] === couleurs[0]) {
    couleurs[nombre - 1] = PALETTE[(nombre % (PALETTE.length - 2)) + 1];
    if (couleurs[nombre - 1] === couleurs[nombre - 2]) couleurs[nombre - 1] = PALETTE[2];
  }
  return couleurs;
}

/**
 * Tirage au sort. En mode équitable (sans remise), un élément tiré ne revient pas
 * tant que tous les autres ne sont pas sortis ; au nouveau départ, on évite aussi
 * qu'il ressorte immédiatement.
 */
export function creerTirage(elements, { equitable = true, hasard = Math.random } = {}) {
  let tous = [...elements];
  let restants = [...tous];
  let dernier = null;
  return {
    get equitable() {
      return equitable;
    },
    set equitable(valeur) {
      equitable = valeur;
    },
    /** Remplace la liste (par exemple si des prénoms sont ajoutés ou retirés). */
    mettreAJour(nouveaux) {
      const anciens = new Set(tous);
      tous = [...nouveaux];
      restants = [
        ...restants.filter((e) => tous.includes(e)),
        ...tous.filter((e) => !anciens.has(e)),
      ];
    },
    restants() {
      return [...restants];
    },
    /** Renvoie l'index (dans la liste complète) de l'élément tiré, ou -1 si la liste est vide. */
    tirer() {
      if (tous.length === 0) return -1;
      if (equitable && restants.length === 0) restants = [...tous];
      let candidats = equitable ? restants : tous;
      if (candidats.length > 1 && dernier !== null && candidats.includes(dernier)) {
        candidats = candidats.filter((e) => e !== dernier);
      }
      const choisi = candidats[entierEntre(0, candidats.length - 1, hasard)];
      restants = restants.filter((e) => e !== choisi);
      dernier = choisi;
      return tous.indexOf(choisi);
    },
  };
}

/**
 * Angle de rotation (en degrés) pour que le pointeur, placé en haut, s'arrête sur le segment
 * `index`. On ajoute quelques tours complets et un décalage aléatoire dans le segment.
 */
export function angleFinal(
  index,
  nombre,
  { angleActuel = 0, tours = 5, hasard = Math.random } = {},
) {
  const taille = 360 / nombre;
  const decalage = taille * (0.15 + 0.7 * hasard());
  const cible = 360 - (index * taille + decalage);
  const base = Math.ceil(angleActuel / 360) * 360;
  return base + tours * 360 + cible;
}

/** Index du segment situé sous le pointeur pour un angle donné (inverse de angleFinal). */
export function segmentSousPointeur(angle, nombre) {
  const taille = 360 / nombre;
  const normalise = (((360 - (angle % 360)) % 360) + 360) % 360;
  return Math.floor(normalise / taille) % nombre;
}

function point(rayon, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [100 + rayon * Math.cos(a), 100 + rayon * Math.sin(a)];
}

function tronquer(texte, max) {
  return texte.length > max ? `${texte.slice(0, max - 1)}…` : texte;
}

/**
 * Dessine une roue SVG. `couleurs` : liste de couples [fond, texte].
 * `surPassage()` est appelé chaque fois qu'un segment passe sous le pointeur (cliquetis).
 * Renvoie { element, tourner(index) => Promise<index> }.
 */
export function creerRoue(
  libelles,
  couleurs,
  {
    hasard = Math.random,
    longueurMax: longueurImposee,
    taillePolice: policeImposee,
    surPassage = null,
  } = {},
) {
  const conteneur = document.createElement('div');
  conteneur.className = 'roue';
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('roue__svg');

  const disque = document.createElementNS(SVG, 'g');
  disque.classList.add('roue__disque');
  const nombre = Math.max(libelles.length, 1);
  const taille = 360 / nombre;
  const longueurMax = longueurImposee ?? (nombre > 12 ? 9 : nombre > 8 ? 11 : 14);
  const taillePolice = policeImposee ?? (nombre > 12 ? 7 : nombre > 8 ? 8.5 : 10);

  libelles.forEach((libelle, i) => {
    const [fond, encre] = couleurs[i % couleurs.length];
    const debut = i * taille;
    let forme;
    if (nombre === 1) {
      forme = document.createElementNS(SVG, 'circle');
      forme.setAttribute('cx', '100');
      forme.setAttribute('cy', '100');
      forme.setAttribute('r', '96');
    } else {
      const [x1, y1] = point(96, debut);
      const [x2, y2] = point(96, debut + taille);
      forme = document.createElementNS(SVG, 'path');
      forme.setAttribute(
        'd',
        `M100 100 L${x1} ${y1} A96 96 0 ${taille > 180 ? 1 : 0} 1 ${x2} ${y2} Z`,
      );
    }
    forme.setAttribute('fill', fond);
    forme.setAttribute('stroke', '#fff');
    forme.setAttribute('stroke-width', '1.5');
    disque.append(forme);

    const texte = document.createElementNS(SVG, 'text');
    const milieu = debut + taille / 2;
    const [tx, ty] = point(nombre === 1 ? 0 : 60, milieu);
    texte.setAttribute('x', String(tx));
    texte.setAttribute('y', String(ty));
    texte.setAttribute('fill', encre);
    texte.setAttribute('font-size', String(taillePolice));
    texte.setAttribute('font-weight', '700');
    texte.setAttribute('text-anchor', 'middle');
    texte.setAttribute('dominant-baseline', 'middle');
    // Texte le long du rayon, retourné sur la moitié gauche pour rester lisible
    const rotation = milieu > 180 ? milieu + 90 : milieu - 90;
    if (nombre > 1) texte.setAttribute('transform', `rotate(${rotation} ${tx} ${ty})`);
    texte.textContent = tronquer(libelle, longueurMax);
    disque.append(texte);
  });

  const moyeu = document.createElementNS(SVG, 'circle');
  moyeu.setAttribute('cx', '100');
  moyeu.setAttribute('cy', '100');
  moyeu.setAttribute('r', '12');
  moyeu.classList.add('roue__moyeu');

  svg.append(disque, moyeu);
  const pointeur = document.createElement('div');
  pointeur.className = 'roue__pointeur';
  conteneur.append(pointeur, svg);

  let angle = 0;
  return {
    element: conteneur,
    tourner(index) {
      const mouvementReduit = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      angle = angleFinal(index, nombre, {
        angleActuel: angle,
        tours: mouvementReduit ? 0 : 5,
        hasard,
      });
      return new Promise((resoudre) => {
        if (mouvementReduit) {
          disque.style.transition = 'none';
          disque.style.transform = `rotate(${angle}deg)`;
          resoudre(index);
          return;
        }
        let fini = false;
        const terminer = () => {
          if (fini) return;
          fini = true;
          resoudre(index);
        };
        disque.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)';
        // Laisse le navigateur prendre en compte la transition avant de changer l'angle
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            disque.style.transform = `rotate(${angle}deg)`;
          });
        });
        disque.addEventListener('transitionend', terminer, { once: true });
        setTimeout(terminer, 4400);
        // Cliquetis : on suit l'angle réel pendant l'animation
        if (surPassage) {
          let dernier = null;
          const suivre = () => {
            if (fini) return;
            const matrice = new DOMMatrixReadOnly(getComputedStyle(disque).transform);
            const segment = segmentSousPointeur(
              (Math.atan2(matrice.b, matrice.a) * 180) / Math.PI,
              nombre,
            );
            if (dernier !== null && segment !== dernier) surPassage();
            dernier = segment;
            requestAnimationFrame(suivre);
          };
          requestAnimationFrame(suivre);
        }
      });
    },
  };
}
