import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

/** Contenu court : 2 défis, dont un de 3 secondes pour tester la fin du chrono. */
async function preparerDeuxDefis(page) {
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  const defis = page.locator('.editeur__element');
  while ((await defis.count()) > 2) {
    await page
      .getByRole('button', { name: /Supprimer défi/ })
      .last()
      .click();
  }
  await page.getByRole('button', { name: 'Afficher les réponses' }).click();
  await defis.nth(0).getByLabel('Début du défi').selectOption('perso');
  await defis.nth(0).getByLabel('Votre début (si « Autre »)').fill('3 secondes pour trouver…');
  await defis.nth(0).getByLabel('Fin du défi').fill('la corbeille');
  await defis.nth(1).getByLabel('Début du défi').selectOption('trouver30');
  await defis.nth(1).getByLabel('Fin du défi').fill('… le menu Fichier');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('2 défis prêts')).toBeVisible();
}

test('une partie d’Instant défi : roue, chrono, points', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'instant-defi', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await preparerDeuxDefis(page);
  await lancerPartie(page);

  await expect(page.locator('#cadre').getByText('2 défis dans la roue')).toBeVisible();
  await verifierAccessibilite(page);
  await page.getByRole('button', { name: 'Lancer la roue' }).click();

  // Premier défi tiré : on joue jusqu'à la fin du chrono ou on arrête
  const enonce = page.locator('.defi__enonce');
  await expect(enonce).toBeVisible();
  const texte = await enonce.textContent();
  await page.getByRole('button', { name: 'Top départ !' }).click();
  if (texte.startsWith('3 secondes')) {
    await expect(page.locator('#cadre').getByText('Temps écoulé !')).toBeVisible({ timeout: 6000 });
  } else {
    await page.getByRole('button', { name: /Réussi/ }).click();
    await expect(page.locator('#cadre').getByText('Défi réussi !')).toBeVisible();
  }

  // Plusieurs personnes ont réussi
  await page.getByRole('button', { name: /Attribuer/ }).click();
  const dialogue = page.getByRole('dialog');
  await dialogue.getByRole('button', { name: 'Ana' }).click();
  await dialogue.getByRole('button', { name: 'Chloé' }).click();
  await dialogue.getByRole('button', { name: 'Valider' }).click();
  await expect(pointsDe(page, 'Ana')).toHaveText('1');
  await expect(pointsDe(page, 'Chloé')).toHaveText('1');
  await expect(pointsDe(page, 'Bob')).toHaveText('0');

  // Deuxième défi au clavier : Espace lance la roue, puis le chrono, puis l'arrête
  await page.getByRole('button', { name: 'Défi suivant' }).click();
  await expect(page.locator('#cadre').getByText('1 défi dans la roue')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(enonce).not.toHaveText(texte);
  await page.getByRole('button', { name: 'Top départ !' }).click();
  await expect(page.locator('.chrono__temps')).toBeVisible();
  await page
    .getByRole('button', { name: /Réussi|Voir le classement/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: /Partie terminée/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Podium' })).toContainText('Ana');
  expect(erreurs).toEqual([]);
});

test('quitter la partie arrête le chrono', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'instant-defi');
  await lancerPartie(page);
  await page.getByRole('button', { name: 'Lancer la roue' }).click();
  await page.getByRole('button', { name: 'Top départ !' }).click();
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quitter' }).click();
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.locator('.chrono')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('la fenêtre de la roue garde sa taille au tirage, sans ascenseur', async ({ page }) => {
  await ouvrirJeu(page, 'instant-defi', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await lancerPartie(page);
  await page.getByRole('button', { name: 'Désigner', exact: true }).click();
  const dialogue = page.getByRole('dialog');
  const taille = () =>
    dialogue.evaluate((d) => ({
      hauteur: d.scrollHeight,
      hauteurVisible: d.clientHeight,
      largeur: d.scrollWidth,
      largeurVisible: d.clientWidth,
    }));
  const avant = await taille();
  // Le prénom tiré s'affiche dans la ligne gardée pour lui : la fenêtre ne grandit pas
  await dialogue.getByRole('button', { name: 'Lancer la roue' }).click();
  await expect(dialogue.locator('.roue-resultat')).not.toBeEmpty();
  const apres = await taille();
  expect(apres).toEqual(avant);
  expect(apres.hauteur).toBeLessThanOrEqual(apres.hauteurVisible);
  expect(apres.largeur).toBeLessThanOrEqual(apres.largeurVisible);
});
