import { test, expect } from '@playwright/test';
import { surveillerErreurs, ouvrirJeu, lancerPartie, verifierAccessibilite } from './outils.js';

const GROUPE = ['Ana', 'Bob', 'Chloé', 'David', 'Emma'];

/** Prénoms des joueurs cochés dans « Qui joue ? ». */
async function joueursCoches(page) {
  return page
    .getByRole('list', { name: 'Joueurs' })
    .locator('button[aria-pressed="true"]')
    .evaluateAll((boutons) => boutons.map((b) => b.dataset.joueur));
}

test('Qui joue ? : tout le groupe, au clic ou au hasard, sans mémoriser le choix', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'motus', { prenoms: GROUPE });
  const bloc = page.getByRole('region', { name: 'Qui joue ?' });

  // Par défaut, tout le groupe joue
  await expect(bloc.getByRole('radio', { name: 'Tout le groupe' })).toBeChecked();
  expect(await joueursCoches(page)).toEqual(GROUPE);
  await expect(bloc).toContainText('Tout le groupe joue : 5 joueurs.');
  await verifierAccessibilite(page);

  // Au clic : Bob ne joue pas ; seuls les joueurs choisis ont des points
  await bloc.getByRole('button', { name: 'Bob' }).click();
  await expect(bloc.getByRole('radio', { name: 'Choisir' })).toBeChecked();
  await expect(bloc.getByRole('button', { name: 'Bob' })).toHaveAttribute('aria-pressed', 'false');
  await expect(bloc).toContainText('4 joueurs sur 5.');
  await lancerPartie(page);
  const points = page.getByRole('list', { name: 'Points' }).getByRole('listitem');
  await expect(points).toHaveCount(4);
  await expect(page.getByRole('list', { name: 'Points' })).not.toContainText('Bob');
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quitter' }).click();
  // De retour à l'accueil du jeu, la sélection est toujours là
  await expect(bloc.getByRole('button', { name: 'Bob' })).toHaveAttribute('aria-pressed', 'false');

  // Au hasard : 2 joueurs, puis 2 autres (ceux qui n'ont pas encore été tirés d'abord)
  await bloc.getByText('Au hasard', { exact: true }).click();
  await bloc.getByLabel('Nombre de joueurs').fill('2');
  await bloc.getByLabel('Nombre de joueurs').press('Enter');
  const premiers = await joueursCoches(page);
  expect(premiers).toHaveLength(2);
  await bloc.getByRole('button', { name: 'Tirer au sort' }).click();
  const seconds = await joueursCoches(page);
  expect(seconds).toHaveLength(2);
  expect(seconds.some((p) => premiers.includes(p))).toBe(false);
  await verifierAccessibilite(page);

  // Sans aucun joueur, pas de partie
  await bloc.getByText('Choisir', { exact: true }).click();
  for (const prenom of await joueursCoches(page)) {
    await bloc.getByRole('button', { name: prenom }).click();
  }
  await expect(page.getByRole('button', { name: /Lancer la partie/ })).toBeDisabled();
  await expect(page.locator('#cadre').getByText('Choisissez au moins un joueur.')).toBeVisible();

  // Le choix n'est pas mémorisé : chaque ouverture repart de « Tout le groupe »
  await page.reload();
  await expect(bloc.getByRole('radio', { name: 'Tout le groupe' })).toBeChecked();
  expect(await joueursCoches(page)).toEqual(GROUPE);
  expect(erreurs).toEqual([]);
});

test('une absence, marquée dans le groupe, retire la personne des jeux et de la roue', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/?graine=1');
  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob, Chloé');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByRole('button', { name: 'Absence aujourd’hui : Bob' }).click();
  await expect(page.getByRole('button', { name: 'Absence aujourd’hui : Bob' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.locator('#cadre').getByText('3 participants · 1 absence aujourd’hui'),
  ).toBeVisible();
  // Sur le plan, Bob garde sa place, marquée absente
  await page.getByRole('button', { name: 'Placer dans l’ordre' }).click();
  await expect(
    page.getByRole('button', { name: 'Place 2 : Bob, absence aujourd’hui' }),
  ).toBeVisible();
  await verifierAccessibilite(page);

  // Dans un jeu : Bob ne joue pas, et la roue ne le tire pas
  await page.goto('/jeux/motus/?graine=1');
  const bloc = page.getByRole('region', { name: 'Qui joue ?' });
  await expect(page.getByRole('list', { name: 'Joueurs' }).getByRole('button')).toHaveCount(2);
  await expect(bloc).toContainText('Absences aujourd’hui : Bob.');
  await page.getByRole('heading', { name: 'Comment on joue ?' }).click();
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('r');
    const roue = page.getByRole('dialog', { name: /Désigner/ });
    await roue.getByRole('button', { name: /Lancer la roue|Relancer/ }).click();
    await expect(roue.locator('.roue-resultat')).not.toBeEmpty();
    expect(await roue.locator('.roue-resultat').textContent()).not.toBe('Bob');
    await roue.getByRole('button', { name: /C’est parti/ }).click();
  }
  // La fenêtre Groupe le montre absent
  await page.getByRole('button', { name: 'Groupe', exact: true }).click();
  const fenetre = page.getByRole('dialog', { name: 'Le groupe' });
  await expect(fenetre.getByRole('listitem').filter({ hasText: 'Bob' })).toContainText('Absence');
  await fenetre.getByRole('button', { name: 'Fermer', exact: true }).last().click();

  // De retour : Bob rejoue
  await page.goto('/groupe/');
  await page.getByRole('button', { name: 'Absence aujourd’hui : Bob' }).click();
  await page.goto('/jeux/motus/');
  await expect(page.getByRole('list', { name: 'Joueurs' }).getByRole('button')).toHaveCount(3);
  expect(erreurs).toEqual([]);
});

test('un retardataire s’ajoute depuis le jeu, avec son info, et rejoint la sélection', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob'] });
  const bloc = page.getByRole('region', { name: 'Qui joue ?' });
  await bloc.getByRole('button', { name: 'Ana' }).click();
  await bloc.getByRole('button', { name: 'Ajouter quelqu’un' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Ajouter quelqu’un' });
  await dialogue.getByLabel('Prénom').fill('Zoé');
  await dialogue.getByLabel('Une info (facultatif)').selectOption('dessert');
  await dialogue.getByLabel('Info', { exact: true }).fill('la tarte au citron');
  await verifierAccessibilite(page);
  await dialogue.getByRole('button', { name: 'Ajouter' }).click();
  await expect(bloc.getByRole('button', { name: 'Zoé' })).toHaveAttribute('aria-pressed', 'true');
  expect(await joueursCoches(page)).toEqual(['Bob', 'Zoé']);

  // Elle fait désormais partie du groupe, avec son info
  await page.goto('/groupe/');
  await expect(
    page
      .getByRole('list', { name: 'Participants' })
      .getByRole('listitem')
      .filter({ hasText: 'Zoé' }),
  ).toContainText('la tarte au citron');
  expect(erreurs).toEqual([]);
});
