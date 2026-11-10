import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { surveillerErreurs, verifierAccessibilite, verifierMiseEnPage } from './outils.js';

const DIAPOSITIVE = 'Diapo 42, les tableaux croisés';

test('où en est-on : la diapositive et les logiciels vus suivent le groupe', async ({
  page,
}, testInfo) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/');
  const bloc = page.getByRole('region', { name: 'Où en est-on ?' });
  const diapositive = bloc.getByLabel('Diapositive où le groupe s’est arrêté');
  const logiciel = bloc.getByLabel('Logiciels vus ensemble');
  const vus = bloc.getByRole('list', { name: 'Logiciels vus' }).getByRole('listitem');
  await expect(bloc).toContainText('Aucun logiciel noté.');

  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByLabel('Nom du groupe').fill('Excel, mairie');
  await page.getByLabel('Nom du groupe').press('Enter');

  // La diapositive, puis plusieurs logiciels à la fois (Entrée ou le bouton)
  await diapositive.fill(`  ${DIAPOSITIVE} `);
  await logiciel.fill('Google Sheets, Excel');
  await logiciel.press('Enter');
  await expect(vus).toHaveText(['Google Sheets', 'Excel']);
  await expect(bloc).toContainText(/2\slogiciels vus/);
  await expect(logiciel).toBeFocused();
  await expect(logiciel).toHaveValue('');
  // Le champ quitté montre le texte gardé, sans les espaces en trop
  await expect(diapositive).toHaveValue(DIAPOSITIVE);

  // Un logiciel déjà noté ne l'est pas deux fois ; on en retire un
  await logiciel.fill('excel');
  await bloc.getByRole('button', { name: 'Ajouter aux logiciels vus' }).click();
  await expect(bloc.getByRole('status')).toHaveText('Déjà noté dans la liste.');
  await expect(vus).toHaveCount(2);
  await logiciel.fill('Canva');
  await logiciel.press('Enter');
  await expect(bloc.getByRole('status')).toBeHidden();
  await bloc.getByRole('button', { name: 'Retirer Excel des logiciels vus' }).click();
  await expect(vus).toHaveText(['Google Sheets', 'Canva']);
  await expect(logiciel).toBeFocused();
  await verifierAccessibilite(page);

  // Les notes sont gardées dans le navigateur
  await page.reload();
  await expect(diapositive).toHaveValue(DIAPOSITIVE);
  await expect(vus).toHaveText(['Google Sheets', 'Canva']);

  // … et dans le fichier du groupe
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le groupe' }).click(),
  ]);
  const chemin = testInfo.outputPath('groupe.json');
  await telechargement.saveAs(chemin);
  const donnees = JSON.parse(await readFile(chemin, 'utf8'));
  expect(donnees.groupe.suivi).toEqual({
    diapositive: DIAPOSITIVE,
    logiciels: ['Google Sheets', 'Canva'],
  });

  // Nouvelle formation : les notes partent avec le groupe, mis de côté dans les groupes récents
  await page
    .getByRole('region', { name: 'Nouvelle formation' })
    .getByRole('button', { name: 'Tout vider…' })
    .click();
  const vider = page.getByRole('dialog', { name: /Tout vider/ });
  await expect(vider).toContainText('notes de suivi');
  await vider.getByLabel('Les contenus des jeux').uncheck();
  await vider.getByRole('button', { name: 'Tout vider' }).click();
  await expect(diapositive).toHaveValue('');
  await expect(vus).toHaveCount(0);
  const recents = page.getByRole('region', { name: 'Groupes récents' });
  await expect(recents.getByRole('listitem').first()).toContainText(
    /arrêté à\s:\sDiapo 42, les tableaux croisés\s·\s2\slogiciels vus/,
  );

  // Le groupe rechargé retrouve ses notes
  await recents.getByRole('button', { name: 'Recharger « Excel, mairie »' }).click();
  const recharger = page.getByRole('dialog', { name: /Recharger/ });
  await expect(recharger.getByLabel('Les notes')).toBeChecked();
  await recharger.getByRole('button', { name: 'Recharger', exact: true }).click();
  await expect(recents.locator('.message')).toContainText(
    'les prénoms, la disposition, les équipes, les scores et les notes',
  );
  await expect(diapositive).toHaveValue(DIAPOSITIVE);
  await expect(vus).toHaveText(['Google Sheets', 'Canva']);

  // Un fichier importé apporte ses propres notes
  await page.locator('#fichier-groupe').setInputFiles({
    name: 'word.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ participants: ['Nina'], suivi: { diapositive: 12, logiciels: ['Word'] } }),
    ),
  });
  await page
    .getByRole('dialog', { name: 'Remplacer le groupe ?' })
    .getByRole('button', { name: 'Remplacer' })
    .click();
  await expect(diapositive).toHaveValue('12');
  await expect(vus).toHaveText(['Word']);
  expect(erreurs).toEqual([]);
});

test('où en est-on, sur téléphone : le bloc tient dans la largeur', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/groupe/');
  const bloc = page.getByRole('region', { name: 'Où en est-on ?' });
  await bloc.getByLabel('Diapositive où le groupe s’est arrêté').fill(DIAPOSITIVE);
  await bloc
    .getByLabel('Logiciels vus ensemble')
    .fill('Google Sheets, Microsoft PowerPoint, Canva, Un logiciel au nom vraiment très long');
  await bloc.getByLabel('Logiciels vus ensemble').press('Enter');
  await expect(bloc).toContainText(/4\slogiciels vus/);
  await verifierMiseEnPage(page);
});
