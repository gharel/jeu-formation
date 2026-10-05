import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { JEUX } from '../../assets/js/jeux.js';
import { THEMATIQUES } from '../../assets/js/thematiques.js';
import { surveillerErreurs, verifierAccessibilite } from './outils.js';

// Les thématiques remplissent tous les jeux, sauf Zoom mystère (il lui faut des captures d'écran)
const JEUX_SANS_IMAGE = JEUX.filter((j) => j.slug !== 'zoom-mystere').map((j) => j.slug);

/** Bloc d'un jeu dans la consultation (un <details>). */
const apercuDe = (page, slug) => page.locator(`details[data-jeu="${slug}"]`);
const carteDe = (page, slug) => page.locator(`[data-thematique="${slug}"]`);
const message = (page) => page.locator('#cadre .message');

/** Contenu enregistré d'un jeu, lu dans le stockage de la page. */
const contenuEnregistre = (page, slug) =>
  page.evaluate((cle) => JSON.parse(localStorage.getItem(cle)), `skazy-jeux:${slug}:contenu`);
const catalogue = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('skazy-jeux:thematiques')));

async function ouvrirContenus(page) {
  await page.goto('/contenus/');
  await expect(
    page.getByRole('heading', { name: 'Quelles questions pour cette séance ?' }),
  ).toBeVisible();
  await expect(carteDe(page, 'google-sheets')).toContainText('tableur');
}

