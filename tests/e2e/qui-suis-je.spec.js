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

  // Aucun indice avant « Démarrer » : seulement sa place
  const indices = page.getByRole('list', { name: 'Indices' }).getByRole('listitem');
  const attente = page.locator('#cadre').getByText('Le premier indice apparaît au démarrage.');
  await expect(indices).toHaveCount(0);
  await expect(attente).toBeVisible();
  await expect(page.getByRole('list', { name: 'Points en jeu : 5' })).toBeVisible();
  await verifierAccessibilite(page);

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(indices).toHaveCount(1);
  await expect(attente).toHaveCount(0);
  await expect(indices).toHaveCount(2, { timeout: 4000 });
  await expect(page.getByRole('list', { name: 'Points en jeu : 4' })).toBeVisible();

  // Stop : le temps se fige
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Bonne réponse' })).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(indices).toHaveCount(2);

  await page.getByRole('button', { name: 'Bonne réponse' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bob' }).click();
  await expect(page.locator('#cadre').getByText('+4 points pour Bob')).toBeVisible();
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
  await expect(page.locator('#cadre').getByText('Personne n’a trouvé…')).toBeVisible({
    timeout: 12000,
  });
  await expect(page.getByRole('list', { name: 'Points en jeu : 0' })).toBeVisible();
  await page.getByRole('button', { name: 'Mystère suivant' }).click();
  await expect(page.locator('#cadre').getByText('Mystère 2 sur 5')).toBeVisible();
});

test('Voir la réponse : on juge la proposition, les points vont à plusieurs personnes', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'qui-suis-je', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: /Stop/ }).click();
  // La réponse se pose à la place de « Qui suis-je ? » : rien ne bouge
  const apercu = cadre.locator('.reponse-apercu');
  const titre = cadre.getByRole('heading', { name: 'Qui suis-je ?', exact: true });
  const voir = page.getByRole('button', { name: 'Voir la réponse' });
  await expect(apercu).toBeHidden();
  const { x, y, width, height } = await voir.boundingBox();
  await voir.click();
  await expect(apercu).toBeVisible();
  await expect(apercu).toContainText('La souris');
  await expect(titre).toBeHidden();
  // Réponse affichée : on ne reprend plus, on juge… ou on la cache aussitôt
  await expect(page.getByRole('button', { name: /on reprend/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cacher la réponse' })).toBeFocused();
  await verifierAccessibilite(page);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
  // Un second clic au même endroit la cache : on peut reprendre
  await page.mouse.click(x + width / 2, y + height / 2);
  await expect(apercu).toBeHidden();
  await expect(titre).toBeVisible();
  await expect(page.getByRole('button', { name: /on reprend/ })).toBeVisible();
  // Espace aussi
  await voir.click();
  await expect(apercu).toBeVisible();
  await page.keyboard.press('Space');
  await expect(apercu).toBeHidden();
  await voir.click();
  await expect(apercu).toBeVisible();

  // Deux personnes ont trouvé ensemble
  await page.getByRole('button', { name: 'Bonne réponse' }).click();
  const dialogue = page.getByRole('dialog', { name: /Qui a trouvé/ });
  await expect(dialogue.getByRole('button', { name: 'Tout le monde', exact: true })).toBeVisible();
  await dialogue.getByRole('button', { name: 'Plusieurs personnes' }).click();
  await dialogue.getByRole('button', { name: 'Ana', exact: true }).click();
  await dialogue.getByRole('button', { name: 'Chloé', exact: true }).click();
  await verifierAccessibilite(page);
  await dialogue.getByRole('button', { name: 'Valider' }).click();
  await expect(cadre.getByText('+5 points pour Ana et Chloé')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('5');
  await expect(pointsDe(page, 'Chloé')).toHaveText('5');
  await expect(pointsDe(page, 'Bob')).toHaveText('0');

  // Mystère 2 : la réponse affichée montre que la proposition était fausse
  await page.getByRole('button', { name: 'Mystère suivant' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: /Stop/ }).click();
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await expect(apercu).toContainText('Échap');
  await page.getByRole('button', { name: 'Mauvaise réponse' }).click();
  await expect(cadre.getByText('Personne n’a trouvé…')).toBeVisible();
  await expect(apercu).toBeHidden();
  await expect(cadre.locator('.reponse-revelee')).toContainText('Échap');

  // Mystère 3 : tout le monde a trouvé
  await page.getByRole('button', { name: 'Mystère suivant' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: /Stop/ }).click();
  await page.getByRole('button', { name: 'Bonne réponse' }).click();
  await dialogue.getByRole('button', { name: 'Tout le monde', exact: true }).click();
  await expect(cadre.getByText('+5 points pour tout le monde')).toBeVisible();
  await expect(pointsDe(page, 'Bob')).toHaveText('5');
  await expect(pointsDe(page, 'Ana')).toHaveText('10');
  expect(erreurs).toEqual([]);
});
