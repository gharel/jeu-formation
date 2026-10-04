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
    page.getByRole('button', { name: 'Exporter' }).click(),
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
  await expect(
    page.locator('#cadre').getByText('Fichier importé. Vérifiez puis enregistrez.'),
  ).toBeVisible();
  await expect(page.getByLabel('Mot à deviner').first()).toHaveValue('octet');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('5 mots prêts')).toBeVisible();
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
  await page.getByRole('button', { name: 'Contenu d’exemple' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remplacer' }).click();
  await page.getByRole('button', { name: 'Afficher les réponses' }).click();
  await expect(page.getByLabel('Mot à deviner').first()).toHaveValue('CLAVIER');
});

test('on vide la liste pour saisir son contenu, les exemples restent en placeholder', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'qui-suis-je');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByRole('button', { name: 'Vider la liste' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vider' }).click();
  await expect(page.locator('#cadre').getByText(/Liste vidée/)).toBeVisible();

  // Un seul mystère vide, mais avec des exemples grisés : rien à effacer avant de saisir.
  // Les placeholders suivent la typographie française : espace insécable avant « : ».
  const reponse = page.getByLabel('Réponse', { exact: true });
  await expect(reponse).toHaveCount(1);
  await expect(reponse).toHaveValue('');
  await expect(reponse).toHaveAttribute('placeholder', 'Ex.\u00a0: la souris');
  await expect(page.getByLabel('Indice 1', { exact: true })).toHaveAttribute(
    'placeholder',
    /^Ex.\u00a0: Je suis née dans les années 1960/,
  );
  await expect(page.getByLabel('Indice 3', { exact: true })).toHaveAttribute(
    'placeholder',
    'Ex.\u00a0: J’ai souvent deux boutons et une molette.',
  );

  await reponse.fill('L’écran');
  await page.getByLabel('Indice 1', { exact: true }).fill('Je suis fait de pixels.');
  await page.getByLabel('Indice 2', { exact: true }).fill('On règle ma luminosité.');
  await page.getByLabel('Indice 3', { exact: true }).fill('On me regarde toute la journée.');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('1 mystère prêt')).toBeVisible();
  await expect(page.locator('#cadre').getByText('contenu d’exemple', { exact: true })).toHaveCount(
    0,
  );
  expect(erreurs).toEqual([]);
});

test('depuis l’accueil, on part directement d’une liste vide', async ({ page }) => {
  await ouvrirJeu(page, 'duel-buzzer');
  await page.getByRole('button', { name: 'Partir d’une liste vide' }).click();
  await expect(page.getByRole('heading', { name: 'Préparer le contenu' })).toBeVisible();
  await expect(page.getByLabel('Question', { exact: true })).toHaveCount(1);
  await expect(page.getByLabel('Question', { exact: true })).toHaveValue('');
  // Rien n'est enregistré tant qu'on n'a pas validé : Annuler garde l'exemple
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(
    page.locator('#cadre').getByText('contenu d’exemple', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('#cadre').getByText('10 questions prêtes')).toBeVisible();
});

test('un jeu de données (tous les jeux) s’importe aussi dans un seul jeu', async ({ page }) => {
  await ouvrirJeu(page, 'pyramide');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  const jeuDeDonnees = (jeux) =>
    Buffer.from(JSON.stringify({ format: 'skazy-jeux-donnees', version: 1, titre: 'Essai', jeux }));
  await page.locator('#fichier-import').setInputFiles({
    name: 'thematique.json',
    mimeType: 'application/json',
    buffer: jeuDeDonnees({ pyramide: { elements: [{ mot: 'Tableur' }, { mot: 'Cellule' }] } }),
  });
  await expect(
    page.locator('#cadre').getByText('Fichier importé. Vérifiez puis enregistrez.'),
  ).toBeVisible();
  await expect(page.getByLabel('Mot à faire deviner')).toHaveCount(2);
  await expect(page.getByLabel('Mot à faire deviner').first()).toHaveValue('Tableur');
  // Sans la part de ce jeu, le fichier est refusé
  await page.locator('#fichier-import').setInputFiles({
    name: 'autre.json',
    mimeType: 'application/json',
    buffer: jeuDeDonnees({ motus: { elements: [] } }),
  });
  await expect(page.getByRole('alert')).toContainText('ne contient rien pour « Pyramide »');
});
