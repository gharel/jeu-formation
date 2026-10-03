import { test, expect } from '@playwright/test';
import { ouvrirJeu, lancerPartie } from './outils.js';

/** Compte les notes (oscillateurs) et les bruits (clics, applaudissements) créés par la page. */
async function compterLesSons(page) {
  await page.addInitScript(() => {
    window.__sons = { notes: 0, bruits: 0 };
    const original = window.AudioContext.prototype;
    const creerOscillateur = original.createOscillator;
    const creerSource = original.createBufferSource;
    original.createOscillator = function (...args) {
      window.__sons.notes += 1;
      return creerOscillateur.apply(this, args);
    };
    original.createBufferSource = function (...args) {
      window.__sons.bruits += 1;
      return creerSource.apply(this, args);
    };
  });
}

const sonsJoues = (page) => page.evaluate(() => ({ ...window.__sons }));

test.describe('habillage sonore', () => {
  // La roue ne tourne (et ne cliquette) que si l'utilisateur n'a pas demandé à réduire les animations
  test.use({ reducedMotion: 'no-preference' });

  test('la roue cliquette en tournant, puis sonne à l’arrêt', async ({ page }) => {
    await compterLesSons(page);
    await page.goto('/?graine=1');
    await page.getByRole('button', { name: 'Un jeu au hasard' }).click();
    await page.getByRole('button', { name: 'Lancer la roue' }).click();
    await expect(page.locator('.roue-resultat')).not.toBeEmpty({ timeout: 8000 });
    const { bruits, notes } = await sonsJoues(page);
    expect(bruits).toBeGreaterThan(10);
    expect(notes).toBeGreaterThan(0);
  });

  test('Motus joue une note par lettre, puis la fanfare', async ({ page }) => {
    await compterLesSons(page);
    await ouvrirJeu(page, 'motus');
    await lancerPartie(page);
    const avant = (await sonsJoues(page)).notes;
    await page.getByLabel('Proposition du participant').fill('CAPRICE');
    await page.getByLabel('Proposition du participant').press('Enter');
    const apresUnEssai = (await sonsJoues(page)).notes;
    expect(apresUnEssai - avant).toBeGreaterThanOrEqual(7);
    await page.getByLabel('Proposition du participant').fill('CLAVIER');
    await page.getByLabel('Proposition du participant').press('Enter');
    expect((await sonsJoues(page)).notes - apresUnEssai).toBeGreaterThanOrEqual(7 + 8);
  });

  test('le bouton Son coupe tous les sons', async ({ page }) => {
    await compterLesSons(page);
    await ouvrirJeu(page, 'motus');
    await page.getByRole('button', { name: 'Son' }).click();
    await expect(page.getByRole('button', { name: 'Son' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await lancerPartie(page);
    const avant = await sonsJoues(page);
    await page.getByLabel('Proposition du participant').fill('CLAVIER');
    await page.getByLabel('Proposition du participant').press('Enter');
    await expect(page.locator('#cadre').getByText('Trouvé !')).toBeVisible();
    expect(await sonsJoues(page)).toEqual(avant);
  });
});
