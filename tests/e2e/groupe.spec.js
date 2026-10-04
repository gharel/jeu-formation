import { test, expect } from '@playwright/test';
import { surveillerErreurs, ouvrirJeu, lancerPartie, verifierAccessibilite } from './outils.js';

/** Fait glisser un élément sur un autre avec la souris (glisser-déposer du plan de salle). */
async function glisser(page, depuis, vers) {
  const a = await depuis.boundingBox();
  const b = await vers.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

/** Ouvre la page « Le groupe » et ajoute des prénoms, avec une info pour Ana. */
async function preparerGroupe(page) {
  await page.goto('/groupe/?graine=1');
  await expect(page.getByRole('heading', { name: 'Qui est dans la salle ?' })).toBeVisible();
  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob, Chloé, David, Emma, Félix');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter une info sur Ana' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Une info sur Ana' });
  await dialogue.getByLabel('Thème').selectOption('dessert');
  await dialogue.getByLabel('Réponse').fill('le tiramisu');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
}

test('depuis l’accueil, on saisit le groupe et on le place sur le plan de salle', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/');
  const lien = page.getByRole('link', { name: 'Le groupe · à saisir' });
  await expect(lien).toBeVisible();
  await lien.click();
  await expect(page).toHaveURL(/\/groupe\/$/);
  await preparerGroupe(page);

  // En U par défaut, autant de places que de participants
  const salle = page.getByRole('group', { name: /Plan de salle/ });
  await expect(page.getByRole('radio', { name: 'En U' })).toBeChecked();
  await expect(salle.locator('.salle__place')).toHaveCount(6);
  await expect(page.getByLabel('Nombre de places')).toHaveValue('6');
  const aPlacer = page.getByRole('list', { name: 'À placer' });
  await expect(aPlacer.getByRole('button')).toHaveCount(6);

  // 1. Toucher une place, puis choisir qui s'y assoit
  await salle.getByRole('button', { name: 'Place 1, libre' }).click();
  await page.getByRole('dialog', { name: 'Place 1' }).getByRole('button', { name: 'Ana' }).click();
  await expect(
    salle.getByRole('button', { name: 'Place 1 : Ana, dessert préféré : le tiramisu' }),
  ).toBeVisible();

  // 2. Toucher un prénom à placer, puis une place
  await aPlacer.getByRole('button', { name: 'Bob' }).click();
  await expect(aPlacer.getByRole('button', { name: 'Bob' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await salle.getByRole('button', { name: 'Place 2, libre' }).click();
  await expect(salle.getByRole('button', { name: 'Place 2 : Bob' })).toBeVisible();

  // 3. Glisser-déposer à la souris : un prénom sur une place, puis deux places qui s'échangent
  await glisser(
    page,
    aPlacer.getByRole('button', { name: 'Chloé' }),
    salle.getByRole('button', { name: 'Place 3, libre' }),
  );
  await expect(salle.getByRole('button', { name: 'Place 3 : Chloé' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await glisser(
    page,
    salle.getByRole('button', { name: /^Place 1 : Ana/ }),
    salle.getByRole('button', { name: 'Place 2 : Bob' }),
  );
  await expect(salle.getByRole('button', { name: 'Place 1 : Bob' })).toBeVisible();
  await expect(salle.getByRole('button', { name: /^Place 2 : Ana/ })).toBeVisible();

  // Les autres dans l'ordre
  await page.getByRole('button', { name: 'Placer dans l’ordre' }).click();
  await expect(page.locator('#cadre').getByText('Tout le monde est placé.')).toBeVisible();
  await expect(salle.getByRole('button', { name: 'Place 6 : Félix' })).toBeVisible();
  await verifierAccessibilite(page);

  // Îlots : les places indiquent leur îlot
  await page.locator('label.disposition', { hasText: 'Îlots' }).click();
  await expect(page.getByLabel('Personnes par îlot')).toHaveValue('4');
  await expect(salle.getByRole('button', { name: 'Place 5, îlot 2 : Emma' })).toBeVisible();

  // Le plan est gardé ; une personne retirée libère sa place
  await page.reload();
  await expect(salle.getByRole('button', { name: 'Place 1, îlot 1 : Bob' })).toBeVisible();
  await page.getByRole('button', { name: 'Retirer Bob' }).click();
  await expect(salle.locator('.salle__place')).toHaveCount(5);
  await expect(salle.getByRole('button', { name: 'Place 1, îlot 1, libre' })).toBeVisible();

  // Plus de 12 personnes : on saisit le nombre de places (30 au plus)
  await page.getByLabel('Nombre de places').fill('20');
  await page.getByLabel('Nombre de places').press('Enter');
  await expect(salle.locator('.salle__place')).toHaveCount(20);
  await page.getByLabel('Nombre de places').fill('');
  await page.getByLabel('Nombre de places').press('Enter');
  await expect(salle.locator('.salle__place')).toHaveCount(5);
  expect(erreurs).toEqual([]);
});

test('pendant une partie, le bouton Groupe rappelle les prénoms, les infos et les places', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await preparerGroupe(page);
  await page.getByRole('button', { name: 'Placer dans l’ordre' }).click();

  // La roue indique aussi la place de la personne désignée
  await ouvrirJeu(page, 'pyramide');
  await expect(page.getByRole('list', { name: 'Joueurs' })).toContainText('Félix');
  await page.getByRole('heading', { name: 'Comment on joue ?' }).click();
  await page.keyboard.press('r');
  const roue = page.getByRole('dialog', { name: /Désigner/ });
  await roue.getByRole('button', { name: 'Lancer la roue' }).click();
  await expect(roue.locator('.roue-detail')).toContainText('Place');
  await roue.getByRole('button', { name: 'Fermer' }).click();

  await lancerPartie(page);
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toBeVisible();

  await page.getByRole('button', { name: 'Groupe', exact: true }).click();
  const dialogue = page.getByRole('dialog', { name: 'Le groupe' });
  const liste = dialogue.getByRole('list', { name: 'Prénoms et infos' });
  await expect(liste.getByRole('listitem')).toHaveCount(6);
  await expect(liste.getByRole('listitem').first()).toContainText('Ana');
  await expect(liste.getByRole('listitem').first()).toContainText('le tiramisu');
  await expect(liste.getByRole('listitem').first()).toContainText('Place 1');
  await dialogue.getByRole('button', { name: /^Place 1 : Ana/ }).click();
  await expect(dialogue.locator('.plan-salle__detail')).toContainText('Ana');
  await expect(dialogue.getByRole('link', { name: 'Modifier le groupe' })).toHaveAttribute(
    'href',
    /\/groupe\/$/,
  );
  await verifierAccessibilite(page);

  // La partie reprend là où elle en était
  await dialogue.getByRole('button', { name: 'Fermer', exact: true }).last().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#cadre').getByText('Trouvé en 1 mot d’indice !')).toBeVisible();
  expect(erreurs).toEqual([]);
});
