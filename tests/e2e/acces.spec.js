import { test, expect } from '@playwright/test';
import { surveillerErreurs, verifierAccessibilite } from './outils.js';

// Navigateur neuf : personne n'a encore saisi le mot de passe
test.use({ storageState: { cookies: [], origins: [] } });

test('l’accueil demande le mot de passe et refuse un mauvais', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/');
  const porte = page.getByRole('dialog', { name: 'Accès réservé' });
  await expect(porte).toBeVisible();
  await expect(page.getByLabel('Mot de passe')).toBeFocused();
  // Aucun jeu n'est affiché tant que l'accès n'est pas ouvert
  await expect(page.locator('.carte-jeu')).toHaveCount(0);
  await verifierAccessibilite(page);

  await page.getByLabel('Mot de passe').fill('pas le bon');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(porte.getByRole('alert')).toHaveText(
    /^Mot de passe incorrect\s:\saccès bloqué 5\sminutes, jusqu’à\s\d+\sh\s\d\d\.$/,
  );
  await expect(page.getByLabel('Mot de passe')).toHaveValue('');
  await expect(page.locator('.carte-jeu')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('chaque mot de passe incorrect bloque la saisie, de plus en plus longtemps', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.clock.install({ time: new Date('2026-10-08T14:32:20') });
  await page.goto('/');
  const porte = page.getByRole('dialog', { name: 'Accès réservé' });
  const alerte = porte.getByRole('alert');
  const champ = page.getByLabel('Mot de passe');
  const entrer = page.getByRole('button', { name: 'Entrer' });

  await champ.fill('pas le bon');
  await entrer.click();
  await expect(alerte).toHaveText(
    /^Mot de passe incorrect\s:\saccès bloqué 5\sminutes, jusqu’à\s14\sh\s38\.$/,
  );
  await expect(champ).toBeDisabled();
  await expect(entrer).toBeDisabled();
  await verifierAccessibilite(page);

  // Recharger la page ne lève pas le blocage
  await page.reload();
  await expect(alerte).toHaveText(/bloqué 5\sminutes/);
  await expect(champ).toBeDisabled();

  // La saisie rouvre d'elle-même à la fin du blocage
  await page.clock.runFor(5 * 60_000);
  await expect(champ).toBeEnabled();
  await expect(champ).toBeFocused();
  await expect(alerte).toHaveText('');

  await champ.fill('toujours pas');
  await entrer.click();
  await expect(alerte).toHaveText(/bloqué 1\sheure, jusqu’à\s15\sh\s3\d\.$/);
  await expect(champ).toBeDisabled();
  await page.clock.runFor(60 * 60_000);
  await expect(champ).toBeEnabled();

  await champ.fill('encore faux');
  await entrer.click();
  await expect(alerte).toHaveText(
    /bloqué 24\sheures, jusqu’au vendredi 9\soctobre à\s15\sh\s3\d\.$/,
  );
  expect(erreurs).toEqual([]);
});

test('le sixième échec bloque l’accès définitivement', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  // Cinq échecs, le dernier il y a 31 jours : son blocage d'un mois est fini
  const dernier = Date.now() - 31 * 24 * 3600_000;
  await page.addInitScript((dernier) => {
    localStorage.setItem('skazy-jeux:acces-echecs', JSON.stringify({ nombre: 5, dernier }));
  }, dernier);
  await page.goto('/jeux/motus/');
  const porte = page.getByRole('dialog', { name: 'Accès réservé' });
  const champ = page.getByLabel('Mot de passe');
  await expect(champ).toBeEnabled();

  await champ.fill('pas le bon');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(porte.getByRole('alert')).toHaveText(
    /^Trop de mots de passe incorrects\s:\sl’accès est bloqué définitivement sur ce navigateur\.$/,
  );
  await expect(champ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Entrer' })).toBeDisabled();
  expect(erreurs).toEqual([]);
});

test('un jeu ouvert directement par son adresse demande aussi le mot de passe', async ({
  page,
}) => {
  await page.goto('/jeux/motus/');
  await expect(page.getByRole('dialog', { name: 'Accès réservé' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toHaveCount(0);
});

test('une fois l’accès ouvert, « Verrouiller » le referme', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  // Même état que juste après la saisie du bon mot de passe (empreinte enregistrée)
  const { EMPREINTE } = await import('../../assets/js/commun/acces.js');
  await page.addInitScript((empreinte) => {
    if (!sessionStorage.getItem('deja-ouvert')) {
      sessionStorage.setItem('deja-ouvert', '1');
      localStorage.setItem('skazy-jeux:acces', JSON.stringify(empreinte));
    }
  }, EMPREINTE);
  await page.goto('/');
  await expect(page.locator('.carte-jeu').first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Accès réservé' })).toHaveCount(0);

  await page.getByRole('button', { name: /Verrouiller l’accès/ }).click();
  await expect(page.getByRole('dialog', { name: 'Accès réservé' })).toBeVisible();
  await expect(page.locator('.carte-jeu')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});
