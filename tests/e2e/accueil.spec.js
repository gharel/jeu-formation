import { test, expect } from '@playwright/test';
import { JEUX } from '../../assets/js/jeux.js';
import { surveillerErreurs, verifierAccessibilite } from './outils.js';

test('l’accueil présente un jeu par carte, avec un lien qui fonctionne', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/');
  await expect(page).toHaveTitle('Mini-jeux · Skazy Formation');
  await expect(page.getByRole('img', { name: 'Skazy Formation' })).toBeVisible();

  const cartes = page.locator('.carte-jeu');
  await expect(cartes).toHaveCount(JEUX.length);
  for (const jeu of JEUX) {
    await expect(page.getByRole('link', { name: jeu.titre })).toHaveAttribute(
      'href',
      `jeux/${jeu.slug}/`,
    );
  }

  await page.getByRole('link', { name: JEUX[0].titre }).click();
  await expect(page.getByRole('heading', { level: 1, name: JEUX[0].titre })).toBeVisible();
  await page.getByRole('link', { name: /retour aux mini-jeux/ }).click();
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  expect(erreurs).toEqual([]);
});

test('le bouton « Un jeu au hasard » tire un jeu avec la roue et l’ouvre', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/?graine=4');
  await page.getByRole('button', { name: 'Un jeu au hasard' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Quel jeu pour réveiller la salle ?' });
  await dialogue.getByRole('button', { name: 'Lancer la roue' }).click();
  const resultat = dialogue.locator('.roue-resultat');
  await expect(resultat).not.toBeEmpty();
  const texte = await resultat.textContent();
  const jeu = JEUX.find((j) => texte.includes(j.titre));
  expect(jeu, `jeu tiré : ${texte}`).toBeTruthy();
  // L'accroche du jeu s'affiche sous son titre
  await expect(dialogue.locator('.roue-detail')).toContainText(jeu.accroche.slice(0, 12));
  await verifierAccessibilite(page);
  await dialogue.getByRole('button', { name: `Jouer à ${jeu.titre}` }).click();
  await expect(page).toHaveURL(new RegExp(`/jeux/${jeu.slug}/$`));
  await expect(page.getByRole('heading', { level: 1, name: jeu.titre })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('une info par participant, affichée par la roue et partagée entre les jeux', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(`/jeux/${JEUX[0].slug}/?graine=2`);
  // Prénom + info
  await page.getByLabel('Ajouter un prénom').fill('Marie');
  await page.getByLabel('Thème de l’info').selectOption('dessert');
  await page.getByLabel('Info', { exact: true }).fill('le tiramisu');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  // Plusieurs prénoms à la fois : l'info n'est pas recopiée
  await page.getByLabel('Ajouter un prénom').fill('Paul, Léa');
  await page.getByLabel('Info', { exact: true }).fill('ignorée');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const puces = page.getByRole('list', { name: 'Participants' });
  await expect(puces.getByRole('listitem').filter({ hasText: 'Marie' })).toContainText(
    'le tiramisu',
  );
  await expect(puces).not.toContainText('ignorée');
  await verifierAccessibilite(page);

  // Ajouter une info à Paul avec le crayon
  await page.getByRole('button', { name: 'Ajouter une info sur Paul' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Une info sur Paul' });
  await dialogue.getByLabel('Thème').selectOption('film');
  await dialogue.getByLabel('Réponse').fill('Le Grand Bleu');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(puces.getByRole('listitem').filter({ hasText: 'Paul' })).toContainText(
    'Le Grand Bleu',
  );

  // La roue montre l'info de la personne tirée
  await page.getByRole('button', { name: /Désigner quelqu’un/ }).click();
  const roue = page.getByRole('dialog', { name: /Désigner/ });
  for (let i = 0; i < 3; i++) {
    await roue.getByRole('button', { name: /Lancer la roue|Relancer/ }).click();
    await expect(roue.locator('.roue-resultat')).not.toBeEmpty();
    const prenom = await roue.locator('.roue-resultat').textContent();
    if (prenom === 'Marie') {
      await expect(roue.locator('.roue-detail')).toContainText('Dessert préféré');
      await expect(roue.locator('.roue-detail')).toContainText('le tiramisu');
    }
    if (prenom === 'Léa') await expect(roue.locator('.roue-detail')).toBeEmpty();
  }
  await roue.getByRole('button', { name: 'Fermer' }).click();

  // Partagé avec un autre jeu, retiré avec la personne
  await page.goto(`/jeux/${JEUX[1].slug}/`);
  await expect(puces.getByRole('listitem').filter({ hasText: 'Marie' })).toContainText(
    'le tiramisu',
  );
  await page.getByRole('button', { name: 'Retirer Marie' }).click();
  await page.getByLabel('Ajouter un prénom').fill('Marie');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(puces).not.toContainText('tiramisu');
  expect(erreurs).toEqual([]);
});

test('l’accueil est accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  await verifierAccessibilite(page);
});

test.describe('chaque jeu', () => {
  for (const jeu of JEUX) {
    test(`${jeu.titre} : accueil, préparation et participants partagés`, async ({ page }) => {
      const erreurs = surveillerErreurs(page);
      await page.goto(`/jeux/${jeu.slug}/`);
      await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
      await expect(
        page.locator('#cadre').getByText('contenu d’exemple', { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /Lancer la partie/ })).toBeEnabled();
      await verifierAccessibilite(page);

      // Les prénoms saisis ici se retrouvent dans les autres jeux
      await page.getByLabel('Ajouter un prénom').fill('Ana, Bob');
      await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('list', { name: 'Participants' })).toContainText('Ana');

      await page.getByRole('button', { name: /Préparer le contenu/ }).click();
      await expect(page.getByRole('heading', { name: 'Préparer le contenu' })).toBeVisible();
      await expect(page.locator('.editeur')).toHaveClass(/editeur--masque/);
      await verifierAccessibilite(page);
      await page.getByRole('button', { name: 'Annuler' }).click();
      await expect(page.getByRole('heading', { name: 'Comment on joue ?' })).toBeVisible();
      expect(erreurs).toEqual([]);
    });
  }
});

test('la roue désigne chacun une fois avant de recommencer', async ({ page }) => {
  await page.goto(`/jeux/${JEUX[0].slug}/?graine=3`);
  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob, Chloé');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  // La touche R est ignorée pendant la saisie d'un prénom
  await page.keyboard.press('r');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('heading', { name: 'Comment on joue ?' }).click();
  const tires = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('r');
    const dialogue = page.getByRole('dialog', { name: /Désigner/ });
    await dialogue.getByRole('button', { name: /Lancer la roue|Relancer/ }).click();
    const resultat = dialogue.locator('.roue-resultat');
    await expect(resultat).not.toBeEmpty();
    tires.push(await resultat.textContent());
    await dialogue.getByRole('button', { name: /C’est parti/ }).click();
    await expect(dialogue).toBeHidden();
  }
  expect([...tires].sort()).toEqual(['Ana', 'Bob', 'Chloé']);
});
