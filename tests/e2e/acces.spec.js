import { test, expect } from '@playwright/test';
import { surveillerErreurs, verifierAccessibilite } from './outils.js';

// Navigateur neuf : personne n'a encore saisi le mot de passe
test.use({ storageState: { cookies: [], origins: [] } });

test('l’accueil demande le mot de passe et refuse un mauvais', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/');
  const porte = page.getByRole('dialog', { name: 'Accès réservé' });
  await expect(porte).toBeVisible();
  await expect(page.getByLabel('Mot de passe')).toBeFocused();
  // Aucun jeu n'est affiché tant que l'accès n'est pas ouvert
  await expect(page.locator('.carte-jeu')).toHaveCount(0);
  await verifierAccessibilite(page);

  await page.getByLabel('Mot de passe').fill('pas le bon');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(porte.getByRole('alert')).toHaveText('Mot de passe incorrect.');
  await expect(page.getByLabel('Mot de passe')).toHaveValue('');
  await expect(page.locator('.carte-jeu')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('un jeu ouvert directement par son adresse demande aussi le mot de passe', async ({
  page,
}) => {
  await page.goto('/jeux/motus/');
  await expect(page.getByRole('dialog', { name: 'Accès réservé' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toHaveCount(0);
});

test('une fois l’accès ouvert, « Verrouiller » le referme', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  // Même état que juste après la saisie du bon mot de passe (empreinte enregistrée)
  const { EMPREINTE } = await import('../../assets/js/commun/acces.js');
  await page.addInitScript((empreinte) => {
    if (!sessionStorage.getItem('deja-ouvert')) {
      sessionStorage.setItem('deja-ouvert', '1');
      localStorage.setItem('skazy-jeux:acces', JSON.stringify(empreinte));
    }
  }, EMPREINTE);
  await page.goto('/');
  await expect(page.locator('.carte-jeu').first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Accès réservé' })).toHaveCount(0);

  await page.getByRole('button', { name: /Verrouiller l’accès/ }).click();
  await expect(page.getByRole('dialog', { name: 'Accès réservé' })).toBeVisible();
  await expect(page.locator('.carte-jeu')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});