/** Remplit la fenêtre « Créer une thématique » et la valide. */
async function creerThematique(page, { titre, icone = null, depart = null }) {
  await page.getByRole('button', { name: 'Créer une thématique' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Créer une thématique' });
  await dialogue.getByLabel('Titre', { exact: true }).fill(titre);
  if (icone) await dialogue.locator('.choix-icone', { hasText: icone }).click();
  if (depart) await dialogue.getByLabel('Point de départ').selectOption({ label: depart });
  await dialogue.getByRole('button', { name: 'Créer la thématique' }).click();
  await expect(dialogue).toHaveCount(0);
}

/** Confirme la fenêtre ouverte avec son bouton `oui`. */
const confirmer = (page, oui) =>
  page.getByRole('dialog').getByRole('button', { name: oui }).click();

test('on crée sa thématique, on modifie ses questions, puis on la charge', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);

  // La fenêtre : un titre obligatoire, unique, une icône, un point de départ
  await page.getByRole('button', { name: 'Créer une thématique' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Créer une thématique' });
  const champTitre = dialogue.getByLabel('Titre', { exact: true });
  await expect(champTitre).toBeFocused();
  await verifierAccessibilite(page);
  await dialogue.getByRole('button', { name: 'Créer la thématique' }).click();
  await expect(dialogue.getByRole('alert')).toHaveText('Donnez un titre à la thématique.');
  await champTitre.fill('google sheets');
  await dialogue.getByRole('button', { name: 'Créer la thématique' }).click();
  await expect(dialogue.getByRole('alert')).toContainText('s’appelle déjà « Google Sheets »');
  await champTitre.fill('Excel débutant');
  await dialogue.getByLabel('Description (facultative)').fill('Les formules et les graphiques.');
  await dialogue.locator('.choix-icone', { hasText: 'Tableur' }).click();
  await expect(dialogue.getByRole('radio', { name: 'Tableur' })).toBeChecked();
  await dialogue.getByLabel('Point de départ').selectOption({ label: 'Les contenus d’exemple' });
  await dialogue.getByRole('button', { name: 'Créer la thématique' }).click();

  // Elle s'ouvre dans la consultation, pour modifier ses questions
  await expect(message(page)).toHaveText(
    'Thématique « Excel débutant » créée. Modifiez ses questions jeu par jeu ci-dessous, puis chargez-la.',
  );
  await expect(page.getByLabel('Afficher', { exact: true })).toHaveValue('perso-excel-debutant');
  const carte = carteDe(page, 'perso-excel-debutant');
  await expect(carte).toContainText('Votre thématique');
  await expect(carte).toContainText('Les formules et les graphiques.');
  await expect(carte).toContainText(`${JEUX_SANS_IMAGE.length} jeux, sans Zoom mystère`);
  await expect(carte.locator('.carte-thematique__icone .fa-table-cells')).toBeVisible();

  // Modifier un jeu dans la thématique ne change pas le jeu
  const motus = apercuDe(page, 'motus');
  await motus.locator('summary').click();
  await expect(motus.locator('.apercu-element').first()).toContainText('CLAVIER');
  await motus
    .getByRole('button', { name: 'Modifier le contenu de Motus numérique dans la thématique' })
    .click();
  await expect(
    motus.getByRole('heading', { name: 'Modifier Motus numérique dans « Excel débutant »' }),
  ).toBeFocused();
  // Ni réglages ni images : seulement les questions
  await expect(motus.locator('.editeur__reglages')).toHaveCount(0);
  await motus.getByLabel('Mot à deviner').first().fill('CELLULE');
  await motus.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(motus.locator('.apercu-element').first()).toContainText('CELLULE');
  expect(await contenuEnregistre(page, 'motus')).toBeNull();

  // Retirer un jeu, puis l'ajouter de nouveau (Annuler : il reste absent)
  const pyramide = apercuDe(page, 'pyramide');
  await pyramide.locator('summary').click();
  await pyramide.getByRole('button', { name: 'Retirer Pyramide de la thématique' }).click();
  await confirmer(page, 'Retirer');
  await expect(pyramide.locator('summary')).toContainText('Pas dans cette thématique');
  await expect(carte).toContainText(
    `${JEUX_SANS_IMAGE.length - 1} jeux, sans Zoom mystère, Pyramide`,
  );
  const ajouter = pyramide.getByRole('button', { name: 'Ajouter Pyramide à la thématique' });
  await expect(ajouter).toBeFocused();
  await ajouter.click();
  await expect(
    pyramide.getByRole('heading', { name: 'Modifier Pyramide dans « Excel débutant »' }),
  ).toBeFocused();
  await pyramide.getByRole('button', { name: 'Annuler' }).click();
  await expect(ajouter).toBeFocused();
  await expect(apercuDe(page, 'zoom-mystere').locator('summary')).toContainText(
    'Pas dans les thématiques',
  );
  await verifierAccessibilite(page);

  // Charger : les jeux prennent les questions de la thématique
  await page.getByRole('button', { name: 'Charger cette thématique' }).click();
  await confirmer(page, 'Charger');
  await expect(message(page)).toHaveText(
    `Thématique « Excel débutant » chargée : ${JEUX_SANS_IMAGE.length - 1} jeux mis à jour. Zoom mystère, Pyramide gardent leur contenu.`,
  );
  expect((await contenuEnregistre(page, 'motus')).elements[0].mot).toBe('CELLULE');
  expect(await contenuEnregistre(page, 'pyramide')).toBeNull();
  await expect(carte).toContainText(`Chargée dans ${JEUX_SANS_IMAGE.length - 1} jeux`);

  // Gardée dans le navigateur ; titre et icône se changent depuis la carte
  await page.reload();
  await carte.getByRole('button', { name: 'Modifier Excel débutant' }).click();
  const fiche = page.getByRole('dialog', { name: 'Modifier « Excel débutant »' });
  await expect(fiche.getByLabel('Point de départ')).toHaveCount(0);
  await fiche.getByLabel('Titre', { exact: true }).fill('Excel avancé');
  await fiche.locator('.choix-icone', { hasText: 'Graphiques' }).click();
  await fiche.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(message(page)).toHaveText('Thématique « Excel avancé » enregistrée.');
  await expect(carte.locator('h4')).toHaveText('Excel avancé');
  await expect(carte.locator('.carte-thematique__icone .fa-chart-line')).toBeVisible();
  await expect(page.locator('#choix-affichage option[value="perso-excel-debutant"]')).toHaveText(
    /Thématique\s:\sExcel avancé/,
  );

  // Supprimer : la carte disparaît, les jeux gardent leurs questions
  await carte.getByRole('button', { name: 'Supprimer Excel avancé' }).click();
  await expect(page.getByRole('dialog')).toContainText('exportez-la d’abord en JSON');
  await confirmer(page, 'Supprimer');
  await expect(message(page)).toHaveText('Thématique « Excel avancé » supprimée.');
  await expect(carte).toHaveCount(0);
  await expect(page.locator('.carte-thematique')).toHaveCount(THEMATIQUES.length + 1);
  expect((await contenuEnregistre(page, 'motus')).elements[0].mot).toBe('CELLULE');
  expect(erreurs).toEqual([]);
});

test('on modifie une thématique livrée puis on la rétablit, on la supprime puis on la fait revenir', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);
  const carte = carteDe(page, 'facebook');
  await carte.getByRole('button', { name: 'Aperçu de Facebook' }).click();
  const motus = apercuDe(page, 'motus');
  await motus.locator('summary').click();
  const premier = motus.locator('.apercu-element').first();
  const original = await premier.locator('.secret').textContent();
  await motus
    .getByRole('button', { name: 'Modifier le contenu de Motus numérique dans la thématique' })
    .click();
  await motus.getByLabel('Mot à deviner').first().fill('ECRANS');
  await motus.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(premier).toContainText('ECRANS');
  await expect(carte).toContainText('Modifiée');
  expect((await catalogue(page)).locales.map((t) => t.slug)).toEqual(['facebook']);

  // Rétablir l'originale : les questions du fichier reviennent
  await carte.getByRole('button', { name: 'Rétablir l’originale de Facebook' }).click();
  await confirmer(page, 'Rétablir');
  await expect(message(page)).toHaveText('Thématique « Facebook » rétablie d’origine.');
  await expect(carte).not.toContainText('Modifiée');
  await expect(premier).toContainText(original);

  // Supprimer une thématique livrée la masque seulement
  await carte.getByRole('button', { name: 'Supprimer Facebook' }).click();
  await confirmer(page, 'Supprimer');
  await expect(carte).toHaveCount(0);
  await expect(page.getByLabel('Afficher', { exact: true })).toHaveValue('actuel');
  await page.reload();
  await expect(carteDe(page, 'google-sheets')).toBeVisible();
  await expect(carte).toHaveCount(0);
  await page.getByRole('button', { name: 'Rétablir les thématiques supprimées (1)' }).click();
  await expect(message(page)).toHaveText('Thématique rétablie : Facebook.');
  await expect(carte).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Rétablir les thématiques supprimées/ }),
  ).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('on exporte toutes les thématiques en un fichier, puis on les réimporte', async ({
  page,
}, testInfo) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);
  await creerThematique(page, {
    titre: 'Mon thème',
    icone: 'Étoile',
    depart: 'Des questions vides, à écrire jeu par jeu',
  });
  await expect(apercuDe(page, 'motus').locator('summary')).toContainText('Contenu incomplet');

  // Une thématique seule : un jeu de données, avec son slug et son icône
  const [seule] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSON de Google Sheets' }).click(),
  ]);
  expect(seule.suggestedFilename()).toBe('skazy-thematique-google-sheets.json');
  const cheminSeule = testInfo.outputPath('google-sheets.json');
  await seule.saveAs(cheminSeule);
  expect(JSON.parse(await readFile(cheminSeule, 'utf8'))).toMatchObject({
    format: 'skazy-jeux-donnees',
    titre: 'Google Sheets',
    slug: 'google-sheets',
    icone: 'table-cells',
  });

  // Toutes ensemble
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter toutes les thématiques' }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^skazy-thematiques-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(message(page)).toHaveText(
    `${THEMATIQUES.length + 1} thématiques exportées dans un seul fichier.`,
  );
  const chemin = testInfo.outputPath('thematiques.json');
  await telechargement.saveAs(chemin);
  const donnees = JSON.parse(await readFile(chemin, 'utf8'));
  expect(donnees).toMatchObject({ format: 'skazy-jeux-thematiques', version: 1 });
  expect(donnees.thematiques.map((t) => t.slug)).toEqual([
    ...THEMATIQUES.map((t) => t.slug),
    'perso-mon-theme',
  ]);
  expect(Object.keys(donnees.thematiques[0].jeux)).toEqual(JEUX_SANS_IMAGE);
  expect(donnees.thematiques.at(-1)).toMatchObject({ titre: 'Mon thème', icone: 'star' });

  // Sur un autre poste : rien de tout cela, Facebook supprimée
  await page.evaluate(() => localStorage.removeItem('skazy-jeux:thematiques'));
  await page.reload();
  await carteDe(page, 'facebook').getByRole('button', { name: 'Supprimer Facebook' }).click();
  await confirmer(page, 'Supprimer');
  // Fichier retouché : le titre de Google Sheets changé, un jeu inconnu
  donnees.thematiques[2].titre = 'Sheets en mairie';
  donnees.thematiques[2].jeux['jeu-inconnu'] = { elements: [] };
  await writeFile(chemin, JSON.stringify(donnees));
  await page.locator('#fichier-thematiques').setInputFiles(chemin);
  const dialogue = page.getByRole('dialog', {
    name: `Importer ${THEMATIQUES.length + 1} thématiques ?`,
  });
  await expect(dialogue).toContainText('Nouvelle : « Mon thème ».');
  await expect(dialogue).toContainText('« Google Sheets »');
  await expect(dialogue).toContainText('« Facebook »');
  await dialogue.getByRole('button', { name: 'Importer' }).click();
  await expect(message(page)).toContainText(
    `${THEMATIQUES.length + 1} thématiques importées : Initiation à l’IA, Google Docs, Sheets en mairie`,
  );
  await expect(message(page)).toContainText('Ignoré (jeu inconnu) : jeu-inconnu.');
  await expect(page.locator('.carte-thematique')).toHaveCount(THEMATIQUES.length + 2);
  // Les thématiques livrées revenues telles quelles ne sont pas des copies
  await expect(carteDe(page, 'facebook')).not.toContainText('Modifiée');
  await expect(carteDe(page, 'google-sheets')).toContainText('Modifiée');
  expect((await catalogue(page)).locales.map((t) => t.slug)).toEqual([
    'google-sheets',
    'perso-mon-theme',
  ]);
  await verifierAccessibilite(page);

  // Un fichier abîmé est refusé
  await page.locator('#fichier-thematiques').setInputFiles({
    name: 'abime.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{pas du json'),
  });
  await expect(page.getByRole('alert')).toContainText('JSON illisible');
  expect(erreurs).toEqual([]);
});

