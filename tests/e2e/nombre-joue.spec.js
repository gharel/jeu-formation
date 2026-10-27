import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  choisirNombre,
  verifierAccessibilite,
  verifierMiseEnPage,
} from './outils.js';

const compteur = (page, nom) => page.getByRole('spinbutton', { name: nom });

test('le nombre d’éléments joués est proposé selon les joueurs, et chacun passe autant de fois', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  // À trois, 5 mots : 3 mots, chacun passe une fois
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  const cadre = page.locator('#cadre');
  const mots = compteur(page, 'Nombre de mots');
  const equilibrer = cadre.getByRole('button', { name: 'Équilibrer' });
  await expect(mots).toHaveAttribute('aria-valuenow', '3');
  await expect(mots).toHaveAttribute('aria-valuemin', '1');
  await expect(mots).toHaveAttribute('aria-valuemax', '5');
  await expect(cadre.getByText('Chacun passe une fois')).toBeVisible();
  await expect(equilibrer).toBeHidden();
  await verifierAccessibilite(page);

  // Le nombre suit les joueurs tant qu'on n'y a pas touché : sans Chloé, 2 joueurs, 4 mots ; avec elle, 3 mots
  await page
    .getByRole('region', { name: 'Qui joue ?' })
    .getByRole('button', { name: 'Chloé' })
    .click();
  await expect(mots).toHaveAttribute('aria-valuenow', '4');
  await expect(cadre.getByText('Chacun passe 2 fois')).toBeVisible();
  await page
    .getByRole('region', { name: 'Qui joue ?' })
    .getByRole('button', { name: 'Chloé' })
    .click();
  await expect(mots).toHaveAttribute('aria-valuenow', '3');

  // 4 mots : Bob et Chloé passent une fois de moins ; « Équilibrer » revient à 3
  await mots.focus();
  await mots.press('ArrowUp');
  await expect(mots).toHaveAttribute('aria-valuenow', '4');
  await expect(cadre.getByText('Bob et Chloé passeront une fois de moins')).toBeVisible();
  await expect(equilibrer).toBeVisible();
  await equilibrer.click();
  await expect(mots).toHaveAttribute('aria-valuenow', '3');
  await expect(equilibrer).toBeHidden();

  expect(erreurs).toEqual([]);
});

