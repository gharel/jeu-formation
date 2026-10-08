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
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('0');

  // Firefox (4 points) : les Bleus
  await page.getByRole('button', { name: /Attribuer les 4 points de/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Les Bleus/ })
    .click();
  await expect(pointsEquipe(page, 'Les Bleus')).toHaveText('4');
  await expect(pointsDe(page, 'Ana')).toHaveText('9');

  await page.getByRole('button', { name: 'Tout dévoiler' }).click();
  await page.getByRole('button', { name: /Voir le classement/ }).click();
  const classement = page.getByRole('list', { name: 'Classement des équipes' });
  await expect(classement.getByRole('listitem')).toHaveText([
    /Les Rouges\s*5\spts/,
    /Les Bleus\s*4\spts/,
  ]);
  await verifierAccessibilite(page);

  // Sur la page « Le groupe » : le classement des équipes, corrigeable
  await page.goto('/groupe/');
  const scores = page.getByRole('list', { name: 'Scores des équipes' });
  await expect(scores.getByRole('listitem').first()).toContainText('Les Rouges');
  await expect(page.getByLabel('Score de l’équipe Les Bleus')).toHaveValue('4');
  await page.getByRole('button', { name: 'Un point de plus pour l’équipe Les Bleus' }).click();
  await expect(page.getByLabel('Score de l’équipe Les Bleus')).toHaveValue('5');
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
