import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function proposer(page, texte) {
  await page.getByLabel('Proposition du groupe').fill(texte);
  await page.getByLabel('Proposition du groupe').press('Enter');
}

test('Top 5 : réponses retournées, erreurs, points attribués, question suivante', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'top-5', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const tableau = cadre.getByRole('list', { name: 'Les 5 réponses' });

  await expect(cadre.getByRole('heading', { name: 'Citez un navigateur web.' })).toBeVisible();
  await expect(tableau.getByRole('listitem')).toHaveCount(5);
  await verifierAccessibilite(page);

  // Une variante et une faute de frappe sont reconnues
  await proposer(page, 'firefox');
  await expect(cadre.getByText('« Mozilla Firefox » : 4 points !')).toBeVisible();
  await proposer(page, 'Chrom');
  await expect(tableau).toContainText('Google Chrome');
  await expect(cadre.locator('.top5__score')).toHaveText('9 points sur 15');
  await proposer(page, 'Firefox');
  await expect(cadre.getByText('« Mozilla Firefox » est déjà au tableau !')).toBeVisible();

  // Une proposition absente : une erreur
  await proposer(page, 'Brave');
  await expect(cadre.getByText('« Brave » n’est pas dans le top 5.')).toBeVisible();
  await verifierAccessibilite(page);

  // Les points vont à qui a trouvé
  await page.getByRole('button', { name: /Attribuer les 5 points de/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ana', exact: true }).click();
  await expect(pointsDe(page, 'Ana')).toHaveText('5');
  await expect(tableau).toContainText('+5 Ana');

  // Une réponse dite autrement : l'animateur retourne la case à la main
  await page.getByRole('button', { name: /Réponse 3, cachée/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Retourner' }).click();
  await expect(tableau).toContainText('Microsoft Edge');

  // Deux erreurs de plus : la manche s'arrête et le reste se dévoile
  await page.getByRole('button', { name: 'Mauvaise réponse' }).click();
  await page.getByRole('button', { name: 'Mauvaise réponse' }).click();
  await expect(cadre.getByText(/3 erreurs\s:\sla manche s’arrête/)).toBeVisible();
  await expect(tableau).toContainText('Safari');
  await expect(tableau).toContainText('Opera');
  await expect(page.getByLabel('Proposition du groupe')).toBeHidden();

  // Entrée : question suivante, et cette fois on trouve tout
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Question 2 sur 6')).toBeVisible();
  for (const reponse of ['clé usb', 'souris', 'clavier', 'imprimante', 'disque dur']) {
    await proposer(page, reponse);
  }
  await expect(cadre.getByText(/Les 5 réponses sont trouvées, bravo\s!/)).toBeVisible();
  await expect(cadre.locator('.top5__score')).toHaveText('15 points sur 15');
  expect(erreurs).toEqual([]);
});
