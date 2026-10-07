import { test, expect } from '@playwright/test';
import { exemple } from '../../jeux/memoire-vive/exemple.js';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

/** La carte qui va avec un texte de carte, d'après le contenu d'exemple. */
function partenaire(texte) {
  const paire = exemple.elements.find((p) => p.carteA === texte || p.carteB === texte);
  return paire.carteA === texte ? paire.carteB : paire.carteA;
}

/** Le texte d'une carte retournée, lu dans son nom accessible (« Carte B2 : Copier »). */
async function texteDe(carte) {
  const nom = await carte.getAttribute('aria-label');
  // L'espace avant « : » est insécable (typographie du site)
  return nom.replace(/^Carte [A-F]\d\s:\s/, '').replace(/, paire trouvée$/, '');
}

test('Mémoire vive : on choisit le nombre de cartes et on retrouve toutes les paires', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'memoire-vive', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');

  // 10 paires préparées : 8, 12, 16 ou 20 cartes
  await expect(cadre.getByRole('heading', { name: 'Combien de cartes ?' })).toBeVisible();
  await expect(cadre.getByRole('button', { name: /\d+ cartes/ })).toHaveCount(4);
  await verifierAccessibilite(page);
  await cadre.getByRole('button', { name: /^8 cartes/ }).click();

  const cartes = page.locator('.carte-memoire');
  await expect(cartes).toHaveCount(8);
  await expect(cartes.first()).toHaveAttribute('aria-label', 'Carte A1, face cachée');
  await expect(cadre.locator('.memoire__tour')).toContainText(/Au tour de (Ana|Bob)/);
  await verifierAccessibilite(page);

  // On retourne les cartes deux par deux pour toutes les découvrir
  const textes = [];
  for (let i = 0; i < 8; i += 2) {
    await cartes.nth(i).click();
    await cartes.nth(i + 1).click();
    textes[i] = await texteDe(cartes.nth(i));
    textes[i + 1] = await texteDe(cartes.nth(i + 1));
    if (await page.getByRole('button', { name: /Cacher les cartes/ }).isVisible()) {
      await expect(cadre.getByText(/Pas de paire\s:\smémorisez-les bien/)).toBeVisible();
      // Espace cache les deux cartes
      await page.keyboard.press('Space');
      await expect(cartes.nth(i)).toHaveAttribute('aria-label', /face cachée/);
    }
  }

  // Puis on retourne chaque paire restante : 1 point pour qui la trouve
  for (let i = 0; i < 8; i++) {
    if ((await cartes.nth(i).getAttribute('aria-label')).endsWith('paire trouvée')) continue;
    const j = textes.indexOf(partenaire(textes[i]));
    await cartes.nth(i).click();
    await cartes.nth(j).click();
    await expect(cartes.nth(j)).toHaveAttribute('aria-label', /paire trouvée$/);
  }
  await expect(cadre.getByText('4 paires sur 4')).toBeVisible();
  await expect(cadre.getByText(/Toutes les paires sont trouvées/)).toBeVisible();
  const total =
    Number(await pointsDe(page, 'Ana').textContent()) +
    Number(await pointsDe(page, 'Bob').textContent());
  expect(total).toBe(4);

  await page.getByRole('button', { name: /Voir le classement/ }).click();
  await expect(page.locator('#cadre').getByText(/4\spaires trouvées en \d+\scoups/)).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Mémoire vive : le dernier nombre de cartes est proposé de nouveau', async ({ page }) => {
  await ouvrirJeu(page, 'memoire-vive');
  await lancerPartie(page);
  await page
    .locator('#cadre')
    .getByRole('button', { name: /^12 cartes/ })
    .click();
  await expect(page.locator('.carte-memoire')).toHaveCount(12);
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quitter' }).click();
  await lancerPartie(page);
  await expect(page.locator('#cadre').getByRole('button', { name: /^12 cartes/ })).toHaveClass(
    /bouton--principal/,
  );
  // Entrée : le nombre proposé
  await page.keyboard.press('Enter');
  await expect(page.locator('.carte-memoire')).toHaveCount(12);
});
