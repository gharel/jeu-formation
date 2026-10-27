import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
  choisirDuree,
  choisirNombre,
} from './outils.js';

const minuteur = (page) => page.locator('.minuteur-manche');

/** Écran d'attente : le chrono ne part qu'avec la question. */
async function afficherQuestion(page) {
  await expect(page.getByRole('button', { name: /Afficher la question/ })).toBeVisible();
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--arrete/);
  await page.getByRole('button', { name: /Afficher la question/ }).click();
}

async function proposer(page, nombre) {
  const saisie = page.locator('#juste-saisie');
  await saisie.fill(nombre);
  await saisie.press('Enter');
}

test('Le Juste Chiffre : plus, moins, juste, une personne par question', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'juste-chiffre', { prenoms: ['Ana', 'Bob'] });
  // À deux, la partie propose les 10 questions (chacun passe 5 fois) : on les joue toutes
  await choisirNombre(page, 'Nombre de questions', 10);
  await lancerPartie(page);

  // Écran d'attente : la question et le chrono attendent le signal (Espace ou bouton)
  await expect(page.locator('#cadre').getByText('Question 1 sur 10')).toBeVisible();
  await expect(
    page.locator('#cadre').getByText('30 secondes pour trouver le nombre'),
  ).toBeVisible();
  await expect(page.locator('#cadre').getByText('Au tour de Ana')).toBeVisible();
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--arrete/);
  await verifierAccessibilite(page);
  await page.keyboard.press('Space');
  await expect(page.locator('.minuteur-manche__temps')).toHaveText(/0:(30|29)/);
  await expect(minuteur(page)).not.toHaveClass(/minuteur-manche--arrete/);
  await expect(page.getByLabel('Proposition de Ana')).toBeFocused();

  await proposer(page, 'abc');
  await expect(page.locator('#juste-erreur')).toContainText('Tapez un nombre');

  await proposer(page, '1 950');
  await expect(page.locator('.juste__verdict')).toContainText('C’est plus !');
  // Ana garde la main jusqu'à la fin de la question
  await expect(page.getByLabel('Proposition de Ana')).toBeFocused();
  await expect(page.locator('#cadre').getByText('Au tour de Ana')).toBeVisible();
  await proposer(page, '2000');
  await expect(page.locator('.juste__verdict')).toContainText('C’est moins !');
  await expect(page.locator('.juste__fourchette')).toHaveText('Entre 1950 et 2000');
  await verifierAccessibilite(page);

  // Ana trouve : le point lui revient automatiquement
  await proposer(page, '1989');
  await expect(page.locator('#cadre').getByText('Trouvé par Ana !')).toBeVisible();
  await expect(page.locator('#cadre').getByText('+1 point pour Ana')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('1');

  // Question 2 : la main passe à Bob ; on révèle sans trouver
  await page.getByRole('button', { name: 'Question suivante' }).click();
  await expect(page.locator('#cadre').getByText('Question 2 sur 10')).toBeVisible();
  await expect(page.locator('#cadre').getByText('Au tour de Bob')).toBeVisible();
  await afficherQuestion(page);
  await proposer(page, '1900');
  await expect(page.getByLabel('Proposition de Bob')).toBeFocused();
  await page.getByRole('button', { name: 'Révéler la réponse' }).click();
  await expect(page.locator('.reponse-revelee')).toContainText('1992');
  await expect(pointsDe(page, 'Bob')).toHaveText('0');
  expect(erreurs).toEqual([]);
});

test('le minuteur choisi au lancement alerte à zéro : du temps en plus, ou la réponse', async ({
  page,
}) => {
  await ouvrirJeu(page, 'juste-chiffre');
  // Le temps se choisit sur l'accueil, au lancement
  await choisirDuree(page, 'Temps par question', 5);
  await lancerPartie(page);
  await expect(page.locator('#cadre').getByText('5 secondes pour trouver le nombre')).toBeVisible();
  await afficherQuestion(page);
  await expect(page.locator('.minuteur-manche__temps')).toHaveText(/0:0[45]/);

  // Pause : le temps se fige
  await minuteur(page).getByRole('button', { name: 'Mettre en pause' }).click();
  const fige = await page.locator('.minuteur-manche__temps').textContent();
  await page.waitForTimeout(1500);
  await expect(page.locator('.minuteur-manche__temps')).toHaveText(fige);
  await minuteur(page).getByRole('button', { name: 'Reprendre le minuteur' }).click();

  // À zéro : le chrono passe au rouge et compte le dépassement, la question reste ouverte
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--depasse/, { timeout: 8000 });
  await expect(page.locator('.minuteur-manche__temps')).toHaveText(/^\+0:0\d$/);
  await expect(page.locator('#juste-saisie')).toBeVisible();
  // Du temps en plus : l'alerte cesse
  await minuteur(page).getByRole('button', { name: '+30 s' }).click();
  await expect(minuteur(page)).not.toHaveClass(/minuteur-manche--depasse/);
  await expect(page.locator('.minuteur-manche__temps')).toHaveText(/0:(30|29)/);
  await page.locator('.juste').getByRole('button', { name: 'Révéler la réponse' }).click();
  await expect(page.locator('.reponse-revelee')).toContainText('1989');
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--arrete/);
});

test('sans limite de temps, la question n’a pas de chrono', async ({ page }) => {
  await ouvrirJeu(page, 'juste-chiffre');
  await choisirDuree(page, 'Temps par question', 0);
  await lancerPartie(page);
  await expect(
    page.locator('#cadre').getByText('Sans limite de temps pour trouver le nombre'),
  ).toBeVisible();
  await page.getByRole('button', { name: /Afficher la question/ }).click();
  await expect(page.locator('#juste-saisie')).toBeVisible();
  await expect(minuteur(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mettre en pause' })).toHaveCount(0);
});

test('une marge de 10 % accepte une réponse proche', async ({ page }) => {
  await ouvrirJeu(page, 'juste-chiffre');
  await lancerPartie(page);
  for (let i = 1; i <= 3; i++) {
    await afficherQuestion(page);
    await page.getByRole('button', { name: 'Révéler la réponse' }).click();
    await page.getByRole('button', { name: 'Question suivante' }).click();
  }
  await afficherQuestion(page);
  await expect(page.locator('#cadre').getByText('Question 4 sur 10')).toBeVisible();
  await proposer(page, '2 000 000');
  await expect(page.locator('#cadre').getByText(/Trouvé/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Attribuer/ })).toHaveCount(0);
});
