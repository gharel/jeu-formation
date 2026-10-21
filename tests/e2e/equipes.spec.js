import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { surveillerErreurs, lancerPartie, pointsDe, verifierAccessibilite } from './outils.js';

const EQUIPES = [
  { id: 'e1', nom: 'Les Bleus', membres: ['ana', 'bob'] },
  { id: 'e2', nom: 'Les Rouges', membres: ['chloé', 'david'] },
];

/** Ouvre un jeu avec quatre participants répartis en deux équipes (et un contenu, s'il est donné). */
async function ouvrirAvecEquipes(page, slug, contenu = null) {
  await page.goto(`/jeux/${slug}/?graine=1`);
  await page.evaluate(
    ({ equipes, slug, contenu }) => {
      localStorage.setItem(
        'skazy-jeux:participants',
        JSON.stringify(['Ana', 'Bob', 'Chloé', 'David']),
      );
      localStorage.setItem('skazy-jeux:equipes', JSON.stringify(equipes));
      if (contenu) localStorage.setItem(`skazy-jeux:${slug}:contenu`, JSON.stringify(contenu));
    },
    { equipes: EQUIPES, slug, contenu },
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
}

/** Points d'une équipe dans le tableau de la partie. */
function pointsEquipe(page, nom) {
  return page
    .getByRole('list', { name: 'Points des équipes' })
    .getByRole('listitem')
    .filter({ hasText: nom })
    .locator('.tableau-points__valeur');
}

test('Le groupe : former des équipes au hasard, les renommer, changer quelqu’un d’équipe', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/?graine=1');
  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob, Chloé, David, Emma');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const bloc = page.locator('.bloc-equipes');
  await expect(bloc).toContainText('Pas encore d’équipe');

  await page.getByLabel('Nombre d’équipes').selectOption('2');
  await page.getByRole('button', { name: 'Former au hasard' }).click();
  const equipes = bloc.getByRole('list', { name: 'Équipes', exact: true }).locator('> li');
  await expect(equipes).toHaveCount(2);
  // 5 personnes en 2 équipes : 3 et 2
  await expect(bloc.locator('.equipe__compte')).toHaveText(['3 membres', '2 membres']);
  await verifierAccessibilite(page);

  // Renommer
  await page.getByLabel('Nom de l’équipe 1').fill('Les Bleus');
  await page.getByLabel('Nom de l’équipe 1').press('Enter');
  await expect(page.getByLabel('Nom de l’équipe 1')).toHaveValue('Les Bleus');

  // Changer une personne d'équipe : elle passe dans l'autre
  const premier = equipes.first().locator('.puce--bouton').first();
  const prenom = (await premier.locator('.puce__prenom').textContent()).trim();
  await premier.click();
  const dialogue = page.getByRole('dialog', { name: `Équipe de ${prenom}` });
  await dialogue.getByRole('button', { name: 'Équipe 2' }).click();
  await expect(bloc.locator('.equipe__compte')).toHaveText(['2 membres', '3 membres']);
  await expect(equipes.nth(1)).toContainText(prenom);

  // Sans équipe, puis une équipe de plus
  await equipes
    .nth(1)
    .getByRole('button', { name: new RegExp(prenom) })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sans équipe' }).click();
  await expect(bloc.getByRole('list', { name: /Sans équipe/ })).toContainText(prenom);
  await page.getByRole('button', { name: 'Ajouter une équipe' }).click();
  await expect(equipes).toHaveCount(3);
  await expect(page.getByLabel('Nom de l’équipe 3')).toHaveValue('Équipe 3');
  await verifierAccessibilite(page);

  // Supprimer les équipes
  await page.getByRole('button', { name: 'Supprimer les équipes' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(bloc).toContainText('Pas encore d’équipe');
  expect(erreurs).toEqual([]);
});

test('en partie, une équipe marque : ses points et ceux de ses membres', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'motus');
  await lancerPartie(page);
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('0');

  await page.getByLabel('Proposition du participant').fill('CLAVIER');
  await page.getByLabel('Proposition du participant').press('Enter');
  await page.getByRole('button', { name: /Attribuer/ }).click();
  const dialogue = page.getByRole('dialog', { name: 'Qui a trouvé le mot ?' });
  await expect(dialogue.getByRole('group', { name: 'Équipes' })).toContainText('Ana, Bob');
  await verifierAccessibilite(page);
  await dialogue.getByRole('button', { name: /Les Bleus/ }).click();

  await expect(page.getByRole('button', { name: /pour Les Bleus/ })).toBeDisabled();
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('1');
  await expect(pointsEquipe(page, 'Les Rouges')).toHaveText('0');
  await expect(pointsDe(page, 'Ana')).toHaveText('1');
  await expect(pointsDe(page, 'Bob')).toHaveText('1');
  await expect(pointsDe(page, 'Chloé')).toHaveText('0');
  await verifierAccessibilite(page);
  expect(erreurs).toEqual([]);
});

