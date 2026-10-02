import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { surveillerErreurs, ouvrirJeu } from './outils.js';

test('le contenu s’exporte en JSON puis se réimporte', async ({ page }, testInfo) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'motus');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  const premierMot = page.getByLabel('Mot à deviner').first();
  await premierMot.fill('octet');

  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '⬇ Exporter' }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^skazy-motus-\d{4}-\d{2}-\d{2}\.json$/);
  const chemin = testInfo.outputPath('export.json');
  await telechargement.saveAs(chemin);
  const donnees = JSON.parse(await readFile(chemin, 'utf8'));
  expect(donnees).toMatchObject({ format: 'skazy-jeux', version: 1, jeu: 'motus' });
  expect(donnees.contenu.elements[0].mot).toBe('octet');

  // On modifie, puis on réimporte : l'éditeur retrouve le contenu exporté
  await premierMot.fill('modem');
  await page.locator('#fichier-import').setInputFiles(chemin);
  await expect(page.getByText('Fichier importé. Vérifiez puis enregistrez.')).toBeVisible();
  await expect(page.getByLabel('Mot à deviner').first()).toHaveValue('octet');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('5 mots prêts')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('un fichier d’un autre jeu ou abîmé est refusé', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  const autreJeu = JSON.stringify({
    format: 'skazy-jeux',
    version: 1,
    jeu: 'duel-buzzer',
    contenu: { elements: [] },
  });
  await page.locator('#fichier-import').setInputFiles({
    name: 'duel.json',
    mimeType: 'application/json',
    buffer: Buffer.from(autreJeu),
  });
  await expect(page.getByRole('alert')).toContainText('un autre jeu (« Duel buzzer »)');
  await page.locator('#fichier-import').setInputFiles({
    name: 'abime.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{pas du json'),
  });
  await expect(page.getByRole('alert')).toContainText('JSON illisible');
});

test('le contenu d’exemple revient en un clic', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Mot à deviner').first().fill('octet');
  await page.getByRole('button', { name: '↺ Contenu d’exemple' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remplacer' }).click();
  await page.getByRole('button', { name: '👁 Afficher les réponses' }).click();
  await expect(page.getByLabel('Mot à deviner').first()).toHaveValue('CLAVIER');
});
