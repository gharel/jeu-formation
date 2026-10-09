import { test, expect } from '@playwright/test';
import { JEUX } from '../../assets/js/jeux.js';
import {
  surveillerErreurs,
  verifierAccessibilite,
  verifierMiseEnPage,
  ouvrirJeu,
  lancerPartie,
} from './outils.js';

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

  // En haut du héros : « Mini-jeux » (cette page), et « Les outils » vers tous les outils
  await expect(page.getByRole('link', { name: 'Mini-jeux', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('link', { name: 'Les outils', exact: true })).toHaveAttribute(
    'href',
    'https://gharel.github.io/home/',
  );

  await page.getByRole('link', { name: JEUX[0].titre }).click();
  await expect(page.getByRole('heading', { level: 1, name: JEUX[0].titre })).toBeVisible();
  // Bandeau : la maison à gauche ; le logo, en dernier, mène au site de Skazy Formation
  const bandeau = page.getByRole('banner');
  const logo = bandeau.getByRole('link', { name: 'Site de Skazy Formation (nouvel onglet)' });
  await expect(logo).toHaveAttribute('href', 'https://formation.skazy.nc');
  await expect(logo).toHaveAttribute('target', '_blank');
  // Dans l'ordre : Accueil, Mini-jeux, (titre et boutons), Les outils, puis le logo
  const liens = bandeau.getByRole('link');
  await expect(liens).toHaveText(['Accueil', 'Mini-jeux', 'Les outils', '']);
  await expect(liens.last()).toHaveAccessibleName('Site de Skazy Formation (nouvel onglet)');
  const outils = bandeau.getByRole('link', { name: 'Les outils', exact: true });
  await expect(outils).toHaveAttribute('href', 'https://gharel.github.io/home/');
  await expect(outils).not.toHaveAttribute('target');
  const droites = await bandeau
    .locator('a, button')
    .evaluateAll((elements) =>
      elements.filter((e) => e.checkVisibility()).map((e) => e.getBoundingClientRect().right),
    );
  expect(Math.max(...droites), 'le logo est le plus à droite').toBe(droites.at(-1));
  // « Mini-jeux » (pastille et nom) ramène à l'accueil, comme la maison
  await bandeau.getByRole('link', { name: 'Mini-jeux', exact: true }).click();
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  await page.goBack();
  await page.getByRole('link', { name: 'Accueil', exact: true }).click();
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  expect(erreurs).toEqual([]);
});

