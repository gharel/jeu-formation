import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

test('Duel buzzer : faux départ refusé, buzz, main adverse, victoire', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'duel-buzzer', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Points pour gagner un duel').fill('2');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);

  // Choix des duellistes
  await page.getByLabel('À gauche, touche A').selectOption('Ana');
  await page.getByLabel('À droite, touche L').selectOption('Ana');
  await page.getByRole('button', { name: 'Commencer le duel' }).click();
  await expect(
    page.locator('#cadre').getByText('Choisissez deux personnes différentes.'),
  ).toBeVisible();
  await page.getByLabel('À droite, touche L').selectOption('Bob');
  await page.getByRole('button', { name: 'Commencer le duel' }).click();

  // Faux départ : rien ne se passe avant la question
  await expect(page.locator('#cadre').getByText('Mains sur les buzzers… Prêts ?')).toBeVisible();
  await page.keyboard.press('a');
  await expect(page.locator('.duel__joueur--main')).toHaveCount(0);
  await verifierAccessibilite(page);

  // Question 1 : Ana buzze et répond juste
  await page.keyboard.press('Enter');
  await expect(
    page.locator('#cadre').getByText('Quel raccourci clavier permet de copier ?'),
  ).toBeVisible();
  await page.keyboard.press('a');
  await page.keyboard.press('l');
  await expect(page.locator('#cadre').getByText('Ana répond !')).toBeVisible();
  await expect(page.locator('.duel__joueur--gauche')).toHaveClass(/duel__joueur--main/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.duel__reponse')).toContainText('Ctrl + C');
  await expect(pointsDe(page, 'Ana')).toHaveText('1');

  // Question 2 : Bob se trompe, la main passe à Ana qui gagne le duel
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('l');
  await expect(page.locator('#cadre').getByText('Bob répond !')).toBeVisible();
  // L'animateur jette un œil à la réponse (sur la question), puis la cache au même endroit
  const apercu = page.locator('#cadre .reponse-apercu');
  const voir = page.getByRole('button', { name: 'Voir la réponse' });
  await expect(apercu).toBeHidden();
  const { x, y, width, height } = await voir.boundingBox();
  await voir.click();
  await expect(apercu).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cacher la réponse' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
  await page.mouse.click(x + width / 2, y + height / 2);
  await expect(apercu).toBeHidden();
  await voir.click();
  await expect(apercu).toBeVisible();
  // Bob se trompe : la réponse se cache avant qu'Ana réponde
  await page.keyboard.press('Backspace');
  await expect(page.locator('#cadre').getByText('Raté ! Ana peut répondre')).toBeVisible();
  await expect(apercu).toBeHidden();
  await expect(voir).toBeVisible();
  await page.getByRole('button', { name: 'Bonne (Entrée)' }).click();
  await expect(page.locator('#cadre').getByText('Ana gagne le duel !')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('2');

  // Nouveau duel, puis fin
  await page.getByRole('button', { name: 'Nouveau duel' }).click();
  await expect(
    page.locator('#cadre').getByText('8 questions · 2 points pour gagner'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tirer au sort' }).click();
  await page.getByRole('button', { name: 'Commencer le duel' }).click();
  await page.getByRole('button', { name: 'Afficher la question (Entrée)' }).click();
  await page.getByRole('button', { name: 'Personne ne sait' }).click();
  await expect(page.locator('#cadre').getByText('Personne ne sait : pas de point.')).toBeVisible();
  await expect(page.locator('.duel__reponse')).toContainText('World Wide Web');
  expect(erreurs).toEqual([]);
});

test('sans prénoms, on joue Gauche contre Droite', async ({ page }) => {
  await ouvrirJeu(page, 'duel-buzzer');
  await lancerPartie(page);
  await page.getByRole('button', { name: 'Commencer le duel' }).click();
  await expect(page.locator('.duel__nom')).toHaveText(['Gauche', 'Droite']);
  await page.keyboard.press('Enter');
  await page.keyboard.press('l');
  await expect(page.locator('#cadre').getByText('Droite répond !')).toBeVisible();
});