test('on joue moins de mots que préparés : la partie finit après le dernier', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  const cadre = page.locator('#cadre');
  // La valeur proposée (3) est jouée : 3 mots sur 5, tirés au hasard
  await lancerPartie(page);
  const saisie = page.getByLabel('Proposition du participant');
  for (let numero = 1; numero <= 3; numero++) {
    const titre = cadre.getByText(new RegExp(`Mot\\s${numero}\\ssur\\s3\\s·\\s\\d+\\slettres`));
    await expect(titre).toBeVisible();
    const longueur = Number((await titre.textContent()).match(/(\d+)\slettres/)[1]);
    // On passe vite le mot : 6 propositions fausses
    for (let i = 0; i < 6; i++) {
      const debut = (await saisie.inputValue()).slice(0, 1);
      await saisie.fill(debut + 'Z'.repeat(longueur - 1));
      await saisie.press('Enter');
    }
    await expect(cadre.getByText('Pas trouvé cette fois…')).toBeVisible();
    if (numero < 3) await page.getByRole('button', { name: 'Mot suivant' }).click();
  }
  await expect(page.getByRole('button', { name: 'Mot suivant' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  await expect(cadre.getByText('Les 3 mots ont été joués.')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('un jeu collectif joué avec moins de questions : Debout ou assis finit après la deuxième', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'debout-assis', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  const cadre = page.locator('#cadre');
  const affirmations = compteur(page, 'Nombre d’affirmations');
  // Collectif : aucune contrainte, tout le contenu est proposé ; pas de ligne sur les passages
  await expect(affirmations).toHaveAttribute('aria-valuenow', '8');
  await expect(cadre.getByText(/passe|passera|passeront/)).toHaveCount(0);
  await expect(cadre.getByRole('button', { name: 'Équilibrer' })).toBeHidden();
  await choisirNombre(page, 'Temps pour se décider', 3);
  await choisirNombre(page, 'Nombre d’affirmations', 2);
  await verifierAccessibilite(page);
  await lancerPartie(page);
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  await expect(cadre.getByText('Affirmation 1 sur 2')).toBeVisible();
  await expect(page.locator('.debout__verdict')).toBeVisible({ timeout: 6000 });
  await page.getByRole('button', { name: 'Affirmation suivante' }).click();
  await expect(cadre.getByText('Affirmation 2 sur 2')).toBeVisible();
  await expect(page.locator('.debout__verdict')).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('button', { name: 'Affirmation suivante' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Pyramide à 7 joueurs : « Équilibrer » baisse aussi les mots par binôme', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', {
    prenoms: ['Ana', 'Bob', 'Chloé', 'Dan', 'Eva', 'Fred', 'Gaëlle'],
  });
  const cadre = page.locator('#cadre');
  const mots = compteur(page, 'Nombre de mots');
  const parBinome = compteur(page, 'Mots à faire deviner par binôme');
  const equilibrer = cadre.getByRole('button', { name: 'Équilibrer' });

  // 2 mots par binôme : 7 binômes demanderaient 14 mots, le contenu en a 10
  await expect(parBinome).toHaveAttribute('aria-valuenow', '2');
  await expect(mots).toHaveAttribute('aria-valuenow', '10');
  await expect(
    cadre.getByText(
      /5\sbinômes\s:\s4\sjoueurs\spasseront\sune\sfois\sde\smoins\.\sAvec\s1\smot\spar\sbinôme,\s7\smots\s:\schacun\spasse\s2\sfois\./,
    ),
  ).toBeVisible();
  await expect(equilibrer).toBeVisible();
  await verifierAccessibilite(page);

  // Un clic règle les deux : 1 mot par binôme, 7 mots
  await equilibrer.click();
  await expect(parBinome).toHaveAttribute('aria-valuenow', '1');
  await expect(parBinome).toHaveText('1');
  await expect(mots).toHaveAttribute('aria-valuenow', '7');
  await expect(cadre.getByText(/7\sbinômes\s:\schacun\spasse\s2\sfois/)).toBeVisible();
  await expect(equilibrer).toBeHidden();
  await verifierMiseEnPage(page);

  await lancerPartie(page);
  await expect(cadre.getByText('7 mots à faire deviner · 1 par binôme')).toBeVisible();
  await page.getByRole('button', { name: /C’est parti/ }).click();
  await expect(cadre.getByText('Mot 1 sur 7')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('les jeux qui ont leur propre nombre d’éléments n’ont pas de compteur', async ({ page }) => {
  for (const slug of ['bingo', 'memoire-vive']) {
    await ouvrirJeu(page, slug, { prenoms: ['Ana', 'Bob', 'Chloé'] });
    await expect(page.locator('.nombre-joues')).toHaveCount(0);
  }
});

test('les réglages de lancement en nombre sont des compteurs − / +', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'qui-suis-je');
  const palier = compteur(page, 'Durée de chaque palier');
  await expect(palier).toHaveAttribute('aria-valuenow', '6');
  await expect(palier).toHaveText(/^6\ssecondes$/);
  await page.getByRole('button', { name: 'Augmenter : Durée de chaque palier' }).click();
  await expect(palier).toHaveText(/^7\ssecondes$/);
  await palier.focus();
  await palier.press('Home');
  await expect(palier).toHaveAttribute('aria-valuenow', '2');
  await expect(
    page.getByRole('button', { name: 'Diminuer : Durée de chaque palier' }),
  ).toHaveAttribute('aria-disabled', 'true');
  await palier.press('End');
  await expect(palier).toHaveAttribute('aria-valuenow', '30');
  // Le choix reste après rechargement
  await choisirNombre(page, 'Durée de chaque palier', 4);
  await page.reload();
  await expect(compteur(page, 'Durée de chaque palier')).toHaveAttribute('aria-valuenow', '4');
  await verifierMiseEnPage(page);
  expect(erreurs).toEqual([]);
});
