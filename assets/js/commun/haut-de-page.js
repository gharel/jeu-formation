/**
 * Bouton « Remonter en haut » des pages qui défilent (accueil, Le groupe, Les contenus, accueil et
 * préparation d'un jeu) : rond, fixe en bas à droite, il apparaît en fondu une fois la page défilée
 * de plus de 1,2 fois la hauteur de la fenêtre. Au clic, la page remonte (en douceur, sauf si
 * l'utilisateur a demandé moins d'animations) et le focus va au titre de la page, pour que la
 * tabulation reparte du haut.
 *
 * Un jeu le retire pendant la partie et sur l'écran de fin (`permettre(false)`) : ces écrans sont
 * projetés, il n'a rien à y faire.
 */
import { el, icone } from './ui.js';

/** Défilement (px) à partir duquel le bouton apparaît, pour une fenêtre de cette hauteur. */
export function seuilHautDePage(hauteurFenetre) {
  return hauteurFenetre * 1.2;
}

export function creerHautDePage() {
  const bouton = el(
    'button',
    {
      type: 'button',
      class: 'haut-de-page',
      'aria-label': 'Remonter en haut de la page',
      title: 'Remonter en haut de la page',
      onclick: remonter,
    },
    icone('arrow-up'),
  );
  document.body.append(bouton);

  let visible = false;
  let prevu = false;

  // Une seule lecture du défilement par image, et la classe ne change que si l'état change
  function mettreAJour() {
    prevu = false;
    const doitSeVoir = window.scrollY >= seuilHautDePage(window.innerHeight);
    if (doitSeVoir === visible) return;
    visible = doitSeVoir;
    bouton.classList.toggle('haut-de-page--visible', visible);
  }

  function surDefilement() {
    if (prevu) return;
    prevu = true;
    requestAnimationFrame(mettreAJour);
  }

  function remonter() {
    const reduire = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduire ? 'auto' : 'smooth' });
    // Le titre de la page, en haut : la tabulation repart de là (sans cadre, voir base.css)
    const titre = document.querySelector('h1');
    if (titre) {
      if (!titre.hasAttribute('tabindex')) titre.setAttribute('tabindex', '-1');
      titre.focus({ preventScroll: true });
    }
  }

  window.addEventListener('scroll', surDefilement, { passive: true });
  window.addEventListener('resize', surDefilement, { passive: true });
  mettreAJour();

  return {
    bouton,
    /** Bouton permis sur cet écran ou non (retiré pendant une partie et sur l'écran de fin). */
    permettre(oui) {
      bouton.hidden = !oui;
    },
  };
}
