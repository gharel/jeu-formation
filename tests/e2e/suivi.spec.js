import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { surveillerErreurs, verifierAccessibilite, verifierMiseEnPage } from './outils.js';

const VU = 'Google Sheets, les tableaux croisés\nÀ reprendre : RECHERCHEV';

test('où en est-on : le numéro de la diapositive et les notes suivent le groupe', async ({
  page,
}, testInfo) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/');
  const bloc = page.getByRole('region', { name: 'Où en est-on ?' });
  const diapositive = bloc.getByLabel('Arrêté à la diapositive');
  const vu = bloc.getByLabel('Vu ensemble');
  await expect(diapositive).toHaveValue('');
  await expect(vu).toHaveValue('');

  await page.getByLabel('Ajouter un prénom').fill('Ana, Bob');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByLabel('Nom du groupe').fill('Excel, mairie');
  await page.getByLabel('Nom du groupe').press('Enter');

  // Le numéro se tape ; un numéro impossible n'est pas gardé
  await diapositive.fill('1200');
  await diapositive.blur();
  await expect(diapositive).toHaveValue('');
  await diapositive.fill('42');
  // Les notes tiennent sur plusieurs lignes ; le champ quitté montre le texte gardé
  await vu.fill(`  ${VU}  \n\n`);
  await vu.blur();
  await expect(vu).toHaveValue(VU);
  await expect(diapositive).toHaveValue('42');
  await verifierAccessibilite(page);

  // Les notes sont gardées dans le navigateur
  await page.reload();
  await expect(diapositive).toHaveValue('42');
  await expect(vu).toHaveValue(VU);

  // … et dans le fichier du groupe
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le groupe' }).click(),
  ]);
  const chemin = testInfo.outputPath('groupe.json');
  await telechargement.saveAs(chemin);
  const donnees = JSON.parse(await readFile(chemin, 'utf8'));
  expect(donnees.groupe.suivi).toEqual({ diapositive: 42, vu: VU });

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
  await expect(vu).toHaveValue('');
  const recents = page.getByRole('region', { name: 'Groupes récents' });
  await expect(recents.getByRole('listitem').first()).toContainText(
    /arrêté à la diapo\s42\s·\svu\s:\sGoogle Sheets, les tableaux croisés\s;\sÀ reprendre…/,
  );

  // Le groupe rechargé retrouve ses notes
  await recents.getByRole('button', { name: 'Recharger « Excel, mairie »' }).click();
  const recharger = page.getByRole('dialog', { name: /Recharger/ });
  await expect(recharger.getByLabel('Les notes')).toBeChecked();
  await recharger.getByRole('button', { name: 'Recharger', exact: true }).click();
  await expect(recents.locator('.message')).toContainText(
    'les prénoms, la disposition, les équipes, les scores et les notes',
  );
  await expect(diapositive).toHaveValue('42');
  await expect(vu).toHaveValue(VU);

  // Un fichier exporté au premier format (diapositive en texte, liste de logiciels) : rien n'est perdu
  await page.locator('#fichier-groupe').setInputFiles({
    name: 'word.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        participants: ['Nina'],
        suivi: { diapositive: 'Diapo 12, les filtres', logiciels: ['Word', 'Excel'] },
      }),
    ),
  });
  await page
    .getByRole('dialog', { name: 'Remplacer le groupe ?' })
    .getByRole('button', { name: 'Remplacer' })
    .click();
  await expect(diapositive).toHaveValue('12');
  await expect(vu).toHaveValue('les filtres\nWord, Excel');
  expect(erreurs).toEqual([]);
});

test('où en est-on : les notes gardées au premier format sont reprises sans perte', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/');
  // Ce que le navigateur gardait avant le numéro de diapositive
  await page.evaluate(() =>
    localStorage.setItem(
      'skazy-jeux:suivi-groupe',
      JSON.stringify({
        diapositive: 'Diapo 42, les tableaux croisés',
        logiciels: ['Google Sheets', 'Canva'],
      }),
    ),
  );
  await page.reload();
  const bloc = page.getByRole('region', { name: 'Où en est-on ?' });
  const diapositive = bloc.getByLabel('Arrêté à la diapositive');
  const vu = bloc.getByLabel('Vu ensemble');
  await expect(diapositive).toHaveValue('42');
  await expect(vu).toHaveValue('les tableaux croisés\nGoogle Sheets, Canva');

  // La première frappe enregistre les notes au nouveau format, sans doubler le texte repris
  await diapositive.fill('43');
  await page.reload();
  await expect(diapositive).toHaveValue('43');
  await expect(vu).toHaveValue('les tableaux croisés\nGoogle Sheets, Canva');
  const garde = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('skazy-jeux:suivi-groupe')),
  );
  expect(garde).toEqual({ diapositive: 43, vu: 'les tableaux croisés\nGoogle Sheets, Canva' });
  expect(erreurs).toEqual([]);
});

test('où en est-on, sur téléphone : le bloc tient dans la largeur', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/groupe/');
  const bloc = page.getByRole('region', { name: 'Où en est-on ?' });
  await bloc.getByLabel('Arrêté à la diapositive').fill('142');
  await bloc
    .getByLabel('Vu ensemble')
    .fill(
      'Google Sheets, Microsoft PowerPoint, Canva\nUne notion au nom vraiment très long, à reprendre à la prochaine séance\nRECHERCHEV',
    );
  await expect(bloc.getByLabel('Arrêté à la diapositive')).toHaveValue('142');
  await verifierMiseEnPage(page);
});
