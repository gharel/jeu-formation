import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Collecte les erreurs de la page (console et exceptions) pour vérifier qu'il n'y en a aucune. */
export function surveillerErreurs(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(`exception : ${e.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') erreurs.push(`console : ${message.text()}`);
  });
  return erreurs;
}

/** Ouvre un jeu avec une graine fixe (tirages reproductibles) et ajoute des prénoms. */
export async function ouvrirJeu(page, slug, { prenoms = [] } = {}) {
  await page.goto(`/jeux/${slug}/?graine=1`);
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
  if (prenoms.length) {
    await page.getByLabel('Ajouter un prénom').fill(prenoms.join(', '));
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(
      page.getByRole('list', { name: 'Participants' }).getByRole('listitem'),
    ).toHaveCount(prenoms.length);
  }
}

export async function lancerPartie(page) {
  await page.getByRole('button', { name: /Lancer la partie/ }).click();
  await expect(page.getByRole('button', { name: /Quitter la partie/ })).toBeVisible();
}

/** Clique « Attribuer … » puis le prénom dans la fenêtre. */
export async function attribuerPoints(page, prenom) {
  await page.getByRole('button', { name: /Attribuer/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: prenom, exact: true }).click();
  await expect(page.getByRole('button', { name: new RegExp(`pour ${prenom}`) })).toBeDisabled();
}

/** Points affichés pour un prénom dans le tableau des points. */
export function pointsDe(page, prenom) {
  return page
    .getByRole('list', { name: 'Points' })
    .getByRole('listitem')
    .filter({ hasText: prenom })
    .locator('.tableau-points__valeur');
}

/** Vérifie l'accessibilité : aucune violation grave ou critique (axe-core). */
export async function verifierAccessibilite(page) {
  const resultats = await new AxeBuilder({ page }).analyze();
  const graves = resultats.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
  expect(graves, graves.join('\n')).toEqual([]);
}
