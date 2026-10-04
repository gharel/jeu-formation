import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

test('Pyramide : faire deviner un mot à son binôme en 1, 2, 3 ou 4 mots', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const fait = page.getByLabel('Fait deviner');
  const devine = page.getByLabel('Devine, dos à l’écran');
  const cestParti = page.getByRole('button', { name: 'C’est parti !' });

  // Choix du binôme : deux personnes différentes
  await expect(cadre.getByText('10 mots à faire deviner · 2 par binôme')).toBeVisible();
  await fait.selectOption('Ana');
  await devine.selectOption('Ana');
  await cestParti.click();
  await expect(cadre.getByText('Choisissez deux personnes différentes.')).toBeVisible();
  await devine.selectOption('Bob');
  await cestParti.click();

  // Mot 1 : caché le temps que Bob tourne le dos à l'écran
  await expect(cadre.getByText('Mot 1 sur 10')).toBeVisible();
  await expect(cadre.getByText('Ana fait deviner à Bob')).toBeVisible();
  await expect(cadre.getByText('Bob, dos à l’écran !')).toBeVisible();
  await expect(page.locator('.pyramide__mot')).toHaveCount(0);
  await verifierAccessibilite(page);

  // Espace : le mot s'affiche, 1er mot d'indice au sommet de la pyramide (4 points)
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toHaveText('Souris');
  const etages = page
    .getByRole('list', { name: 'Points selon le nombre de mots d’indice' })
    .getByRole('listitem');
  await expect(etages).toHaveCount(4);
  await expect(etages.nth(0)).toHaveAttribute('aria-current', 'step');
  await expect(etages.nth(0)).toContainText('1 mot');
  await expect(etages.nth(0)).toContainText('4 points');
  await expect(cadre.getByText('1er mot d’indice : 4 points en jeu')).toBeVisible();
  await verifierAccessibilite(page);

  // Raté au 1er mot d'indice (Espace), trouvé au 2e (Entrée) : 3 points pour Ana et pour Bob
  await page.keyboard.press('Space');
  await expect(etages.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(etages.nth(0)).toContainText('raté');
  await expect(page.getByRole('button', { name: 'Trouvé ! 3 points' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Trouvé en 2 mots d’indice !')).toBeVisible();
  await expect(cadre.getByText('+3 points pour Ana et Bob')).toBeVisible();
  await expect(cadre.getByText('Bob, vous pouvez vous retourner !')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('3');
  await expect(pointsDe(page, 'Bob')).toHaveText('3');
  await verifierAccessibilite(page);

  // Mot 2 : les rôles s'inversent ; un indice interdit est une faute, le mot est perdu
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await expect(cadre.getByText('Bob fait deviner à Ana')).toBeVisible();
  await expect(cadre.getByText('Ana, dos à l’écran !')).toBeVisible();
  await page.getByRole('button', { name: 'Afficher le mot' }).click();
  await expect(page.locator('.pyramide__mot')).toHaveText('Corbeille');
  await page.getByRole('button', { name: 'Faute' }).click();
  await expect(cadre.getByText('Faute : le mot est perdu.')).toBeVisible();
  await expect(pointsDe(page, 'Bob')).toHaveText('3');

  // Binôme suivant : le tirage fait d'abord jouer Chloé, qui n'a pas encore joué
  await page.getByRole('button', { name: 'Binôme suivant' }).click();
  await expect(fait).toHaveValue('Chloé');
  await cestParti.click();

  // Mot 3 : quatre mots d'indice sans succès, pas de point
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toHaveText('Wi-Fi');
  for (let i = 0; i < 3; i++) await page.keyboard.press('Space');
  await expect(etages.nth(3)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Trouvé ! 1 point' })).toBeVisible();
  await page.getByRole('button', { name: 'Raté : mot perdu' }).click();
  await expect(cadre.getByText('Pas trouvé en 4 mots…')).toBeVisible();
  await expect(pointsDe(page, 'Chloé')).toHaveText('0');

  // Les mots suivants, trouvés du premier coup (4 points), jusqu'au classement
  await page.keyboard.press('Space');
  for (let numero = 4; numero <= 10; numero++) {
    if (numero % 2 === 1) await cestParti.click();
    await expect(cadre.getByText(`Mot ${numero} sur 10`)).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await expect(cadre.getByText('Trouvé en 1 mot d’indice !')).toBeVisible();
    if (numero < 10) await page.keyboard.press('Space');
  }
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  await expect(cadre.getByText('Tous les mots de la pyramide ont été joués.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Podium' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('sans prénoms, on joue quand même par deux, rôles inversés à chaque mot', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide');
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await expect(cadre.getByText('Par deux : l’un fait deviner, l’autre devine.')).toBeVisible();
  await expect(cadre.getByText('La personne qui devine : dos à l’écran !')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('+4 points pour le binôme')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(cadre.getByText('On inverse les rôles !')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(
    cadre.getByText('Au binôme suivant : l’un fait deviner, l’autre devine.'),
  ).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('on prépare une simple liste de mots, sans indices', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob'] });
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByRole('button', { name: 'Vider la liste' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vider' }).click();
  await expect(page.getByLabel(/Indice/)).toHaveCount(0);
  await page.getByLabel('Mot à faire deviner', { exact: true }).fill('Écran');
  await page.getByLabel('Mots à faire deviner par binôme').fill('1');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('1 mot prêt')).toBeVisible();

  await lancerPartie(page);
  await expect(
    page.locator('#cadre').getByText('1 mot à faire deviner · 1 par binôme'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toHaveText('Écran');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  expect(erreurs).toEqual([]);
});