test('plusieurs équipes et personnes à la fois, classement des équipes en fin de partie et dans le groupe', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'top-5', {
    reglages: { erreursMax: 3 },
    elements: [
      {
        question: 'Citez un navigateur web.',
        reponses: ['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera'],
      },
    ],
  });
  await lancerPartie(page);
  const saisie = page.getByLabel('Proposition du groupe');
  await saisie.fill('chrome');
  await saisie.press('Enter');
  await saisie.fill('firefox');
  await saisie.press('Enter');

  // Chrome (5 points) : les Rouges et Ana, cochés ensemble
  await page.getByRole('button', { name: /Attribuer les 5 points de/ }).click();
  const dialogue = page.getByRole('dialog');
  await dialogue.getByRole('button', { name: 'Plusieurs personnes' }).click();
  await dialogue.getByRole('button', { name: /Les Rouges/ }).click();
  await expect(dialogue.getByRole('button', { name: 'Chloé', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialogue.getByRole('button', { name: 'Ana', exact: true }).click();
  await dialogue.getByRole('button', { name: 'Valider' }).click();
  const tableau = page.locator('#cadre').getByRole('list', { name: 'Les 5 réponses' });
  await expect(tableau).toContainText('+5 pour Les Rouges et Ana');
  await expect(pointsEquipe(page, 'Les Rouges')).toHaveText('5');
  // Équipes et joueurs (le mode d'un groupe qui a des équipes) : Ana fait marquer son équipe
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('5');

  // Firefox (4 points) : les Bleus
  await page.getByRole('button', { name: /Attribuer les 4 points de/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Les Bleus/ })
    .click();
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('9');
  await expect(pointsDe(page, 'Ana')).toHaveText('9');

  await page.getByRole('button', { name: 'Tout dévoiler' }).click();
  await page.getByRole('button', { name: /Voir le classement/ }).click();
  const classement = page.getByRole('list', { name: 'Classement des équipes' });
  await expect(classement.getByRole('listitem')).toHaveText([
    /Les Bleus\s*9\spts/,
    /Les Rouges\s*5\spts/,
  ]);
  await verifierAccessibilite(page);

  // Sur la page « Le groupe » : le classement des équipes, corrigeable
  await page.goto('/groupe/');
  const scores = page.getByRole('list', { name: 'Scores des équipes' });
  await expect(scores.getByRole('listitem').first()).toContainText('Les Bleus');
  await expect(page.getByLabel('Score de l’équipe Les Bleus')).toHaveValue('9');
  await page.getByRole('button', { name: 'Un point de plus pour l’équipe Les Bleus' }).click();
  await expect(page.getByLabel('Score de l’équipe Les Bleus')).toHaveValue('10');
  await verifierAccessibilite(page);
  expect(erreurs).toEqual([]);
});

test('les équipes et leurs points voyagent dans le fichier du groupe', async ({
  page,
}, testInfo) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/');
  await page.evaluate((equipes) => {
    localStorage.setItem(
      'skazy-jeux:participants',
      JSON.stringify(['Ana', 'Bob', 'Chloé', 'David']),
    );
    localStorage.setItem('skazy-jeux:equipes', JSON.stringify(equipes));
    localStorage.setItem('skazy-jeux:scores-equipes', JSON.stringify({ e2: { motus: 3 } }));
  }, EQUIPES);
  await page.reload();

  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le groupe' }).click(),
  ]);
  const chemin = testInfo.outputPath('groupe.json');
  await telechargement.saveAs(chemin);
  const donnees = JSON.parse(await readFile(chemin, 'utf8'));
  expect(donnees.groupe.equipes).toEqual([
    { nom: 'Les Bleus', membres: ['Ana', 'Bob'] },
    { nom: 'Les Rouges', membres: ['Chloé', 'David'], points: { motus: 3 } },
  ]);

  // On supprime les équipes, puis le fichier les rend, avec leurs points
  await page.getByRole('button', { name: 'Supprimer les équipes' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await page.locator('#fichier-groupe').setInputFiles(chemin);
  await page.getByRole('dialog').getByRole('button', { name: 'Remplacer' }).click();
  await expect(page.getByLabel('Nom de l’équipe 2')).toHaveValue('Les Rouges');
  await expect(page.getByLabel('Score de l’équipe Les Rouges')).toHaveValue('3');
  expect(erreurs).toEqual([]);
});

