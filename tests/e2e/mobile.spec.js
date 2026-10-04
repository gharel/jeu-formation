import { test, expect, devices } from '@playwright/test';
import { JEUX } from '../../assets/js/jeux.js';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

// Téléphone tactile (écran étroit, ni souris ni clavier), dans le Chromium des tests
const telephone = { ...devices['Pixel 7'] };
delete telephone.defaultBrowserType;

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