test('on importe plusieurs fichiers de thématiques d’un coup', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirContenus(page);
  /** Le fichier d'une thématique seule (bouton « JSON »), avec un mot de Motus. */
  const fichier = (titre, mot) => ({
    name: `${titre.toLowerCase()}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'skazy-jeux-donnees',
        version: 1,
        titre,
        description: `Les bases de ${titre}.`,
        icone: 'file-lines',
        jeux: { motus: { elements: [{ mot, definition: '' }] } },
      }),
    ),
  });
  await page
    .locator('#fichier-thematiques')
    .setInputFiles([
      fichier('Word', 'POLICE'),
      fichier('Excel', 'CELLULE'),
      { name: 'abime.json', mimeType: 'application/json', buffer: Buffer.from('{pas du json') },
    ]);
  const dialogue = page.getByRole('dialog', { name: 'Importer 2 thématiques ?' });
  await expect(dialogue).toContainText('Nouvelles : « Word », « Excel ».');
  await dialogue.getByRole('button', { name: 'Importer' }).click();
  await expect(message(page)).toContainText('2 thématiques importées : Word, Excel.');
  await expect(message(page)).toContainText('Fichier ignoré, abime.json');
  await expect(carteDe(page, 'perso-word')).toContainText('Les bases de Word.');
  await expect(carteDe(page, 'perso-excel')).toContainText('1 jeu sur');
  await expect(page.locator('.carte-thematique')).toHaveCount(THEMATIQUES.length + 3);
  expect(erreurs).toEqual([]);
});

test('la fenêtre d’une thématique tient dans l’écran du vidéoprojecteur', async ({ page }) => {
  await ouvrirContenus(page);
  await page.getByRole('button', { name: 'Créer une thématique' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Créer une thématique' });
  await expect(dialogue.getByRole('button', { name: 'Créer la thématique' })).toBeInViewport();
  const defile = await dialogue.evaluate((d) => d.scrollHeight > d.clientHeight);
  expect(defile).toBe(false);
});
