import { test, expect, devices } from '@playwright/test';
import { JEUX } from '../../assets/js/jeux.js';
import { surveillerErreurs, ouvrirJeu, verifierAccessibilite } from './outils.js';

// Téléphone tactile (écran étroit, ni souris ni clavier), dans le Chromium des tests
const telephone = { ...devices['Pixel 7'] };
delete telephone.defaultBrowserType;

/** Écart (px) entre le centre d'une icône et celui de sa pastille. */
function decentrage(page, pastille) {
  return page
    .locator(pastille)
    .first()
    .evaluate((boite) => {
      const icone = boite.querySelector('.icone').getBoundingClientRect();
      const cadre = boite.getBoundingClientRect();
      return {
        x: Math.abs(icone.left + icone.width / 2 - (cadre.left + cadre.width / 2)),
        y: Math.abs(icone.top + icone.height / 2 - (cadre.top + cadre.height / 2)),
      };
    });
}

/** La page ne doit jamais défiler en largeur. */
async function sansDefilementHorizontal(page) {
  const { large, ecran } = await page.evaluate(() => ({
    large: document.documentElement.scrollWidth,
    ecran: window.innerWidth,
  }));
  expect(large, 'la page déborde en largeur').toBeLessThanOrEqual(ecran);
}

test('sur ordinateur, le bouton Plein écran est là', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await expect(page.getByRole('button', { name: 'Plein écran' })).toBeVisible();
});

test.describe('sur téléphone', () => {
  test.use(telephone);

  test('pas de bouton Plein écran, inutile sur un si petit écran', async ({ page }) => {
    await ouvrirJeu(page, 'motus');
    await expect(page.getByRole('button', { name: 'Son' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plein écran' })).toBeHidden();
  });

  test('les icônes des jeux sont centrées dans leur pastille', async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto('/');
    await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
    const carte = await decentrage(page, '.carte-jeu__icone');
    expect(carte.x).toBeLessThan(1);
    expect(carte.y).toBeLessThan(1);
    await sansDefilementHorizontal(page);
    await verifierAccessibilite(page);

    for (const slug of ['pyramide', 'duel-buzzer']) {
      await ouvrirJeu(page, slug);
      const jeu = await decentrage(page, '.intro__icone');
      expect(jeu.x, slug).toBeLessThan(1);
      expect(jeu.y, slug).toBeLessThan(1);
      await sansDefilementHorizontal(page);
    }
    expect(erreurs).toEqual([]);
  });
});
