import { test, expect } from '@playwright/test';
import { exemple as exempleOrdre } from '../../jeux/bon-ordre/exemple.js';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  attribuerPoints,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

const PRENOMS = ['Ana', 'Bob', 'Chloé'];

test('les points de chaque jeu s’additionnent dans les scores du groupe', async ({
  page,
  context,
}) => {
  const erreurs = surveillerErreurs(page);

  // Motus : Ana trouve le premier mot, puis on quitte la partie : le point reste
  await ouvrirJeu(page, 'motus', { prenoms: PRENOMS });
  await lancerPartie(page);
  await page.getByLabel('Proposition du participant').fill('CLAVIER');
  await page.getByLabel('Proposition du participant').press('Enter');
  await attribuerPoints(page, 'Ana');
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  const quitter = page.getByRole('dialog');
  await expect(quitter).toContainText('restent dans les scores du groupe');
  await quitter.getByRole('button', { name: 'Quitter' }).click();

  // La page Groupe, ouverte dans un autre onglet, suit les points en direct
  const onglet = await context.newPage();
  const erreursOnglet = surveillerErreurs(onglet);
  await onglet.goto('/groupe/#scores');
  await onglet.bringToFront();
  await expect(onglet.getByRole('heading', { name: 'Scores' })).toBeFocused();
  await expect(onglet.getByLabel('Score de Ana')).toHaveValue('1');

  // Le Bon Ordre : Bob trouve du premier coup ; chaque jeu repart de zéro dans son tableau
  await ouvrirJeu(page, 'bon-ordre');
  await lancerPartie(page);
  await expect(pointsDe(page, 'Ana')).toHaveText('0');
  const pioche = page.getByRole('list', { name: 'Étapes mélangées' });
  for (const etape of exempleOrdre.elements[0].etapes) {
    await pioche.getByRole('button', { name: new RegExp(etape.slice(0, 15)) }).click();
  }
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await attribuerPoints(page, 'Bob');
  await expect(pointsDe(page, 'Bob')).toHaveText('3');
  await expect(onglet.getByLabel('Score de Bob')).toHaveValue('3');

  // Le classement du groupe, tous jeux confondus, avec le détail par jeu
  await onglet.reload();
  const lignes = onglet.locator('#bloc-scores').getByRole('listitem');
  await expect(lignes).toHaveCount(3);
  await expect(lignes.nth(0)).toContainText('Bob');
  await expect(lignes.nth(0)).toContainText(/Le Bon Ordre\s:\s3/);
  await expect(lignes.nth(1)).toContainText('Ana');
  await expect(lignes.nth(1)).toContainText(/Motus numérique\s:\s1/);
  await expect(lignes.nth(2)).toContainText('Pas encore de point');
  await verifierAccessibilite(onglet);

  // Corriger : − et + (le focus reste sur le bouton), ou le total tapé
  await onglet.bringToFront();
  const plusAna = onglet.getByRole('button', { name: 'Un point de plus pour Ana' });
  await plusAna.click();
  await plusAna.click();
  await expect(onglet.getByLabel('Score de Ana')).toHaveValue('3');
  await expect(plusAna).toBeFocused();
  await expect(lignes.filter({ hasText: 'Ana' })).toContainText(/Correction\s:\s\+2/);
  await expect(lignes.filter({ hasText: 'Ana' }).locator('.scores-groupe__rang')).toHaveText('1.');
  await onglet.getByRole('button', { name: 'Un point de moins pour Bob' }).click();
  await expect(onglet.getByLabel('Score de Bob')).toHaveValue('2');
  await onglet.getByLabel('Score de Chloé').fill('7');
  await onglet.getByLabel('Score de Chloé').press('Tab');
  await expect(lignes.nth(0)).toContainText('Chloé');
  await onglet.reload();
  await expect(onglet.getByLabel('Score de Chloé')).toHaveValue('7');

  // Remettre à zéro, après confirmation
  await onglet.getByRole('button', { name: 'Remettre les scores à zéro' }).click();
  await onglet.getByRole('dialog').getByRole('button', { name: 'Remettre à zéro' }).click();
  for (const prenom of PRENOMS) {
    await expect(onglet.getByLabel(`Score de ${prenom}`)).toHaveValue('0');
  }
  await expect(onglet.locator('#bloc-scores')).toContainText(
    'Pas encore de point : ils s’ajoutent',
  );
  await expect(onglet.getByRole('button', { name: 'Remettre les scores à zéro' })).toBeHidden();
  expect(erreurs).toEqual([]);
  expect(erreursOnglet).toEqual([]);
});

test('une personne retirée du groupe perd ses points ; le fichier du groupe les garde', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/');
  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByLabel('Score de Ana').fill('4');
  await page.getByLabel('Score de Ana').press('Enter');
  await page.getByLabel('Score de Bob').fill('2');
  await page.getByLabel('Score de Bob').press('Enter');
  await expect(page.locator('#bloc-scores').getByRole('listitem').first()).toContainText('Ana');

  // Le fichier exporté contient les points
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter le groupe' }).click();
  const chemin = await (await telechargement).path();
  const { readFile } = await import('node:fs/promises');
  const fichier = JSON.parse(await readFile(chemin, 'utf8'));
  expect(fichier.groupe.participants[0]).toMatchObject({
    prenom: 'Ana',
    points: { correction: 4 },
  });

  await page.getByRole('button', { name: 'Retirer Ana' }).click();
  await expect(page.locator('#bloc-scores').getByRole('listitem')).toHaveCount(1);
  await page.getByLabel('Ajouter un prénom').fill('Ana');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByLabel('Score de Ana')).toHaveValue('0');
  expect(erreurs).toEqual([]);
});