/** Choisit le mode de jeu sur l'accueil du jeu. */
async function choisirMode(page, libelle) {
  const bloc = page.getByRole('region', { name: 'Mode de jeu' });
  await bloc.getByText(libelle, { exact: true }).click();
  await expect(bloc.getByRole('radio', { name: libelle })).toBeChecked();
  return bloc;
}

test('mode par équipes : qui joue contre qui, seules les équipes marquent, un point s’annule', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'motus');
  const bloc = await choisirMode(page, 'Par équipes');
  const affiche = bloc.getByRole('list', { name: 'Qui joue contre qui' });
  await expect(affiche).toContainText('Les Bleus');
  await expect(affiche).toContainText('Chloé, David');
  await verifierAccessibilite(page);
  await lancerPartie(page);

  // Pas de points par personne : seulement ceux des équipes
  await expect(page.getByRole('list', { name: 'Points des équipes' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Points', exact: true })).toHaveCount(0);

  await page.getByLabel('Proposition du participant').fill('CLAVIER');
  await page.getByLabel('Proposition du participant').press('Enter');
  await page.getByRole('button', { name: /Attribuer/ }).click();
  // La fenêtre ne propose que les équipes
  const dialogue = page.getByRole('dialog', { name: 'Qui a trouvé le mot ?' });
  await expect(dialogue.getByRole('button', { name: /Les Bleus/ })).toBeVisible();
  await expect(dialogue.getByRole('button', { name: 'Ana', exact: true })).toHaveCount(0);
  await dialogue.getByRole('button', { name: /Les Rouges/ }).click();
  await expect(pointsEquipe(page, 'Les Rouges')).toHaveText('1');

  // Erreur de clic : on annule, puis on attribue à la bonne équipe
  await page.getByRole('button', { name: 'Annuler les points' }).click();
  await expect(pointsEquipe(page, 'Les Rouges')).toHaveText('0');
  await page.getByRole('button', { name: /Attribuer 1 point/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Les Bleus/ })
    .click();
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('1');
  await verifierAccessibilite(page);

  // Le choix du mode est gardé pour la séance, d'un jeu à l'autre
  await page.goto('/jeux/top-5/');
  await expect(
    page.getByRole('region', { name: 'Mode de jeu' }).getByRole('radio', { name: 'Par équipes' }),
  ).toBeChecked();
  // Sur la page « Le groupe » : les points de l'équipe (l'erreur de clic est bien retirée)
  await page.goto('/groupe/');
  await expect(page.getByLabel('Score de l’équipe Les Bleus')).toHaveValue('1');
  await expect(page.getByLabel('Score de l’équipe Les Rouges')).toHaveValue('0');
  expect(erreurs).toEqual([]);
});

test('par équipes, un joueur sans équipe est placé avant de lancer (sinon ses points seraient perdus)', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'motus');
  await page.evaluate(() =>
    localStorage.setItem(
      'skazy-jeux:participants',
      JSON.stringify(['Ana', 'Bob', 'Chloé', 'David', 'Zoé']),
    ),
  );
  await page.reload();
  const bloc = await choisirMode(page, 'Par équipes');
  await expect(bloc).toContainText(
    /Sans équipe\s: Zoé\. Par équipes, ses points ne compteraient pas/,
  );

  // Annuler : la partie ne part pas
  await page.getByRole('button', { name: /Lancer la partie/ }).click();
  const dialogue = page.getByRole('dialog', { name: /Zoé n’a pas d’équipe/ });
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();

  // Placer et lancer : Zoé rejoint une équipe, la partie démarre
  await page.getByRole('button', { name: /Lancer la partie/ }).click();
  await dialogue.getByRole('button', { name: 'Placer et lancer' }).click();
  await expect(page.getByRole('button', { name: /Quitter la partie/ })).toBeVisible();
  const equipes = await page.evaluate(() => JSON.parse(localStorage.getItem('skazy-jeux:equipes')));
  expect(equipes.flatMap((e) => e.membres)).toContain('zoé');

  // Chacun pour soi : pas d'avertissement « Sans équipe »
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  await page.evaluate(() =>
    localStorage.setItem(
      'skazy-jeux:equipes',
      JSON.stringify([
        { id: 'e1', nom: 'Les Bleus', membres: ['ana', 'bob'] },
        { id: 'e2', nom: 'Les Rouges', membres: ['chloé', 'david'] },
      ]),
    ),
  );
  await page.reload();
  const blocSeul = await choisirMode(page, 'Chacun pour soi');
  await expect(blocSeul).not.toContainText('Sans équipe');
  expect(erreurs).toEqual([]);
});

