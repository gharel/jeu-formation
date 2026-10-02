import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

test('Pyramide : 3, 2 ou 1 point selon le nombre d’indices', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  // Mot 1 : seul le premier indice est visible, le nombre de lettres est affiché
  await expect(cadre.getByText('Mot 1 sur 6')).toBeVisible();
  await expect(cadre.getByText('6 lettres')).toBeVisible();
  const etages = page.getByRole('list', { name: 'Indices' }).getByRole('listitem');
  await expect(etages.nth(0)).toContainText('Rongeur');
  await expect(etages.nth(1)).not.toContainText('Molette');
  await verifierAccessibilite(page);

  // Indice suivant (Espace), puis trouvé : 2 points
  await page.keyboard.press('Space');
  await expect(etages.nth(1)).toContainText('Molette');
  await page.getByRole('button', { name: /Trouvé ! \(2 points\)/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bob' }).click();
  await expect(cadre.getByText('Trouvé par Bob !')).toBeVisible();
  await expect(cadre.getByText('+2 points pour Bob')).toBeVisible();
  await expect(pointsDe(page, 'Bob')).toHaveText('2');
  await expect(page.getByRole('list', { name: 'Indices' })).toContainText('Clic');

  // Mot 2 : trouvé dès le premier indice, 3 points
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await page.getByRole('button', { name: /Trouvé ! \(3 points\)/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ana' }).click();
  await expect(pointsDe(page, 'Ana')).toHaveText('3');

  // Mot 3 : personne ne trouve après le 3e indice
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await page.getByRole('button', { name: 'Indice suivant (Espace)' }).click();
  await page.getByRole('button', { name: 'Indice suivant (Espace)' }).click();
  await expect(page.getByRole('button', { name: /Trouvé ! \(1 point\)/ })).toBeVisible();
  await page.getByRole('button', { name: 'Personne n’a trouvé' }).click();
  await expect(cadre.getByText('Personne n’a trouvé…')).toBeVisible();
  await expect(page.locator('.pyramide__case--revelee')).toHaveCount(4);
  expect(erreurs).toEqual([]);
});

test('l’éditeur refuse un indice de plusieurs mots ou qui reprend le mot', async ({ page }) => {
  await ouvrirJeu(page, 'pyramide');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  const premier = page.locator('.editeur__element').first();
  await expect(premier.getByRole('button', { name: /Retirer indice/ }).first()).toBeDisabled();
  await premier.getByLabel('Indice 2', { exact: true }).fill('petit animal');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Mot 1 : l’indice 2 (« petit animal ») doit être un seul mot.',
  );
  await premier.getByLabel('Indice 2', { exact: true }).fill('Souris');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('alert')).toContainText('ne doit pas reprendre le mot à deviner');
});
