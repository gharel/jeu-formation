import { test, expect, devices } from '@playwright/test';
import { JEUX } from '../../assets/js/jeux.js';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
  verifierMiseEnPage,
} from './outils.js';

// Téléphone tactile (écran étroit, ni souris ni clavier), dans le Chromium des tests
const telephone = { ...devices['Pixel 7'] };
delete telephone.defaultBrowserType;

// Petit téléphone : 360 px de large, le plus étroit des Android courants
const petitTelephone = { ...telephone, viewport: { width: 360, height: 740 } };

const DOUZE = [
  'Ana',
  'Marie-Christine',
  'Bob',
  'Jean-Baptiste',
  'Chloé',
  'Maximilien',
  'Léa',
  'Omar',
  'Nina',
  'Paul',
  'Emma',
  'Félix',
];

/** Met des valeurs dans le stockage du site (clés sans le préfixe skazy-jeux:). */
async function preparerStockage(page, valeurs) {
  await page.goto('/');
  await page.evaluate((v) => {
    for (const [cle, valeur] of Object.entries(v)) {
      localStorage.setItem(`skazy-jeux:${cle}`, JSON.stringify(valeur));
    }
  }, valeurs);
}

/** Nombre de lignes occupées par le texte d'un élément. */
function lignesDe(locator) {
  return locator.evaluate((e) => {
    const plage = document.createRange();
    plage.selectNodeContents(e);
    const hauts = [...plage.getClientRects()].filter((r) => r.width > 0).map((r) => r.top);
    return new Set(hauts.map(Math.round)).size;
  });
}

/** Écart (px) entre le centre d'une icône et celui de sa pastille. */
function decentrage(page, pastille) {
  return page
    .locator(pastille)
    .first()
    .evaluate((boite) => {
      const icone = boite.querySelector('.icone').getBoundingClientRect();
      const cadre = boite.getBoundingClientRect();
      return {
        x: Math.abs(icone.left + icone.width / 2 - (cadre.left + cadre.width / 2)),
        y: Math.abs(icone.top + icone.height / 2 - (cadre.top + cadre.height / 2)),
      };
    });
}

/** La page ne doit jamais défiler en largeur. */
async function sansDefilementHorizontal(page) {
  const { large, ecran } = await page.evaluate(() => ({
    large: document.documentElement.scrollWidth,
    ecran: window.innerWidth,
  }));
  expect(large, 'la page déborde en largeur').toBeLessThanOrEqual(ecran);
}

test('sur ordinateur, le bouton Plein écran est là', async ({ page }) => {
  await ouvrirJeu(page, 'motus');
  await expect(page.getByRole('button', { name: 'Plein écran' })).toBeVisible();
});

