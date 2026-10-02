import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function paliersCourts(page) {
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Durée de chaque palier').fill('2');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
}

test('Qui suis-je : les points fondent, Stop fige, la bonne réponse marque', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'qui-suis-je', { prenoms: ['Ana', 'Bob'] });
  await paliersCourts(page);
  await lancerPartie(page);

  const indices = page.getByRole('list', { name: 'Indices' }).getByRole('listitem');
  await expect(indices).toHaveCount(1);
  await expect(page.getByRole('list', { name: 'Points en jeu : 5' })).toBeVisible();
  await verifierAccessibilite(page);

  await page.getByRole('button', { name: '▶ Démarrer' }).click();
  await expect(indices).toHaveCount(2, { timeout: 4000 });
  await expect(page.getByRole('list', { name: 'Points en jeu : 4' })).toBeVisible();

  // Stop : le temps se fige
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: '✓ Bonne réponse' })).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(indices).toHaveCount(2);

  await page.getByRole('button', { name: '✓ Bonne réponse' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bob' }).click();
  await expect(page.getByText('✓ +4 points pour Bob')).toBeVisible();
  await expect(pointsDe(page, 'Bob')).toHaveText('4');
  await expect(page.locator('.reponse-revelee')).toContainText('La souris');
  await expect(indices).toHaveCount(5);
  expect(erreurs).toEqual([]);
});

test('sans réponse, la manche se termine à zéro', async ({ page }) => {
  await ouvrirJeu(page, 'qui-suis-je');
  await paliersCourts(page);
  await lancerPartie(page);
  await page.keyboard.press('Space');
  // Mauvaise réponse : on reprend
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: /Mauvaise réponse/ }).click();
  await expect(page.getByText('Personne n’a trouvé…')).toBeVisible({ timeout: 12000 });
  await expect(page.getByRole('list', { name: 'Points en jeu : 0' })).toBeVisible();
  await page.getByRole('button', { name: 'Mystère suivant →' }).click();
  await expect(page.getByText('Mystère 2 sur 5')).toBeVisible();
});