test('pyramide par équipes : le binôme se choisit dans l’équipe dont c’est le tour', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'pyramide');
  await choisirMode(page, 'Par équipes');
  await lancerPartie(page);
  await expect(page.locator('#cadre').getByText('Au tour de l’équipe Les Bleus')).toBeVisible();
  for (const libelle of ['Fait deviner', 'Devine, dos à l’écran']) {
    await expect(page.getByLabel(libelle).locator('option')).toHaveText(['Ana', 'Bob']);
  }
  expect(erreurs).toEqual([]);
});

test('chacun pour soi : pas d’équipes en partie ; former les équipes depuis le jeu', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'motus');
  await choisirMode(page, 'Chacun pour soi');
  await lancerPartie(page);
  await expect(page.getByRole('list', { name: 'Points des équipes' })).toHaveCount(0);
  await page.getByLabel('Proposition du participant').fill('CLAVIER');
  await page.getByLabel('Proposition du participant').press('Enter');
  await page.getByRole('button', { name: /Attribuer/ }).click();
  await expect(page.getByRole('dialog').getByRole('group', { name: 'Équipes' })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Bob', exact: true }).click();
  await expect(pointsDe(page, 'Bob')).toHaveText('1');

  // Retour à l'accueil : on forme deux équipes au hasard, sans quitter le jeu
  await page.getByRole('button', { name: /Quitter la partie/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quitter' }).click();
  const bloc = await choisirMode(page, 'Équipes et joueurs');
  await bloc.getByLabel('Nombre d’équipes').selectOption('2');
  await bloc.getByRole('button', { name: 'Former au hasard' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Former au hasard' }).click();
  const affiche = bloc.getByRole('list', { name: 'Qui joue contre qui' });
  await expect(affiche.locator('.affiche-equipes__equipe')).toHaveCount(2);
  await expect(affiche.locator('.affiche-equipes__nombre')).toHaveText([/2/, /2/]);
  expect(erreurs).toEqual([]);
});

test('duel buzzer par équipes : deux équipes s’affrontent, leurs membres répondent à tour de rôle', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirAvecEquipes(page, 'duel-buzzer');
  await choisirMode(page, 'Par équipes');
  await lancerPartie(page);
  await expect(page.getByRole('heading', { name: /Quelles équipes s.affrontent/ })).toBeVisible();
  await page.getByLabel('À gauche, touche A').selectOption({ label: 'Les Bleus' });
  await page.getByLabel('À droite, touche L').selectOption({ label: 'Les Rouges' });
  await page.getByRole('button', { name: 'Commencer le duel' }).click();
  await expect(page.locator('.duel__joueur--gauche')).toContainText('Répond : Ana');
  await expect(page.locator('.duel__joueur--droite')).toContainText('Répond : Chloé');

  await page.keyboard.press('Enter');
  await page.keyboard.press('a');
  await expect(page.locator('#cadre').getByText('Ana (Les Bleus) répond !')).toBeVisible();
  await page.getByRole('button', { name: /Bonne/ }).click();
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('1');

  // Question suivante : au tour de Bob pour les Bleus
  await page.getByRole('button', { name: /Question suivante/ }).click();
  await expect(page.locator('.duel__joueur--gauche')).toContainText('Répond : Bob');
  await verifierAccessibilite(page);
  expect(erreurs).toEqual([]);
});
