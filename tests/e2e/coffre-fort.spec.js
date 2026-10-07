import { test, expect } from '@playwright/test';
import { surveillerErreurs, ouvrirJeu, lancerPartie, verifierAccessibilite } from './outils.js';

/** Horloge simulée et figée : le temps ne passe que quand le test le décide (runFor). */
async function figerHorloge(page) {
  await page.clock.install({ time: new Date('2026-10-05T08:00:00') });
}

/** Une fois la page prête, on arrête l'horloge. */
async function arreterHorloge(page) {
  await page.clock.pauseAt(new Date('2026-10-05T09:00:00'));
}

/** axe-core a besoin de ses minuteries : on relâche l'horloge le temps de l'analyse. */
async function verifierAccessibiliteHorloge(page) {
  await page.clock.resume();
  await verifierAccessibilite(page);
  const maintenant = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(maintenant + 1000);
}

async function repondre(page, reponse) {
  await page.getByLabel('Réponse du groupe').fill(reponse);
  await page.getByLabel('Réponse du groupe').press('Enter');
}

test('Le Coffre-fort : pénalité, réponse acceptée à la main, indice, coffre ouvert', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  // L'horloge est figée par le test : le chrono ne bouge qu'avec les pénalités et les indices
  await figerHorloge(page);
  await ouvrirJeu(page, 'coffre-fort', { prenoms: ['Ana', 'Bob'] });
  await arreterHorloge(page);
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  await expect(
    cadre.getByRole('heading', { name: '5 serrures, 10 minutes pour ouvrir le coffre' }),
  ).toBeVisible();
  await expect(cadre.getByText('Une mauvaise réponse coûte 30 secondes.')).toBeVisible();
  await verifierAccessibiliteHorloge(page);
  await page.getByRole('button', { name: /Lancer le compte à rebours/ }).click();
  const temps = page.getByRole('timer');
  await expect(temps).toHaveText('10:00');
  await expect(cadre.getByText('Serrure 1 sur 5')).toBeVisible();
  await expect(page.getByLabel('Réponse du groupe')).toBeFocused();

  // Mauvaise réponse : 30 secondes de moins
  await repondre(page, 'Entrée');
  await expect(cadre.getByText(/«\sEntrée\s»\s:\sla serrure résiste\s!/)).toBeVisible();
  await expect(temps).toHaveText('9:30');

  // Réponse juste mais formulée autrement : l'animateur l'accepte, le temps est rendu
  await repondre(page, 'la touche Échap');
  await expect(temps).toHaveText('9:00');
  await page.getByRole('button', { name: /La réponse était bonne/ }).click();
  await expect(temps).toHaveText('9:30');
  await expect(cadre.getByText(/Serrure 1\souverte\s! La réponse\s:\sÉchap/)).toBeVisible();
  await expect(cadre.getByText('Serrure 2 sur 5')).toBeVisible();

  // Un indice coûte une minute, une seule fois par serrure
  await page.getByRole('button', { name: /Indice/ }).click();
  await expect(
    cadre.getByText('Indice : Mon icône est sur le bureau de l’ordinateur.'),
  ).toBeVisible();
  await expect(temps).toHaveText('8:30');
  await expect(page.getByRole('button', { name: /Indice/ })).toBeDisabled();

  // Fautes de frappe, variantes et chiffres exacts
  await repondre(page, 'corbeile');
  await repondre(page, 'huit');
  await repondre(page, 'mots de passe');
  await repondre(page, '1998');
  await expect(temps).toHaveText('8:00');
  await repondre(page, '1989');
  await expect(cadre.getByText('Coffre ouvert !')).toBeVisible();
  await expect(cadre.getByText(/Avec 8:00\sd’avance, malgré 2\serreurs/)).toBeVisible();
  await expect(cadre.getByText('Nouveau record !')).toBeVisible();
  await verifierAccessibiliteHorloge(page);

  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Partie terminée/ })).toBeVisible();
  await expect(
    page.locator('#cadre').getByText('Le coffre est ouvert : bravo à toute l’équipe !'),
  ).toBeVisible();

  // Rejouer : le record à battre s'affiche
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await expect(
    cadre.getByText(/Record à battre\s:\scoffre ouvert avec 8:00\sd’avance/),
  ).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Le Coffre-fort : temps écoulé, les réponses manquantes s’affichent', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await figerHorloge(page);
  await ouvrirJeu(page, 'coffre-fort');
  await arreterHorloge(page);
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Temps pour ouvrir le coffre').fill('2');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await page.getByRole('button', { name: /Lancer le compte à rebours/ }).click();
  await repondre(page, 'Esc');
  await expect(cadre.getByText('Serrure 2 sur 5')).toBeVisible();

  // En pause, le temps ne passe pas
  await page.getByRole('button', { name: /Pause/ }).click();
  await page.clock.runFor(200000);
  await expect(page.getByRole('timer')).toHaveText('2:00');
  await page.getByRole('button', { name: /Reprendre/ }).click();

  await page.clock.runFor(121000);
  await expect(cadre.getByText('Temps écoulé !')).toBeVisible();
  await expect(cadre.getByText('Le coffre reste fermé : 1 serrure ouverte sur 5.')).toBeVisible();
  const manquantes = cadre.locator('.coffre__solutions li');
  await expect(manquantes).toHaveText(['La corbeille', '8', 'Le mot de passe', '1989']);
  expect(erreurs).toEqual([]);
});

// Le gestionnaire de l'indice continuait après le bilan et remplaçait la touche Entrée
test('Le Coffre-fort : un indice qui vide le chrono mène au bilan, Entrée au classement', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await figerHorloge(page);
  await ouvrirJeu(page, 'coffre-fort');
  await arreterHorloge(page);
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Temps pour ouvrir le coffre').fill('2');
  await page.getByLabel('Prix d’un indice').fill('300');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await page.getByRole('button', { name: /Lancer le compte à rebours/ }).click();
  await repondre(page, 'Esc');
  await expect(cadre.getByText('Serrure 2 sur 5')).toBeVisible();

  await page.getByRole('button', { name: /Indice/ }).click();
  await expect(cadre.getByText('Temps écoulé !')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('0:00');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Partie terminée/ })).toBeVisible();
  expect(erreurs).toEqual([]);
});
