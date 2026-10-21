import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  verifierAccessibilite,
  choisirDuree,
} from './outils.js';

/** Horloge simulée : le temps ne passe que quand le test le décide (runFor). */
async function figerHorloge(page) {
  await page.clock.install({ time: new Date('2026-10-05T08:00:00') });
}

const minuteur = (page) => page.locator('.minuteur-manche');

test('le temps par mot se choisit au lancement ; à zéro, une alerte, du temps en plus ou le mot', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await figerHorloge(page);
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob'] });
  // Le minuteur se règle à côté de « Lancer la partie » : − / + par 5 s, la croix pour « Sans limite »
  const temps = page.getByRole('spinbutton', { name: 'Temps par mot' });
  const champ = page.locator('.champ--duree');
  await expect(temps).toHaveText('2 min');
  await champ.getByRole('button', { name: 'Retirer 5 secondes' }).click();
  await expect(temps).toHaveText(/^1\smin 55$/);
  await champ.getByRole('button', { name: 'Ajouter 5 secondes' }).click();
  await champ.getByRole('button', { name: 'Ajouter 5 secondes' }).click();
  await expect(temps).toHaveAttribute('aria-valuenow', '125');
  const croix = champ.getByRole('button', { name: 'Sans limite' });
  await croix.click();
  await expect(temps).toHaveText('Sans limite');
  await expect(croix).toHaveAttribute('aria-pressed', 'true');
  await expect(champ.getByRole('button', { name: 'Retirer 5 secondes' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  // Un second clic sur la croix revient à la valeur conseillée
  await croix.click();
  await expect(temps).toHaveText('2 min');
  // Au clavier : Début = le minimum ; le choix reste après rechargement
  await choisirDuree(page, 'Temps par mot', 30);
  await expect(champ.getByRole('button', { name: 'Retirer 5 secondes' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.reload();
  await expect(temps).toHaveAttribute('aria-valuenow', '30');
  // L'horloge s'arrête avant la partie : le temps ne passe qu'avec runFor
  await page.clock.pauseAt(new Date('2026-10-05T09:00:00'));
  await lancerPartie(page);
  await expect(minuteur(page).getByRole('timer')).toHaveText('0:30');

  // Pause : le temps se fige jusqu'à ce que l'animateur reprenne
  await minuteur(page).getByRole('button', { name: 'Mettre en pause' }).click();
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--pause/);
  await page.clock.runFor(10_000);
  await expect(minuteur(page).getByRole('timer')).toHaveText('0:30');
  await minuteur(page).getByRole('button', { name: 'Reprendre le minuteur' }).click();
  await expect(minuteur(page)).not.toHaveClass(/minuteur-manche--pause/);
  // +30 s puis −30 s : retour au même temps
  await minuteur(page).getByRole('button', { name: '+30 s' }).click();
  await expect(minuteur(page).getByRole('timer')).toHaveText('1:00');
  await minuteur(page).getByRole('button', { name: '−30 s' }).click();
  await expect(minuteur(page).getByRole('timer')).toHaveText('0:30');

  // À zéro, rien ne s'arrête : le chrono passe au rouge et compte le dépassement
  await page.clock.runFor(32_000);
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--depasse/);
  await expect(minuteur(page).getByRole('timer')).toHaveText(/^\+0:0[12]$/);
  await expect(page.getByLabel('Proposition du participant')).toBeVisible();
  await page.clock.resume();
  await verifierAccessibilite(page);

  // +30 s : l'alerte cesse
  await minuteur(page).getByRole('button', { name: '+30 s' }).click();
  await expect(minuteur(page)).not.toHaveClass(/minuteur-manche--depasse/);

  // Ou l'animateur passe : le mot est dévoilé
  await page.clock.runFor(31_000);
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--depasse/);
  await minuteur(page)
    .getByRole('button', { name: /Dévoiler le mot/ })
    .click();
  await expect(page.locator('#cadre').getByText('Pas trouvé cette fois…')).toBeVisible();
  await expect(minuteur(page)).toHaveClass(/minuteur-manche--arrete/);

  // Mot suivant : le temps repart du début
  await page.getByRole('button', { name: /Mot suivant/ }).click();
  await expect(minuteur(page).getByRole('timer')).toHaveText(/0:(30|29)/);
  expect(erreurs).toEqual([]);
});

test('sans limite : pas de chrono pendant la partie', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'top-5');
  await choisirDuree(page, 'Temps par question', 0);
  await lancerPartie(page);
  await expect(page.getByLabel('Proposition du groupe')).toBeVisible();
  await expect(minuteur(page)).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('Instant défi : l’accueil dit que le temps vient de chaque défi', async ({ page }) => {
  await ouvrirJeu(page, 'instant-defi');
  await expect(page.locator('.intro__minuteur')).toContainText('donné par son début');
});

test('une fenêtre ouverte fige aussi les paliers (Qui suis-je ?)', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await figerHorloge(page);
  await ouvrirJeu(page, 'qui-suis-je');
  await page.clock.pauseAt(new Date('2026-10-05T09:00:00'));
  await lancerPartie(page);
  await page.getByRole('button', { name: 'Démarrer' }).click();
  const paliers = page.getByRole('list', { name: /Points en jeu/ });
  await expect(paliers).toHaveAttribute('aria-label', 'Points en jeu : 5');
  // « Quitter la partie ? » reste ouvert longtemps : les chiffres ne s'éteignent pas
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  await page.clock.runFor(60_000);
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
  await expect(paliers).toHaveAttribute('aria-label', 'Points en jeu : 5');
  // Fenêtre fermée : le temps repart
  await page.clock.runFor(60_000);
  await expect(paliers).not.toHaveAttribute('aria-label', 'Points en jeu : 5');
  expect(erreurs).toEqual([]);
});
