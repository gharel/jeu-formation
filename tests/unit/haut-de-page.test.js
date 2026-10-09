import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { creerHautDePage, seuilHautDePage } from '../../assets/js/commun/haut-de-page.js';

/** Fait défiler la fenêtre (jsdom ne défile pas) et attend l'image suivante. */
async function defiler(y) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
  await new Promise((fin) => requestAnimationFrame(fin));
}

describe('bouton « Remonter en haut »', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('apparaît après 1,2 fois la hauteur de la fenêtre', async () => {
    expect(seuilHautDePage(800)).toBe(960);
    const { bouton } = creerHautDePage();
    expect(bouton.getAttribute('aria-label')).toBe('Remonter en haut de la page');
    expect(bouton.classList.contains('haut-de-page--visible')).toBe(false);
    await defiler(959);
    expect(bouton.classList.contains('haut-de-page--visible')).toBe(false);
    await defiler(960);
    expect(bouton.classList.contains('haut-de-page--visible')).toBe(true);
    await defiler(10);
    expect(bouton.classList.contains('haut-de-page--visible')).toBe(false);
  });

  it('remonte en haut et met le focus sur le titre de la page', async () => {
    const titre = document.createElement('h1');
    titre.textContent = 'Le groupe';
    document.body.append(titre);
    const { bouton } = creerHautDePage();
    await defiler(2000);
    bouton.click();
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(titre.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(titre);
  });

  it('se retire pendant une partie', () => {
    const haut = creerHautDePage();
    haut.permettre(false);
    expect(haut.bouton.hidden).toBe(true);
    haut.permettre(true);
    expect(haut.bouton.hidden).toBe(false);
  });
});
