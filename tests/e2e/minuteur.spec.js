import { test, expect } from '@playwright/test';
import { surveillerErreurs, ouvrirJeu, lancerPartie, verifierAccessibilite } from './outils.js';

/** Horloge simulée : le temps ne passe que quand le test le décide (runFor). */
async function figerHorloge(page) {
  await page.clock.install({ time: new Date('2026-10-05T08:00:00') });
}

const minuteur = (page) => page.locator('.minuteur-manche');

test('le temps par mot se choisit au lancement ; à zéro, une alerte, du temps en plus ou le mot', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await figerHorloge(page);
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob'] });
  // Le minuteur se règle à côté de « Lancer la partie », et reste choisi
  await page.getByLabel('Temps par mot').selectOption('30');
  await page.reload();
  await expect(page.getByLabel('Temps par mot')).toHaveValue('30');
  // L'horloge s'arrête avant la partie : le temps ne passe qu'avec runFor
  await page.clock.pauseAt(new Date('2026-10-05T09:00:00'));
  await lancerPartie(page);
  await expect(minuteur(page).getByRole('timer')).toHaveText('0:30');

  // À zéro, rien ne s'arrête : le chrono passe au rouge et compte le dépassement
  await page.clock.runFor(32_000);
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--depasse/);
  await expect(minuteur(page).getByRole('timer')).toHaveText(/^\+0:0[12]$/);
  await expect(page.getByLabel('Proposition du participant')).toBeVisible();
  await page.clock.resume();
  await verifierAccessibilite(page);

  // +30 s : l'alerte cesse
  await minuteur(page).getByRole('button', { name: '+30 s' }).click();
  await expect(minuteur(page)).not.toHaveClass(/minuteur-manche--depasse/);

  // Ou l'animateur passe : le mot est dévoilé
  await page.clock.runFor(31_000);
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--depasse/);
  await minuteur(page)
    .getByRole('button', { name: /Dévoiler le mot/ })
    .click();
  await expect(page.locator('#cadre').getByText('Pas trouvé cette fois…')).toBeVisible();
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--arrete/);

  // Mot suivant : le temps repart du début
  await page.getByRole('button', { name: /Mot suivant/ }).click();
  await expect(minuteur(page).getByRole('timer')).toHaveText(/0:(30|29)/);
  expect(erreurs).toEqual([]);
});

test('sans limite : pas de chrono pendant la partie', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'top-5');
  await page.getByLabel('Temps par question').selectOption('0');
  await lancerPartie(page);
  await expect(page.getByLabel('Proposition du groupe')).toBeVisible();
  await expect(minuteur(page)).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('Instant défi : l’accueil dit que le temps vient de chaque défi', async ({ page }) => {
  await ouvrirJeu(page, 'instant-defi');
  await expect(page.locator('.intro__minuteur')).toContainText('donné par son début');
});
