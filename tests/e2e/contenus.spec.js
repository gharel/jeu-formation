import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { JEUX } from '../../assets/js/jeux.js';
import { surveillerErreurs, ouvrirJeu, lancerPartie, verifierAccessibilite } from './outils.js';

// Les thématiques remplissent tous les jeux, sauf Zoom mystère (il lui faut des captures d'écran)
const JEUX_SANS_IMAGE = JEUX.length - 1;

/** Bloc d'un jeu dans la consultation (un <details>). */
const apercuDe = (page, slug) => page.locator(`details[data-jeu="${slug}"]`);

async function ouvrirContenus(page) {
  await page.goto('/contenus/');
  await expect(
    page.getByRole('heading', { name: 'Quelles questions pour cette séance ?' }),
  ).toBeVisible();
}

test('depuis l’accueil, on charge une thématique dans tous les jeux', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Les contenus' }).first().click();
  await expect(page).toHaveURL(/\/contenus\/$/);
  await expect(page.getByRole('heading', { name: 'Thématiques prêtes à jouer' })).toBeVisible();
  // Les 5 thématiques et les exemples, avec la description lue dans leur fichier
  await expect(page.locator('.carte-thematique')).toHaveCount(6);
  await expect(page.locator('[data-thematique="google-sheets"]')).toContainText('tableur');
  await expect(page.locator('[data-thematique="google-sheets"]')).toContainText(
    `${JEUX_SANS_IMAGE} jeux, sans Zoom mystère`,
  );
  await verifierAccessibilite(page);

  await page.getByRole('button', { name: 'Charger Google Sheets' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Charger « Google Sheets » ?' });
  await expect(dialogue).toContainText('Zoom mystère garde son contenu');
  await dialogue.getByRole('button', { name: 'Charger' }).click();
  await expect(page.locator('#cadre .message')).toHaveText(
    `Thématique « Google Sheets » chargée : ${JEUX_SANS_IMAGE} jeux mis à jour. Zoom mystère garde son contenu.`,
  );
  await expect(page.locator('[data-thematique="google-sheets"]')).toContainText(
    `Chargée dans ${JEUX_SANS_IMAGE} jeux`,
  );

  // Consultation : la source s'affiche, les réponses sont floutées jusqu'au clic
  const motus = apercuDe(page, 'motus');
  await expect(motus.locator('summary')).toContainText('5 mots prêts');
  await expect(motus.locator('summary .etiquette')).toHaveText('Google Sheets');
  await expect(apercuDe(page, 'zoom-mystere').locator('summary .etiquette')).toHaveText(
    'contenu d’exemple',
  );
  await motus.locator('summary').click();
  await expect(motus.getByText('Mot 5')).toBeVisible();
  await expect(page.locator('.consultation')).toHaveClass(/consultation--masque/);
  await expect(motus.locator('.secret').first()).toHaveCSS('filter', /blur/);
  await page.getByRole('button', { name: 'Afficher les réponses' }).click();
  await expect(page.locator('.consultation')).not.toHaveClass(/consultation--masque/);
  await expect(page.getByRole('button', { name: 'Masquer les réponses' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await verifierAccessibilite(page);

  // Dans le jeu : le contenu de la thématique, prêt à jouer
  await ouvrirJeu(page, 'duel-buzzer', { prenoms: ['Ana', 'Bob'] });
  await expect(page.locator('#cadre').getByText('12 questions prêtes')).toBeVisible();
  await expect(page.locator('#cadre .etiquette')).toHaveText('Google Sheets');
  await lancerPartie(page);

  // Retoucher puis enregistrer : ce n'est plus le contenu de la thématique
  await ouvrirJeu(page, 'motus');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Mot à deviner').first().fill('octet');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('5 mots prêts')).toBeVisible();
  await expect(page.locator('#cadre .etiquette')).toHaveCount(0);
  await page.getByRole('link', { name: 'Charger une thématique' }).click();
  await expect(page).toHaveURL(/\/contenus\/$/);
  await expect(apercuDe(page, 'motus').locator('summary .etiquette')).toHaveCount(0);
  await expect(page.locator('[data-thematique="google-sheets"]')).toContainText(
    `Chargée dans ${JEUX_SANS_IMAGE - 1} jeux`,
  );
  expect(erreurs).toEqual([]);
});

test('on consulte une thématique avant de la charger, puis on revient aux exemples', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);
  await page.getByRole('button', { name: 'Aperçu de Facebook' }).click();
  await expect(page.getByLabel('Afficher', { exact: true })).toHaveValue('facebook');
  await expect(page.getByRole('heading', { name: 'Consulter les questions' })).toBeFocused();
  const pyramide = apercuDe(page, 'pyramide');
  await expect(pyramide.locator('summary')).toContainText('12 mots prêts');
  await expect(apercuDe(page, 'zoom-mystere').locator('summary')).toContainText(
    'Pas dans cette thématique',
  );
  await pyramide.locator('summary').click();
  await expect(pyramide.locator('.apercu-element')).toHaveCount(12);
  // L'aperçu ne charge rien
  await page.getByLabel('Afficher', { exact: true }).selectOption('actuel');
  await expect(pyramide.locator('summary .etiquette')).toHaveText('contenu d’exemple');

  await page.getByRole('button', { name: 'Charger Initiation à l’IA' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Charger' }).click();
  await expect(pyramide.locator('summary .etiquette')).toHaveText('Initiation à l’IA');

  await page.getByRole('button', { name: 'Revenir aux exemples' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revenir aux exemples' }).click();
  await expect(page.locator('#cadre .message')).toHaveText(
    `Contenus d’exemple remis dans les ${JEUX.length} jeux.`,
  );
  await expect(page.locator('.apercu-jeu summary .etiquette')).toHaveText(
    JEUX.map(() => 'contenu d’exemple'),
  );
  expect(erreurs).toEqual([]);
});

test('on exporte tous les contenus en un fichier, puis on le réimporte', async ({
  page,
}, testInfo) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);
  await page.getByLabel('Titre du fichier exporté').fill('Formation mairie');
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter tous les contenus' }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(
    /^skazy-contenus-formation-mairie-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const chemin = testInfo.outputPath('contenus.json');
  await telechargement.saveAs(chemin);
  const donnees = JSON.parse(await readFile(chemin, 'utf8'));
  expect(donnees).toMatchObject({
    format: 'skazy-jeux-donnees',
    version: 1,
    titre: 'Formation mairie',
  });
  expect(Object.keys(donnees.jeux)).toEqual(JEUX.map((j) => j.slug));
  expect(donnees.jeux.motus.elements[0].mot).toBe('CLAVIER');

  // Fichier retouché : un mot changé, un jeu inconnu
  donnees.jeux.motus.elements[0].mot = 'OCTET';
  donnees.jeux['jeu-inconnu'] = { elements: [] };
  await writeFile(chemin, JSON.stringify(donnees));
  await page.locator('#fichier-contenus').setInputFiles(chemin);
  const dialogue = page.getByRole('dialog', { name: 'Importer « Formation mairie » ?' });
  await expect(dialogue).toContainText(`Le contenu de ${JEUX.length} jeux sera remplacé`);
  await dialogue.getByRole('button', { name: 'Importer' }).click();
  const message = page.locator('#cadre .message');
  await expect(message).toContainText(
    `« Formation mairie » importé : ${JEUX.length} jeux mis à jour.`,
  );
  await expect(message).toContainText('Ignoré (jeu inconnu) : jeu-inconnu.');
  await expect(apercuDe(page, 'zoom-mystere').locator('summary .etiquette')).toHaveText(
    'Formation mairie',
  );
  const motus = apercuDe(page, 'motus');
  await motus.locator('summary').click();
  await expect(motus.locator('.apercu-element').first()).toContainText('OCTET');

  // Un fichier abîmé est refusé
  await page.locator('#fichier-contenus').setInputFiles({
    name: 'abime.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{pas du json'),
  });
  await expect(page.getByRole('alert')).toContainText('JSON illisible');
  expect(erreurs).toEqual([]);
});

test('les contenus se consultent au doigt sur téléphone, sans défilement horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ouvrirContenus(page);
  await apercuDe(page, 'bon-ordre').locator('summary').click();
  await page.getByRole('button', { name: 'Afficher les réponses' }).click();
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largeur).toBeLessThanOrEqual(390);
});

/** Contenu enregistré d'un jeu, lu dans le stockage de la page. */
const contenuEnregistre = (page, slug) =>
  page.evaluate((cle) => JSON.parse(localStorage.getItem(cle)), `skazy-jeux:${slug}:contenu`);

test('on modifie les questions d’un jeu sur place, depuis la consultation', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);
  await page.getByRole('button', { name: 'Charger Google Sheets' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Charger' }).click();
  const motus = apercuDe(page, 'motus');
  await expect(motus.locator('summary .etiquette')).toHaveText('Google Sheets');
  await motus.locator('summary').click();
  const premierMot = (await contenuEnregistre(page, 'motus')).elements[0].mot;

  // Modifier ouvre l'éditeur du jeu dans la consultation
  await motus.getByRole('button', { name: 'Modifier le contenu de Motus numérique' }).click();
  await expect(
    motus.getByRole('heading', { name: 'Modifier le contenu de Motus numérique' }),
  ).toBeFocused();
  await expect(motus.getByLabel('Mot à deviner').first()).toHaveValue(premierMot);
  await verifierAccessibilite(page);

  // Annuler une modification demande confirmation, et rien n'est changé
  await motus.getByLabel('Mot à deviner').first().fill('ECRAN');
  await motus.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonner' }).click();
  await expect(motus.locator('.apercu-element').first()).toContainText(premierMot);
  expect((await contenuEnregistre(page, 'motus')).elements[0].mot).toBe(premierMot);

  // Enregistrer : l'aperçu suit, le jeu aussi, et la thématique n'est plus affichée
  await motus.getByRole('button', { name: 'Modifier le contenu de Motus numérique' }).click();
  await motus.getByLabel('Mot à deviner').first().fill('ECRAN');
  await motus.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    motus.getByRole('button', { name: 'Modifier le contenu de Motus numérique' }),
  ).toBeFocused();
  await expect(motus.locator('.apercu-element').first()).toContainText('ECRAN');
  await expect(motus.locator('summary .etiquette')).toHaveCount(0);
  expect((await contenuEnregistre(page, 'motus')).elements[0].mot).toBe('ECRAN');

  // Les images d'exemple de Zoom mystère s'affichent dans l'éditeur et gardent leur chemin
  const zoom = apercuDe(page, 'zoom-mystere');
  await zoom.locator('summary').click();
  await zoom.getByRole('button', { name: 'Modifier le contenu de Zoom mystère' }).click();
  const apercu = zoom.locator('img.champ-image__apercu').first();
  await expect(apercu).toBeVisible();
  await expect.poll(() => apercu.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await zoom.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    zoom.getByRole('button', { name: 'Modifier le contenu de Zoom mystère' }),
  ).toBeVisible();
  expect((await contenuEnregistre(page, 'zoom-mystere')).elements[0].image.src).toBe(
    'exemples/barre-outils.svg',
  );
  expect(erreurs).toEqual([]);
});

test('les thématiques et les exemples se consultent sans être modifiés', async ({ page }) => {
  await ouvrirContenus(page);
  await page.getByLabel('Afficher', { exact: true }).selectOption('facebook');
  await apercuDe(page, 'motus').locator('summary').click();
  await expect(apercuDe(page, 'motus').getByRole('button', { name: /Modifier/ })).toHaveCount(0);
  await expect(
    apercuDe(page, 'motus').getByRole('link', { name: 'Ouvrir Motus numérique' }),
  ).toBeVisible();
});