test.describe('sur téléphone', () => {
  test.use(telephone);

  test('pas de bouton Plein écran, inutile sur un si petit écran', async ({ page }) => {
    await ouvrirJeu(page, 'motus');
    await expect(page.getByRole('button', { name: 'Son' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plein écran' })).toBeHidden();
  });

  test('les icônes des jeux sont centrées dans leur pastille', async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto('/');
    await expect(page.locator('.carte-jeu')).toHaveCount(JEUX.length);
    const carte = await decentrage(page, '.carte-jeu__icone');
    expect(carte.x).toBeLessThan(1);
    expect(carte.y).toBeLessThan(1);
    await sansDefilementHorizontal(page);
    await verifierAccessibilite(page);

    for (const slug of ['pyramide', 'duel-buzzer']) {
      await ouvrirJeu(page, slug);
      const jeu = await decentrage(page, '.intro__icone');
      expect(jeu.x, slug).toBeLessThan(1);
      expect(jeu.y, slug).toBeLessThan(1);
      await sansDefilementHorizontal(page);
    }
    expect(erreurs).toEqual([]);
  });

  test('Duel buzzer : on buzze au doigt, sans clavier', async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await ouvrirJeu(page, 'duel-buzzer', { prenoms: ['Ana', 'Bob'] });
    await lancerPartie(page);
    await page.getByRole('button', { name: 'Commencer le duel' }).tap();
    const droite = await page.locator('.duel__joueur--droite .duel__nom').textContent();
    const buzzerDroite = page.getByRole('button', { name: `Buzzer de ${droite}` });

    // Faux départ : avant la question, le buzzer ne fait rien
    await buzzerDroite.tap();
    await expect(page.locator('.duel__joueur--main')).toHaveCount(0);

    // La question s'affiche : les buzzers s'allument, le premier qui appuie a la main
    await page.getByRole('button', { name: 'Afficher la question' }).tap();
    await expect(page.locator('.duel')).toHaveClass(/duel--ouvert/);
    await expect(page.locator('#cadre').getByText('À vos buzzers !')).toBeVisible();
    // Les aides clavier (« Touche A ou L », « (Entrée) ») sont masquées sur téléphone
    await expect(page.locator('.duel__statut .aide-clavier')).toBeHidden();
    await sansDefilementHorizontal(page);
    await verifierAccessibilite(page);
    await buzzerDroite.tap();
    await expect(page.locator('.duel__joueur--droite')).toHaveClass(/duel__joueur--main/);
    await expect(page.locator('#cadre').getByText(`${droite} répond !`)).toBeVisible();
    await page.getByRole('button', { name: 'Bonne', exact: true }).tap();
    await expect(pointsDe(page, droite)).toHaveText('1');
    expect(erreurs).toEqual([]);
  });

  test('Pyramide se joue aussi sur téléphone', async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob'] });
    await lancerPartie(page);
    await page.getByRole('button', { name: 'C’est parti !' }).tap();
    await page.getByRole('button', { name: 'Afficher le mot' }).tap();
    await expect(page.locator('.pyramide__mot')).toBeVisible();
    await sansDefilementHorizontal(page);
    await verifierAccessibilite(page);
    await page.getByRole('button', { name: /Raté/ }).tap();
    await page.getByRole('button', { name: /Trouvé/ }).tap();
    await expect(page.locator('#cadre').getByText('Trouvé en 2 mots d’indice !')).toBeVisible();
    expect(erreurs).toEqual([]);
  });

  test('Le groupe : on place les participants au doigt, en touchant ou en glissant', async ({
    page,
  }) => {
    const erreurs = surveillerErreurs(page);
    await page.goto('/groupe/');
    await page.getByLabel('Ajouter un prénom').fill('Ana, Bob, Chloé');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).tap();
    const salle = page.getByRole('group', { name: /Plan de salle/ });

    // Toucher une place, puis le prénom
    await salle.getByRole('button', { name: 'Place 1, libre' }).tap();
    await page.getByRole('dialog', { name: 'Place 1' }).getByRole('button', { name: 'Ana' }).tap();
    await expect(salle.getByRole('button', { name: 'Place 1 : Ana' })).toBeVisible();

    // Glisser au doigt : vrais événements tactiles (le navigateur en fait des événements pointer)
    const depuis = await page
      .getByRole('list', { name: 'À placer' })
      .getByRole('button', { name: 'Bob' })
      .boundingBox();
    const vers = await salle.getByRole('button', { name: 'Place 3, libre' }).boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const point = (b, t) => ({
      x: b.x + b.width / 2 + t * (vers.x + vers.width / 2 - b.x - b.width / 2),
      y: b.y + b.height / 2 + t * (vers.y + vers.height / 2 - b.y - b.height / 2),
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point(depuis, 0)],
    });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [point(depuis, i / 10)],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(salle.getByRole('button', { name: 'Place 3 : Bob' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await sansDefilementHorizontal(page);
    await verifierAccessibilite(page);
    expect(erreurs).toEqual([]);
  });
});

test.describe('sur petit téléphone (360 px)', () => {
  test.use(petitTelephone);

  test('l’accueil : « Le groupe · 12 participants » ne laisse aucun mot seul sur sa ligne', async ({
    page,
  }) => {
    const erreurs = surveillerErreurs(page);
    await preparerStockage(page, { participants: DOUZE });
    await page.reload();
    await expect(page.getByRole('link', { name: 'Le groupe · 12 participants' })).toBeVisible();
    // Le titre et les boutons tiennent, sans « Le » ni « 12 » seuls sur leur ligne
    await verifierAccessibilite(page);
    expect(erreurs).toEqual([]);
  });

  test('chaque jeu tient dans l’écran, de son accueil au début de la partie', async ({ page }) => {
    test.slow();
    const erreurs = surveillerErreurs(page);
    for (const jeu of JEUX) {
      await ouvrirJeu(page, jeu.slug, { prenoms: ['Ana', 'Jean-Baptiste', 'Chloé'] });
      await verifierMiseEnPage(page);
      await lancerPartie(page);
      await verifierMiseEnPage(page);
    }
    expect(erreurs).toEqual([]);
  });

  test('les grands nombres restent dans leurs cadres : scores du groupe, Le Juste Chiffre', async ({
    page,
  }) => {
    const erreurs = surveillerErreurs(page);
    await preparerStockage(page, {
      participants: DOUZE,
      'scores-groupe': {
        ana: { motus: 9999, pyramide: 9999 },
        'jean-baptiste': { 'coffre-fort': 25, 'juste-chiffre': 999, correction: 4 },
        'marie-christine': { correction: -9999 },
      },
      'juste-chiffre:contenu': {
        reglages: { duree: 600, tourDeRole: true },
        elements: [
          {
            question: 'Combien d’êtres humains vivent sur Terre ?',
            reponse: 8123456789,
            unite: 'habitants',
            marge: 0,
            anecdote: '',
          },
        ],
      },
    });

    // Scores du groupe : « -9999 » tient dans son champ, le rang « 12. » dans sa colonne
    await page.goto('/groupe/');
    const scores = page.getByRole('list', { name: 'Scores du groupe' });
    await expect(scores.getByLabel('Score de Marie-Christine')).toHaveValue('-9999');
    await verifierMiseEnPage(page);
    const rangs = await scores
      .locator('.scores-groupe__rang')
      .evaluateAll((liste) => liste.filter((r) => r.scrollWidth > r.clientWidth).length);
    expect(rangs, 'un rang déborde de sa colonne').toBe(0);
    // Le détail ne se coupe qu'entre deux jeux, jamais dans « Le Coffre-fort : 25 »
    for (const morceau of await scores.locator('.scores-groupe__morceau').all()) {
      expect(await lignesDe(morceau)).toBe(1);
    }

    // Le Juste Chiffre : des milliards dans la fourchette et l'historique
    await ouvrirJeu(page, 'juste-chiffre');
    await lancerPartie(page);
    await page.getByRole('button', { name: /Afficher la question/ }).click();
    const saisie = page.locator('#juste-saisie');
    for (const nombre of ['1 000 000 000', '9 999 999 999', '8 200 000 000']) {
      await saisie.fill(nombre);
      // Le nombre tapé se lit en entier dans le champ
      const entier = await saisie.evaluate((champ) => champ.scrollWidth <= champ.clientWidth);
      expect(entier, `« ${nombre} » est coupé dans le champ`).toBe(true);
      await saisie.press('Enter');
    }
    await expect(page.locator('.juste__entree')).toHaveCount(3);
    await verifierMiseEnPage(page);
    // Le prénom passe sous le nombre au lieu d'être coupé (« Jean- / Baptiste »)
    for (const joueur of await page.locator('.juste__joueur').all()) {
      expect(await lignesDe(joueur)).toBe(1);
    }
    expect(erreurs).toEqual([]);
  });

  test('Batterie faible : un long mot tient sur une ligne, une expression se coupe entre ses mots', async ({
    page,
  }) => {
    const erreurs = surveillerErreurs(page);
    await preparerStockage(page, {
      'batterie-faible:contenu': {
        reglages: { crans: 7 },
        elements: [
          { mot: 'Hameçonnage', theme: '', definition: '' },
          { mot: 'Mot de passe', theme: '', definition: '' },
        ],
      },
    });
    await ouvrirJeu(page, 'batterie-faible');
    await lancerPartie(page);
    const hauts = () =>
      page
        .locator('.lettres__case')
        .evaluateAll((cases) => cases.map((c) => Math.round(c.getBoundingClientRect().top)));
    // Les 11 lettres d'« Hameçonnage » sur une seule ligne
    expect(new Set(await hauts()).size).toBe(1);
    await verifierMiseEnPage(page);

    await page.locator('#lettres-mot').fill('Hameçonnage');
    await page.locator('#lettres-mot').press('Enter');
    await page.getByRole('button', { name: /Mot suivant/ }).click();
    // « Mot de passe » : chaque mot reste entier sur sa ligne
    await expect(page.locator('.lettres__case')).toHaveCount(10);
    const lignes = await page
      .locator('.lettres__groupe')
      .evaluateAll((mots) =>
        mots.map((m) => new Set([...m.children].map((c) => c.getBoundingClientRect().top)).size),
      );
    expect(lignes).toEqual([1, 1, 1]);
    await verifierMiseEnPage(page);
    expect(erreurs).toEqual([]);
  });

  test('Top 5 : une réponse trouvée reste lisible à côté de ses points', async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await ouvrirJeu(page, 'top-5', { prenoms: ['Ana', 'Bob'] });
    await lancerPartie(page);
    await page.getByLabel('Proposition du groupe').fill('Chrome');
    await page.getByLabel('Proposition du groupe').press('Enter');
    const reponse = page.locator('.top5__case--trouvee .top5__reponse');
    await expect(reponse).toHaveText('Google Chrome');
    // « Google Chrome » tient sur une ligne : « Attribuer » passe dessous
    expect(await lignesDe(reponse)).toBe(1);
    await verifierAccessibilite(page);
    expect(erreurs).toEqual([]);
  });
});
