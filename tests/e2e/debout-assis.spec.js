import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function regler(page, { survie = false, consigne } = {}) {
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Temps pour se décider').fill('3');
  if (consigne) await page.getByLabel('Comment répondre').selectOption(consigne);
  if (survie) await page.getByLabel(/Mode survie/).check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
}

test('Debout ou assis : affirmation, compte à rebours, réponse et points', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'debout-assis', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await regler(page);
  await lancerPartie(page);

  await expect(page.getByRole('heading', { name: 'Tout le monde debout !' })).toBeVisible();
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  await expect(page.locator('#cadre').getByText('Affirmation 1 sur 8')).toBeVisible();
  await verifierAccessibilite(page);

  // Le compte à rebours de 3 s révèle la réponse tout seul
  await expect(page.locator('.debout__verdict')).toHaveText('VRAI', { timeout: 6000 });
  await expect(page.locator('#cadre').getByText('Les bonnes réponses : debout')).toBeVisible();

  // « Tout le monde / personne » coche tous les prénoms
  await page.getByRole('button', { name: /Attribuer/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tout le monde / personne' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click();
  for (const prenom of ['Ana', 'Bob', 'Chloé'])
    await expect(pointsDe(page, prenom)).toHaveText('1');

  // Révéler avant la fin du chrono
  await page.getByRole('button', { name: 'Affirmation suivante' }).click();
  await page.getByRole('button', { name: 'Révéler la réponse' }).click();
  await expect(page.locator('.debout__verdict')).toHaveText('FAUX');
  expect(erreurs).toEqual([]);
});

test('mode survie : les éliminés sortent, le dernier en jeu gagne', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'debout-assis', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await regler(page, { survie: true, consigne: 'main' });
  await lancerPartie(page);
  await expect(page.getByRole('heading', { name: 'Préparez vos mains !' })).toBeVisible();
  await expect(page.locator('#cadre').getByText('En jeu (3)')).toBeVisible();
  await page.keyboard.press('Space');

  await page.getByRole('button', { name: 'Révéler la réponse' }).click();
  // Tout le monde s'est trompé : personne n'est éliminé
  await page.getByRole('button', { name: 'Éliminer ceux qui se sont trompés' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tout le monde / personne' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('#cadre').getByText('personne n’est éliminé')).toBeVisible();

  await page.getByRole('button', { name: 'Affirmation suivante' }).click();
  await page.getByRole('button', { name: 'Révéler la réponse' }).click();
  await page.getByRole('button', { name: 'Éliminer ceux qui se sont trompés' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ana' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bob' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('#cadre').getByText('Chloé est le dernier en jeu !')).toBeVisible();
  await page.getByRole('button', { name: 'Voir le classement' }).click();

  await expect(page.locator('#cadre').getByText('Chloé est le dernier en jeu !')).toBeVisible();
  await expect(page.locator('.podium__marche--1')).toContainText('Chloé');
  expect(erreurs).toEqual([]);
});
