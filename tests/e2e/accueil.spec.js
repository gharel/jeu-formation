import { test, expect } from '@playwright/test';
import { JEUX } from '../../assets/js/jeux.js';
import { surveillerErreurs, verifierAccessibilite } from './outils.js';

test('l’accueil présente un jeu par carte, avec un lien qui fonctionne', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/');
  await expect(page).toHaveTitle('Mini-jeux · Skazy Formation');
  await expect(page.getByRole('img', { name: 'Skazy Formation' })).toBeVisible();

  const cartes = page.locator('.carte-jeu');
  await expect(cartes).toHaveCount(JEUX.length);
  for (const jeu of JEUX) {
    await expect(page.getByRole('link', { name: jeu.titre })).toHaveAttribute(
      'href',
      `jeux/${jeu.slug}/`,
    );
  }

  await page.getByRole('link', { name: JEUX[0].titre }).click();
  await expect(page.getByRole('heading', { level: 1, name: JEUX[0].titre })).toBeVisible();
  await page.getByRole('link', { name: /retour aux mini-jeux/ }).click();
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  expect(erreurs).toEqual([]);
});

test('l’accueil est accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  await verifierAccessibilite(page);
});

test.describe('chaque jeu', () => {
  for (const jeu of JEUX) {
    test(`${jeu.titre} : accueil, préparation et participants partagés`, async ({ page }) => {
      const erreurs = surveillerErreurs(page);
      await page.goto(`/jeux/${jeu.slug}/`);
      await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
      await expect(
        page.locator('#cadre').getByText('contenu d’exemple', { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /Lancer la partie/ })).toBeEnabled();
      await verifierAccessibilite(page);

      // Les prénoms saisis ici se retrouvent dans les autres jeux
      await page.getByLabel('Ajouter un prénom').fill('Ana, Bob');
      await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('list', { name: 'Participants' })).toContainText('Ana');

      await page.getByRole('button', { name: /Préparer le contenu/ }).click();
      await expect(page.getByRole('heading', { name: 'Préparer le contenu' })).toBeVisible();
      await expect(page.locator('.editeur')).toHaveClass(/editeur--masque/);
      await verifierAccessibilite(page);
      await page.getByRole('button', { name: 'Annuler' }).click();
      await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
      expect(erreurs).toEqual([]);
    });
  }
});

test('la roue désigne chacun une fois avant de recommencer', async ({ page }) => {
  await page.goto(`/jeux/${JEUX[0].slug}/?graine=3`);
  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob, Chloé');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  // La touche R est ignorée pendant la saisie d'un prénom
  await page.keyboard.press('r');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('heading', { name: 'Comment on joue ?' }).click();
  const tires = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('r');
    const dialogue = page.getByRole('dialog', { name: /Désigner/ });
    await dialogue.getByRole('button', { name: /Lancer la roue|Relancer/ }).click();
    const resultat = dialogue.locator('.roue-resultat');
    await expect(resultat).not.toBeEmpty();
    tires.push(await resultat.textContent());
    await dialogue.getByRole('button', { name: /C’est parti/ }).click();
    await expect(dialogue).toBeHidden();
  }
  expect([...tires].sort()).toEqual(['Ana', 'Bob', 'Chloé']);
});
