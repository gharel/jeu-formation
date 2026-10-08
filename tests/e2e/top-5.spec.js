import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

async function proposer(page, texte) {
  await page.getByLabel('Proposition du groupe').fill(texte);
  await page.getByLabel('Proposition du groupe').press('Enter');
}

test('Top 5 : réponses retournées, erreurs, points attribués, question suivante', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'top-5', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const tableau = cadre.getByRole('list', { name: 'Les 5 réponses' });

  await expect(cadre.getByRole('heading', { name: 'Citez un navigateur web.' })).toBeVisible();
  await expect(tableau.getByRole('listitem')).toHaveCount(5);
  await verifierAccessibilite(page);

  // Un seul mot de la réponse, une faute de frappe ou une variante sont reconnus
  await proposer(page, 'mozilla');
  await expect(cadre.getByText('« Mozilla Firefox » : 4 points !')).toBeVisible();
  await proposer(page, 'Chrom');
  await expect(tableau).toContainText('Google Chrome');
  await expect(cadre.locator('.top5__score')).toHaveText('9 points sur 15');
  await proposer(page, 'Firefox');
  await expect(cadre.getByText('« Mozilla Firefox » est déjà au tableau !')).toBeVisible();

  // Une proposition absente : une erreur
  await proposer(page, 'Brave');
  await expect(cadre.getByText('« Brave » n’est pas dans le top 5.')).toBeVisible();
  await verifierAccessibilite(page);

  // Les points vont à qui a trouvé : une personne, ou tout le monde
  await page.getByRole('button', { name: /Attribuer les 5 points de/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ana', exact: true }).click();
  await expect(pointsDe(page, 'Ana')).toHaveText('5');
  await expect(tableau).toContainText('+5 pour Ana');
  await page.getByRole('button', { name: /Attribuer les 4 points de/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Tout le monde', exact: true })
    .click();
  await expect(tableau).toContainText('+4 pour tout le monde');
  await expect(pointsDe(page, 'Ana')).toHaveText('9');
  await expect(pointsDe(page, 'Bob')).toHaveText('4');
  await verifierAccessibilite(page);

  // Une réponse dite autrement : l'animateur retourne la case à la main
  await page.getByRole('button', { name: /Réponse 3, cachée/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Retourner' }).click();
  await expect(tableau).toContainText('Microsoft Edge');

  // Deux erreurs de plus : la manche s'arrête et le reste se dévoile
  await page.getByRole('button', { name: 'Mauvaise réponse' }).click();
  await page.getByRole('button', { name: 'Mauvaise réponse' }).click();
  await expect(cadre.getByText(/3\serreurs\s:\sla manche s’arrête/)).toBeVisible();
  await expect(tableau).toContainText('Safari');
  await expect(tableau).toContainText('Opera');
  await expect(page.getByLabel('Proposition du groupe')).toBeHidden();

  // Entrée : question suivante, et cette fois on trouve tout
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Question 2 sur 6')).toBeVisible();
  for (const reponse of ['usb', 'souris', 'clavier', 'imprimante', 'disque']) {
    await proposer(page, reponse);
  }
  await expect(cadre.getByText(/Les 5\sréponses sont trouvées, bravo\s!/)).toBeVisible();
  await expect(cadre.locator('.top5__score')).toHaveText('15 points sur 15');
  expect(erreurs).toEqual([]);
});

test('Top 5 : un mot commun à plusieurs réponses demande de préciser, sans erreur', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'top-5');
  await page.evaluate(() =>
    localStorage.setItem(
      'skazy-jeux:top-5:contenu',
      JSON.stringify({
        reglages: { erreursMax: 3 },
        elements: [
          {
            question: 'Citez une application de Microsoft 365.',
            reponses: [
              'Word / Microsoft Word',
              'Excel / Microsoft Excel',
              'PowerPoint',
              'Outlook',
              'Teams / Microsoft Teams',
            ],
          },
        ],
      }),
    ),
  );
  await page.reload();
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const saisie = page.getByLabel('Proposition du groupe');

  await proposer(page, 'Microsoft');
  await expect(
    cadre.getByText('« Microsoft » se trouve dans plusieurs réponses : précisez.'),
  ).toBeVisible();
  await expect(saisie).toHaveValue('Microsoft');
  await expect(cadre.locator('.top5__score')).toHaveText('0 point sur 15');
  await expect(cadre.locator('.top5__x--pleine')).toHaveCount(0);

  // La saisie gardée se complète
  await saisie.press('End');
  await saisie.pressSequentially(' Teams');
  await saisie.press('Enter');
  await expect(cadre.getByText('« Teams » : 1 point !')).toBeVisible();
  expect(erreurs).toEqual([]);
});