// Au vidéoprojecteur comme sur un portable, le bandeau garde une seule ligne, avec le titre le plus
// long et quatre boutons (Désigner, Groupe, Son, Plein écran), jusqu'en 1024 × 768
test('le bandeau tient sur une ligne, de 1920 à 1024 px de large', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await expect(page.getByRole('button', { name: 'Désigner', exact: true })).toBeVisible();
  for (const width of [1920, 1440, 1366, 1280, 1201, 1200, 1024]) {
    await page.setViewportSize({ width, height: 720 });
    // Chromium applique les media queries de la nouvelle largeur à l'image suivante
    await page.evaluate(
      () => new Promise((fin) => requestAnimationFrame(() => requestAnimationFrame(fin))),
    );
    const { centres, lignesTitre, nomVisible, outilsVisible } = await page
      .locator('.bandeau')
      .evaluate((bandeau) => {
        const visibles = [...bandeau.querySelectorAll('a, h1, button, .signature__filet')].filter(
          (e) => e.checkVisibility(),
        );
        const plage = document.createRange();
        plage.selectNodeContents(bandeau.querySelector('h1'));
        const hauts = [...plage.getClientRects()].filter((r) => r.width > 0).map((r) => r.top);
        const affiche = (s) => getComputedStyle(bandeau.querySelector(s)).clipPath === 'none';
        return {
          centres: visibles.map((e) => {
            const r = e.getBoundingClientRect();
            return (r.top + r.bottom) / 2;
          }),
          lignesTitre: new Set(hauts.map(Math.round)).size,
          nomVisible: affiche('.signature__nom'),
          outilsVisible: affiche('.lien-outils__texte'),
        };
      });
    expect(lignesTitre, `titre en ${width} px`).toBe(1);
    expect(Math.max(...centres) - Math.min(...centres), `une ligne en ${width} px`).toBeLessThan(3);
    // Le nom « Mini-jeux » s'efface sous 1200 px, le texte « Les outils » sous 1350 px
    expect(nomVisible, `« Mini-jeux » en ${width} px`).toBe(width > 1200);
    expect(outilsVisible, `« Les outils » en ${width} px`).toBe(width > 1350);
    await verifierMiseEnPage(page);
  }
  // Effacés à l'écran, ils restent des liens nommés
  const bandeau = page.getByRole('banner');
  await expect(bandeau.getByRole('link', { name: 'Les outils', exact: true })).toBeVisible();
  await expect(bandeau.getByRole('link', { name: 'Mini-jeux', exact: true })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('« Remonter en haut » apparaît après défilement et ramène au titre', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  const defiler = () =>
    page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.goto('/');
  await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
  const remonter = page.getByRole('button', { name: 'Remonter en haut de la page' });
  // Caché en haut de la page (ni affiché, ni dans la tabulation)
  await expect(remonter).toBeHidden();
  await defiler();
  await expect(remonter).toBeVisible();
  await verifierAccessibilite(page);
  await remonter.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(remonter).toBeHidden();

  // Dans un jeu : sur son accueil, mais jamais pendant la partie (écran projeté)
  await page.setViewportSize({ width: 1280, height: 400 });
  await ouvrirJeu(page, 'motus', { prenoms: ['Ana', 'Bob'] });
  await defiler();
  await expect(remonter).toBeVisible();
  await lancerPartie(page);
  await defiler();
  await expect(remonter).toBeHidden();
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

test('une info par participant, saisie dans le groupe et affichée par la roue des jeux', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.goto('/groupe/?graine=2');
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

  // Ajouter une info à Paul avec le crayon
  await page.getByRole('button', { name: 'Ajouter une info sur Paul' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Une info sur Paul' });
  await dialogue.getByLabel('Thème').selectOption('film');
  await dialogue.getByLabel('Réponse').fill('Le Grand Bleu');
  await dialogue.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(puces.getByRole('listitem').filter({ hasText: 'Paul' })).toContainText(
    'Le Grand Bleu',
  );

  // Dans un jeu, tout le groupe joue, et la roue montre l'info de la personne tirée
  await page.goto(`/jeux/${JEUX[0].slug}/?graine=2`);
  await expect(page.getByRole('list', { name: 'Joueurs' }).getByRole('button')).toHaveCount(3);
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

  // Retirée du groupe puis ajoutée de nouveau : son info est oubliée
  await page.goto('/groupe/');
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

      // Qui joue ? Le groupe se gère sur sa page ; un retardataire s'ajoute depuis le jeu
      const bloc = page.getByRole('region', { name: 'Qui joue ?' });
      await expect(bloc.getByRole('link', { name: 'Gérer le groupe' })).toHaveAttribute(
        'href',
        /\/groupe\/$/,
      );
      await bloc.getByRole('button', { name: 'Ajouter quelqu’un' }).click();
      await page.getByRole('dialog').getByLabel('Prénom').fill('Ana');
      await page.getByRole('dialog').getByRole('button', { name: 'Ajouter' }).click();
      // L'ajout se fait à la fermeture de la fenêtre : on l'attend avant de recharger
      await expect(page.getByRole('list', { name: 'Joueurs' })).toContainText('Ana');
      await page.reload();
      await expect(page.getByRole('list', { name: 'Joueurs' })).toContainText('Ana');

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

// Au vidéoprojecteur, l'écran de partie tient sans défiler : en 1280 × 720 (le plus courant), et
// en 1920 × 1080 où les écarts grandissent avec la hauteur de l'écran
test.describe('chaque écran de partie tient à l’écran', () => {
  for (const jeu of JEUX) {
    test(`${jeu.titre} : 1280 × 720 et 1920 × 1080, sans défiler`, async ({ page }) => {
      const erreurs = surveillerErreurs(page);
      await ouvrirJeu(page, jeu.slug, {
        prenoms: ['Ana', 'Bob', 'Chloé', 'Jean-Baptiste', 'Marie', 'Léo'],
      });
      await lancerPartie(page);
      for (const [width, height] of [
        [1280, 720],
        [1920, 1080],
      ]) {
        await page.setViewportSize({ width, height });
        const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
        expect(hauteur, `${jeu.slug} en ${width} × ${height}`).toBeLessThanOrEqual(height);
        await verifierMiseEnPage(page);
      }
      expect(erreurs).toEqual([]);
    });
  }
});

test('la roue désigne chacun une fois avant de recommencer', async ({ page }) => {
  await page.goto(`/jeux/${JEUX[0].slug}/?graine=3`);
  await page.evaluate(() =>
    localStorage.setItem('skazy-jeux:participants', JSON.stringify(['Ana', 'Bob', 'Chloé'])),
  );
  await page.reload();
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
