import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  attribuerPoints,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function taper(page, lettre) {
  await page.getByLabel('Lettre proposée').pressSequentially(lettre);
}

test('Batterie faible : lettres, batterie, mot entier et points', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'batterie-faible', { prenoms: ['Ana', 'Bob'] });
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Crans de batterie (mauvaises lettres permises)').fill('3');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  // Mot 1 : CLAVIER, thème affiché
  await expect(cadre.getByText('Thème : Le matériel')).toBeVisible();
  await expect(page.locator('.lettres__case')).toHaveCount(7);
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '3');
  await verifierAccessibilite(page);

  await taper(page, 'a');
  await expect(cadre.getByText('Oui ! 1 « A »')).toBeVisible();
  await taper(page, 'z');
  await expect(cadre.getByText('Pas de « Z » : un cran de batterie en moins.')).toBeVisible();
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '2');
  await expect(cadre.getByText('Lettres absentes : Z')).toBeVisible();
  await taper(page, 'a');
  await expect(cadre.getByText('« A » a déjà été proposée.')).toBeVisible();
  await page.getByRole('button', { name: 'E', exact: true }).click();
  await expect(page.locator('.lettres__case--trouvee')).toHaveCount(2);

  // Le mot entier, d'un coup
  await page.getByLabel('Quelqu’un pense avoir trouvé le mot entier ?').fill('clavier');
  await page.getByRole('button', { name: 'Proposer' }).click();
  await expect(cadre.getByText('Mot découvert !')).toBeVisible();
  await attribuerPoints(page, 'Ana');
  await expect(pointsDe(page, 'Ana')).toHaveText('1');

  // Mot 2 : PIÈCE JOINTE, l'accent se joue avec E
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await taper(page, 'e');
  await expect(page.locator('.lettres__case--trouvee')).toHaveCount(3);
  await expect(page.locator('.lettres__mot')).toContainText('È');

  // Trois mauvaises lettres : batterie à plat, le mot est révélé
  for (const l of ['k', 'w', 'x']) await taper(page, l);
  await expect(cadre.getByText('Batterie à plat !')).toBeVisible();
  await expect(page.locator('.reponse-revelee')).toContainText('PIÈCE JOINTE');
  await expect(page.getByRole('button', { name: /Attribuer/ })).toHaveCount(0);
  await expect(page.locator('.lettres__case--manquante').first()).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('le contenu préparé sous l’ancien nom du jeu est récupéré', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('skazy-jeux:batterie-faible:contenu') === null) {
      localStorage.setItem(
        'skazy-jeux:lettre-a-lettre:contenu',
        JSON.stringify({ reglages: { crans: 5 }, elements: [{ mot: 'Souris', theme: '' }] }),
      );
    }
  });
  await ouvrirJeu(page, 'batterie-faible');
  await expect(page.locator('#cadre').getByText('1 mot prêt')).toBeVisible();
  await lancerPartie(page);
  await expect(page.locator('.lettres__case')).toHaveCount(6);
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '5');
});

test('R et F tapées comme lettres ne déclenchent ni la roue ni le plein écran', async ({
  page,
}) => {
  await ouvrirJeu(page, 'batterie-faible', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  await taper(page, 'r');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'R, déjà proposée' })).toBeDisabled();
});
