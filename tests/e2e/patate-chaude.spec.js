import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

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

test('Patate chaude : la patate passe, chauffe, brûle, et les autres marquent', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  // L'horloge de la page est pilotée par le test : la mèche cachée brûle sans attendre
  await figerHorloge(page);
  await ouvrirJeu(page, 'patate-chaude', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await arreterHorloge(page);
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  await expect(
    cadre.getByRole('heading', { name: 'Citez un raccourci clavier avec la touche Ctrl' }),
  ).toBeVisible();
  await verifierAccessibiliteHorloge(page);
  await page.getByRole('button', { name: /Lancer la patate/ }).click();
  await expect(cadre.getByText('La patate est tiède…')).toBeVisible();

  // Une réponse valable : la patate change de main (Espace ou bouton)
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: /Réponse valable/ }).click();
  await expect(cadre.getByText('2 réponses valables')).toBeVisible();

  // En pause, la patate ne brûle pas
  await page.getByRole('button', { name: /Pause/ }).click();
  await page.clock.runFor(120000);
  await expect(cadre.getByText('Brûlé !')).toHaveCount(0);
  await page.getByRole('button', { name: /Reprendre/ }).click();

  // La mèche moyenne dure 45 secondes au plus
  await page.clock.runFor(46000);
  await expect(cadre.getByText('Brûlé !')).toBeVisible();
  await expect(cadre.getByText('2 réponses valables avant la brûlure.')).toBeVisible();
  await expect(cadre.getByText(/Ctrl \+ C \(copier\)/)).toBeVisible();
  await verifierAccessibiliteHorloge(page);

  await page.getByRole('button', { name: /Qui tenait la patate/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bob', exact: true }).click();
  await expect(
    cadre.getByText('Bob tenait la patate : 1 point pour tous les autres !'),
  ).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('1');
  await expect(pointsDe(page, 'Bob')).toHaveText('0');
  await expect(pointsDe(page, 'Chloé')).toHaveText('1');

  // Manche suivante : la personne brûlée relance la patate
  await page.getByRole('button', { name: 'Manche suivante' }).click();
  await expect(cadre.getByText('Manche 2 sur 8')).toBeVisible();
  await expect(cadre.getByText('Bob prend la patate et répond en premier')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Patate chaude sans prénoms : on joue quand même, sans points', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await figerHorloge(page);
  await ouvrirJeu(page, 'patate-chaude');
  await arreterHorloge(page);
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByLabel('Mèche').selectOption('courte');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await expect(cadre.getByText('Qui commence ? Prenez la patate en main !')).toBeVisible();
  await page.keyboard.press('Enter');
  // La mèche courte dure 25 secondes au plus
  await page.clock.runFor(26000);
  await expect(cadre.getByText('La personne qui tient la patate perd la manche.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Qui tenait la patate/ })).toHaveCount(0);
  expect(erreurs).toEqual([]);
});
