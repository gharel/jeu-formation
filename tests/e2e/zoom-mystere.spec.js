import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

// Petite image PNG (4 × 4 pixels) pour simuler une capture d'écran
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fTcuYAAAAAElFTkSuQmCC',
  'base64',
);

function echelle(page) {
  return page
    .locator('.zoom__image')
    .evaluate((img) => new DOMMatrix(getComputedStyle(img).transform).a);
}

test('Zoom mystère : l’image se dézoome, Stop fige, la bonne réponse marque', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'zoom-mystere', { prenoms: ['Ana', 'Bob'] });
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Durée de chaque palier').fill('2');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);

  await expect(page.locator('#cadre').getByText('Image 1 sur 4')).toBeVisible();
  await expect(page.locator('.zoom__image')).toHaveJSProperty('complete', true);
  // Avant « Démarrer », l'image, déjà zoomée, reste cachée sous le voile
  expect(await echelle(page)).toBeCloseTo(10, 0);
  await expect(page.locator('.zoom__image')).toHaveCSS('opacity', '0');
  await expect(page.locator('.zoom__voile')).toBeVisible();
  await verifierAccessibilite(page);

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.locator('.zoom__voile')).toBeHidden();
  await expect(page.locator('.zoom__image')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('list', { name: 'Points en jeu : 4' })).toBeVisible({
    timeout: 4000,
  });
  await page.getByRole('button', { name: /Stop/ }).click();
  await expect.poll(() => echelle(page)).toBeLessThan(10);

  await page.getByRole('button', { name: 'Bonne réponse' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ana' }).click();
  await expect(page.locator('#cadre').getByText('+4 points pour Ana')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('4');
  await expect(page.locator('.reponse-revelee')).toContainText('Le bouton Enregistrer');
  await expect.poll(() => echelle(page)).toBeCloseTo(1, 1);
  expect(erreurs).toEqual([]);
});

test('Voir la réponse : elle se pose sur l’image, se cache, une mauvaise proposition finit sans point', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'zoom-mystere', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await expect(cadre.getByText('Image 1 sur 4')).toBeVisible();

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: /Stop/ }).click();
  const apercu = cadre.locator('.reponse-apercu');
  const voir = page.getByRole('button', { name: 'Voir la réponse' });
  await expect(apercu).toBeHidden();
  const { x, y, width, height } = await voir.boundingBox();
  await voir.click();
  await expect(apercu).toBeVisible();
  await expect(apercu).toHaveText('Le bouton Enregistrer (la disquette)');
  await expect(page.getByRole('button', { name: /on reprend/ })).toHaveCount(0);
  // Tout tient à l'écran (1280 × 720), sans défiler
  await verifierAccessibilite(page);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);

  // Un second clic au même endroit la cache aussitôt : on peut reprendre
  await page.mouse.click(x + width / 2, y + height / 2);
  await expect(apercu).toBeHidden();
  await expect(page.getByRole('button', { name: /on reprend/ })).toBeVisible();
  await voir.click();

  await page.getByRole('button', { name: 'Mauvaise réponse' }).click();
  await expect(cadre.getByText('Personne n’a trouvé…')).toBeVisible();
  await expect(apercu).toBeHidden();
  await expect(cadre.locator('.reponse-revelee')).toHaveCount(1);
  await expect(pointsDe(page, 'Ana')).toHaveText('0');
  expect(erreurs).toEqual([]);
});

test('l’animateur importe ou colle une capture, la retrouve après rechargement', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'zoom-mystere');
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();

  // On garde une seule image, remplacée par un fichier importé
  while ((await page.locator('.editeur__element').count()) > 1) {
    await page
      .getByRole('button', { name: /Supprimer image/ })
      .last()
      .click();
  }
  const element = page.locator('.editeur__element').first();
  await element.getByRole('button', { name: 'Retirer l’image' }).click();
  await element.locator('input[type=file]').setInputFiles({
    name: 'capture.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(element.locator('.champ-image__apercu')).toBeVisible();
  // Le détail à zoomer se choisit en cliquant dans l'aperçu
  await element.locator('.champ-image__apercu').click({ position: { x: 2, y: 2 } });
  await element.getByLabel('Réponse attendue').fill('Une capture importée');

  // Deuxième image : collée avec Ctrl+V (événement de collage simulé)
  await page.getByRole('button', { name: '+ Ajouter une image' }).click();
  const deuxieme = page.locator('.editeur__element').nth(1);
  await deuxieme.locator('.champ-image').evaluate(
    async (zone, octets) => {
      const fichier = new File([new Uint8Array(octets)], 'collage.png', { type: 'image/png' });
      const transfert = new DataTransfer();
      transfert.items.add(fichier);
      zone.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfert, bubbles: true }));
    },
    [...PNG],
  );
  await expect(deuxieme.locator('.champ-image__apercu')).toBeVisible();
  await deuxieme.getByLabel('Réponse attendue').fill('Une capture collée');

  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('2 images prêtes')).toBeVisible();

  await page.reload();
  await lancerPartie(page);
  await expect(page.locator('.zoom__image')).toHaveAttribute('src', /^data:image\/png/);
  expect(erreurs).toEqual([]);
});
