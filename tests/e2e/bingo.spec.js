import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

/** Tire n mots au clavier : Entrée tire, Espace dévoile le mot après sa définition. */
async function tirer(page, n) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
  }
}

/** Valide l'annonce en cours et donne les points aux prénoms choisis. */
async function valider(page, prenom) {
  await page.getByRole('dialog').getByRole('button', { name: 'C’est validé !' }).click();
  const dialogue = page.getByRole('dialog');
  await dialogue.getByRole('button', { name: prenom, exact: true }).click();
  await dialogue.getByRole('button', { name: 'Valider' }).click();
}

test('Bingo : grilles, tirage avec définition, « Ligne ! » puis « Bingo ! »', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'bingo', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  // Préparation : la liste des mots à recopier, une grille de 3 × 3 ou de 4 × 4
  await expect(cadre.getByRole('heading', { name: 'Préparez vos grilles !' })).toBeVisible();
  await expect(
    cadre.getByRole('list', { name: 'Les mots à recopier' }).getByRole('listitem'),
  ).toHaveCount(20);
  await page.getByRole('button', { name: 'Grille de 4 × 4' }).click();
  await expect(cadre.getByText(/Recopiez-y 16 mots/)).toBeVisible();
  await page.getByRole('button', { name: 'Grille de 3 × 3' }).click();
  await expect(cadre.getByText(/Recopiez-y 9 mots/)).toBeVisible();
  await verifierAccessibilite(page);
  await page.getByRole('button', { name: /Tout le monde est prêt/ }).click();

  // Pas d'annonce possible avant d'avoir assez de mots
  await expect(page.getByRole('button', { name: /Ligne/ })).toBeDisabled();
  await page.getByRole('button', { name: /Tirer le premier mot/ }).click();
  await expect(cadre.getByText('Mot 1 sur 20')).toBeVisible();
  await expect(cadre.getByText('Quel est ce mot ?')).toBeVisible();
  await expect(cadre.locator('.bingo__tire')).toHaveCount(0);
  await verifierAccessibilite(page);
  await page.getByRole('button', { name: /Dévoiler le mot/ }).click();
  await expect(cadre.locator('.bingo__tire')).toHaveCount(1);
  await tirer(page, 2);
  await expect(cadre.getByText('Mot 3 sur 20')).toBeVisible();

  // « Ligne ! » : on vérifie avec la liste des mots tirés
  await page.getByRole('button', { name: /Ligne/ }).click();
  const verification = page.getByRole('dialog', { name: /On vérifie/ });
  await expect(verification.getByRole('listitem')).toHaveCount(3);
  await verification.getByRole('button', { name: 'Fausse alerte' }).click();
  await expect(cadre.getByText('Fausse alerte : on continue !')).toBeVisible();
  await page.getByRole('button', { name: /Ligne/ }).click();
  await valider(page, 'Ana');
  await expect(pointsDe(page, 'Ana')).toHaveText('1');
  await expect(cadre.getByText(/On joue maintenant la grille pleine/)).toBeVisible();

  // « Bingo ! » : il faut au moins 9 mots pour une grille de 3 × 3
  await expect(page.getByRole('button', { name: /Bingo/ })).toBeDisabled();
  await tirer(page, 6);
  await page.getByRole('button', { name: /Bingo/ }).click();
  await valider(page, 'Bob');
  await expect(page.getByRole('heading', { name: /Partie terminée/ })).toBeVisible();
  await expect(
    page.locator('#cadre').getByText('« Bingo ! » pour Bob, au bout de 9 mots.'),
  ).toBeVisible();
  await expect(page.locator('.podium__marche--1')).toContainText('Bob');
  expect(erreurs).toEqual([]);
});

test('Bingo sans définition : le mot est annoncé tout de suite, comme au loto', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'bingo');
  const mots = [
    'Clavier',
    'Souris',
    'Écran',
    'Onglet',
    'Lien',
    'Dossier',
    'Fichier',
    'Cloud',
    'Wi-Fi',
    'Imprimante',
    'Corbeille',
    'Arobase',
  ];
  await page.evaluate(
    (liste) =>
      localStorage.setItem(
        'skazy-jeux:bingo:contenu',
        JSON.stringify({ reglages: {}, elements: liste.map((mot) => ({ mot, definition: '' })) }),
      ),
    mots,
  );
  await page.reload();
  await expect(page.locator('#cadre').getByText('12 mots prêts')).toBeVisible();
  await lancerPartie(page);
  // 12 mots : seulement des grilles de 3 × 3
  await expect(page.getByRole('button', { name: 'Grille de 4 × 4' })).toHaveCount(0);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  const cadre = page.locator('#cadre');
  await expect(cadre.getByText('Mot 1 sur 12')).toBeVisible();
  await expect(cadre.getByText('Quel est ce mot ?')).toHaveCount(0);
  await expect(cadre.locator('.bingo__mot')).toHaveText(new RegExp(mots.join('|')));
  await expect(cadre.locator('.bingo__tire')).toHaveCount(1);
  expect(erreurs).toEqual([]);
});
