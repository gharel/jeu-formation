import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  attribuerPoints,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function proposer(page, mot) {
  await page.getByLabel('Proposition du participant').fill(mot);
  await page.getByLabel('Proposition du participant').press('Enter');
}

test('une partie complète de Motus avec le contenu d’exemple', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  await expect(page.locator('#cadre').getByText('Mot 1 sur 5 · 7 lettres')).toBeVisible();

  // Mauvaise longueur, mauvaise première lettre : refusées
  await proposer(page, 'CLAVI');
  await expect(page.getByRole('alert')).toContainText('7 lettres (ici 5)');
  await proposer(page, 'PLAVIER');
  await expect(page.getByRole('alert')).toContainText('commencer par C');

  await proposer(page, 'CAPRICE');
  await expect(
    page.getByRole('row', { name: /Essai 1 : C bien placée, A mal placée/ }),
  ).toBeVisible();
  await verifierAccessibilite(page);

  await proposer(page, 'CLAVIER');
  await expect(page.locator('#cadre').getByText('Trouvé !')).toBeVisible();
  await attribuerPoints(page, 'Ana');
  await expect(pointsDe(page, 'Ana')).toHaveText('1');

  // Mot 2 : 6 échecs, le mot est révélé
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await expect(page.locator('#cadre').getByText('Mot 2 sur 5 · 5 lettres')).toBeVisible();
  for (let i = 0; i < 6; i++) await proposer(page, 'PAPAS');
  await expect(page.locator('#cadre').getByText('Pas trouvé cette fois…')).toBeVisible();
  await expect(page.locator('.reponse-revelee')).toContainText('PIXEL');
  await expect(page.getByRole('button', { name: /Attribuer/ })).toHaveCount(0);

  for (const [numero, mot] of [
    [3, 'FICHIER'],
    [4, 'RESEAU'],
    [5, 'NAVIGATEUR'],
  ]) {
    await page.getByRole('button', { name: 'Mot suivant' }).click();
    await expect(page.locator('#cadre').getByText(`Mot ${numero} sur 5`)).toBeVisible();
    await proposer(page, mot);
    await expect(page.locator('#cadre').getByText('Trouvé !')).toBeVisible();
  }
  await attribuerPoints(page, 'Bob');
  await page.getByRole('button', { name: 'Voir le classement' }).click();

  await expect(page.getByRole('heading', { name: /Partie terminée/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Podium' })).toContainText('Ana');
  await expect(page.getByRole('list', { name: 'Podium' })).toContainText('Bob');
  await verifierAccessibilite(page);
  expect(erreurs).toEqual([]);
});

test('le clavier affiché permet de taper et d’effacer', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await lancerPartie(page);
  const saisie = page.getByLabel('Proposition du participant');
  await expect(saisie).toHaveValue('C');
  for (const lettre of 'LAVIEZ')
    await page.getByRole('button', { name: lettre, exact: true }).click();
  await page.getByRole('button', { name: 'Effacer une lettre' }).click();
  await expect(saisie).toHaveValue('CLAVIE');
  await page.getByRole('button', { name: 'R', exact: true }).click();
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('#cadre').getByText('Trouvé !')).toBeVisible();
});

test('les mots préparés par l’animateur sont enregistrés et joués', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  const champs = page.getByLabel('Mot à deviner');
  await expect(champs).toHaveCount(5);
  const mots = ['écran', 'souris', 'onglet', 'dossier', 'cloud'];
  for (let i = 0; i < 5; i++) await champs.nth(i).fill(mots[i]);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('5 mots prêts')).toBeVisible();
  await expect(page.locator('#cadre').getByText('contenu d’exemple')).toHaveCount(0);

  await lancerPartie(page);
  await expect(page.locator('#cadre').getByText('Mot 1 sur 5 · 5 lettres')).toBeVisible();
  await proposer(page, 'ECRAN');
  await expect(page.locator('.reponse-revelee')).toContainText('ECRAN');
});

test('un mot invalide empêche de lancer la partie', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Mot à deviner').first().fill('web');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Mot 1 : le mot doit faire entre 4 et 10 lettres',
  );
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('#cadre').getByText('Contenu incomplet')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lancer la partie/ })).toBeDisabled();
});
