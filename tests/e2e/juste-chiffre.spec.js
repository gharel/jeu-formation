import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function proposer(page, nombre) {
  const saisie = page.locator('#juste-saisie');
  await saisie.fill(nombre);
  await saisie.press('Enter');
}

test('Le Juste Chiffre : plus, moins, juste, avec tour de rôle', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'juste-chiffre', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);

  await expect(page.locator('#cadre').getByText('Question 1 sur 5')).toBeVisible();
  await expect(page.locator('.chrono__temps')).toHaveText(/0:(30|29)/);
  await expect(page.getByLabel('Proposition de Ana')).toBeFocused();

  await proposer(page, 'abc');
  await expect(page.locator('#juste-erreur')).toContainText('Tapez un nombre');

  await proposer(page, '1 950');
  await expect(page.locator('.juste__verdict')).toContainText('C’est plus !');
  await expect(page.getByLabel('Proposition de Bob')).toBeVisible();
  await proposer(page, '2000');
  await expect(page.locator('.juste__verdict')).toContainText('C’est moins !');
  await expect(page.locator('.juste__fourchette')).toHaveText('Entre 1950 et 2000');
  await verifierAccessibilite(page);

  // Ana trouve : le point lui revient automatiquement
  await proposer(page, '1989');
  await expect(page.locator('#cadre').getByText('Trouvé par Ana !')).toBeVisible();
  await expect(page.locator('#cadre').getByText('✓ +1 point pour Ana')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('1');

  // Question 2 : on révèle sans trouver
  await page.getByRole('button', { name: 'Question suivante →' }).click();
  await expect(page.locator('#cadre').getByText('Question 2 sur 5')).toBeVisible();
  await page.getByRole('button', { name: 'Révéler la réponse' }).click();
  await expect(page.locator('.reponse-revelee')).toContainText('1992');
  await expect(pointsDe(page, 'Bob')).toHaveText('0');
  expect(erreurs).toEqual([]);
});

test('le minuteur réglé par l’animateur révèle la réponse à zéro', async ({ page }) => {
  await ouvrirJeu(page, 'juste-chiffre');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Temps par question').fill('5');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);
  await expect(page.locator('.chrono__temps')).toHaveText(/0:0[45]/);

  // Pause : le temps se fige
  await page.getByRole('button', { name: '⏸ Pause' }).click();
  const fige = await page.locator('.chrono__temps').textContent();
  await page.waitForTimeout(1500);
  await expect(page.locator('.chrono__temps')).toHaveText(fige);
  await page.getByRole('button', { name: '▶ Reprendre' }).click();

  await expect(page.locator('#cadre').getByText('Temps écoulé !')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.reponse-revelee')).toContainText('1989');
});

test('une marge de 10 % accepte une réponse proche', async ({ page }) => {
  await ouvrirJeu(page, 'juste-chiffre');
  await lancerPartie(page);
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: 'Révéler la réponse' }).click();
    await page.getByRole('button', { name: 'Question suivante →' }).click();
  }
  await expect(page.locator('#cadre').getByText('Question 4 sur 5')).toBeVisible();
  await proposer(page, '2 000 000');
  await expect(page.locator('#cadre').getByText(/Trouvé/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Attribuer/ })).toHaveCount(0);
});
