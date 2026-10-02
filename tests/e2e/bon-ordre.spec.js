import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  attribuerPoints,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';
import { exemple } from '../../jeux/bon-ordre/exemple.js';

const ETAPES = exemple.elements[0].etapes;

async function dicter(page, lettres) {
  await page.getByLabel('Ordre dicté par le groupe').fill(lettres);
  await page.getByRole('button', { name: 'Placer' }).click();
}

test('Le Bon Ordre : un essai raté puis réussi, points dégressifs', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'bon-ordre', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  await expect(page.locator('#cadre').getByText('Procédure 1 sur 4 · Essai 1 sur 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: exemple.elements[0].titre })).toBeVisible();

  // Erreurs de saisie
  await dicter(page, 'ABZ');
  await expect(page.locator('.ordre__erreur')).toHaveText('La carte Z n’est pas à placer.');

  // Les cartes dans l'ordre alphabétique ne donnent jamais le bon ordre
  await dicter(page, 'A B C D E');
  await verifierAccessibilite(page);
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page.locator('#cadre').getByText(/bien placées? sur 5/)).toBeVisible();
  await expect(page.locator('#cadre').getByText('Essai 2 sur 3')).toBeVisible();

  // On clique les cartes restantes dans le bon ordre
  const pioche = page.getByRole('list', { name: 'Étapes mélangées' });
  for (const etape of ETAPES) {
    const carte = pioche.getByRole('button', { name: new RegExp(etape.slice(0, 15)) });
    if (await carte.isEnabled()) await carte.click();
  }
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page.locator('#cadre').getByText('Bravo ! Trouvé en 2 essais.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attribuer 2 points' })).toBeVisible();
  await attribuerPoints(page, 'Ana');
  await expect(pointsDe(page, 'Ana')).toHaveText('2');
  await expect(page.getByRole('list', { name: 'Ordre proposé' })).toContainText(ETAPES[0]);
  expect(erreurs).toEqual([]);
});

test('après le dernier essai, le bon ordre est révélé', async ({ page }) => {
  await ouvrirJeu(page, 'bon-ordre');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Nombre d’essais par procédure').fill('1');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);
  await dicter(page, 'ABCDE');
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page.locator('#cadre').getByText('Voici le bon ordre !')).toBeVisible();
  const poses = page.getByRole('list', { name: 'Ordre proposé' }).getByRole('listitem');
  for (let i = 0; i < ETAPES.length; i++) await expect(poses.nth(i)).toContainText(ETAPES[i]);
  await expect(page.getByRole('button', { name: /Attribuer/ })).toHaveCount(0);
});

test('une carte posée par erreur peut être retirée', async ({ page }) => {
  await ouvrirJeu(page, 'bon-ordre');
  await lancerPartie(page);
  const pioche = page.getByRole('list', { name: 'Étapes mélangées' });
  await pioche.getByRole('button', { name: /^Carte A/ }).click();
  await expect(pioche.getByRole('button', { name: /^Carte A/ })).toBeDisabled();
  await page.getByRole('button', { name: /Position 1 : carte A/ }).click();
  await expect(pioche.getByRole('button', { name: /^Carte A/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Vérifier' })).toBeDisabled();
});
