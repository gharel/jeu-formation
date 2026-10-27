import { test, expect } from '@playwright/test';
import {
  surveillerErreurs,
  ouvrirJeu,
  lancerPartie,
  choisirNombre,
  pointsDe,
  verifierAccessibilite,
} from './outils.js';

test('Pyramide : faire deviner un mot à son binôme en 1, 2, 3 ou 4 mots', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  // À trois, 3 binômes de 2 mots : chacun passe 2 fois, c'est la valeur proposée
  await expect(page.getByRole('spinbutton', { name: 'Nombre de mots' })).toHaveAttribute(
    'aria-valuenow',
    '6',
  );
  await expect(page.locator('#cadre').getByText('3 binômes : chacun passe 2 fois')).toBeVisible();
  // Ici, on joue les 10 mots : 5 binômes, Ana en a un de plus
  await choisirNombre(page, 'Nombre de mots', 10);
  await expect(
    page.locator('#cadre').getByText(/5\sbinômes\s:\s2\sjoueurs passeront/),
  ).toBeVisible();
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const fait = page.getByLabel('Fait deviner');
  const devine = page.getByLabel('Devine, dos à l’écran');
  const cestParti = page.getByRole('button', { name: 'C’est parti !' });

  // Choix du binôme : deux personnes différentes
  await expect(cadre.getByText('10 mots à faire deviner · 2 par binôme')).toBeVisible();
  await fait.selectOption('Ana');
  await devine.selectOption('Ana');
  await cestParti.click();
  await expect(cadre.getByText('Choisissez deux personnes différentes.')).toBeVisible();
  await devine.selectOption('Bob');
  await cestParti.click();

  // Mot 1 : caché le temps que Bob tourne le dos à l'écran
  await expect(cadre.getByText('Mot 1 sur 10')).toBeVisible();
  await expect(cadre.getByText('Ana fait deviner à Bob')).toBeVisible();
  await expect(cadre.getByText('Bob, dos à l’écran !')).toBeVisible();
  await expect(page.locator('.pyramide__mot')).toHaveCount(0);
  await verifierAccessibilite(page);

  // Espace : le mot s'affiche, 1er mot d'indice au sommet de la pyramide (4 points)
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toHaveText('Souris');
  const etages = page
    .getByRole('list', { name: 'Points selon le nombre de mots d’indice' })
    .getByRole('listitem');
  await expect(etages).toHaveCount(4);
  await expect(etages.nth(0)).toHaveAttribute('aria-current', 'step');
  await expect(etages.nth(0)).toContainText('1 mot');
  await expect(etages.nth(0)).toContainText('4 points');
  await expect(cadre.getByText('1er mot d’indice : 4 points en jeu')).toBeVisible();
  await verifierAccessibilite(page);

  // Raté au 1er mot d'indice (Retour arrière), trouvé au 2e (Entrée) : 3 points pour Ana et Bob
  await page.keyboard.press('Backspace');
  await expect(etages.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(etages.nth(0)).toContainText('raté');
  await expect(page.getByRole('button', { name: 'Trouvé ! 3 points' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Trouvé en 2 mots d’indice !')).toBeVisible();
  await expect(cadre.getByText('+3 points pour Ana et Bob')).toBeVisible();
  await expect(cadre.getByText('Bob, vous pouvez vous retourner !')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('3');
  await expect(pointsDe(page, 'Bob')).toHaveText('3');
  await verifierAccessibilite(page);

  // Mot 2 : les rôles s'inversent ; un indice interdit est une faute, le mot est perdu
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await expect(cadre.getByText('Bob fait deviner à Ana')).toBeVisible();
  await expect(cadre.getByText('Ana, dos à l’écran !')).toBeVisible();
  await page.getByRole('button', { name: 'Afficher le mot' }).click();
  await expect(page.locator('.pyramide__mot')).toHaveText('Corbeille');
  await page.getByRole('button', { name: 'Faute' }).click();
  await expect(cadre.getByText('Faute : le mot est perdu.')).toBeVisible();
  await expect(pointsDe(page, 'Bob')).toHaveText('3');

  // Binôme suivant : un binôme est déjà prévu, de deux personnes différentes
  await page.getByRole('button', { name: 'Binôme suivant' }).click();
  await expect(fait).not.toHaveValue(await devine.inputValue());
  await cestParti.click();

  // Mot 3 : quatre mots d'indice sans succès, pas de point
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toHaveText('Wi-Fi');
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace');
  await expect(etages.nth(3)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Trouvé ! 1 point' })).toBeVisible();
  await page.getByRole('button', { name: 'Raté : mot perdu' }).click();
  await expect(cadre.getByText('Pas trouvé en 4 mots…')).toBeVisible();

  // Les mots suivants, trouvés du premier coup (4 points), jusqu'au classement
  await page.keyboard.press('Space');
  for (let numero = 4; numero <= 10; numero++) {
    if (numero % 2 === 1) await cestParti.click();
    await expect(cadre.getByText(`Mot ${numero} sur 10`)).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await expect(cadre.getByText('Trouvé en 1 mot d’indice !')).toBeVisible();
    if (numero < 10) await page.keyboard.press('Space');
  }
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  await expect(cadre.getByText('Tous les mots de la pyramide ont été joués.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Podium' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('sans prénoms, on joue quand même par deux, rôles inversés à chaque mot', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide');
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await expect(cadre.getByText('Par deux : l’un fait deviner, l’autre devine.')).toBeVisible();
  await expect(cadre.getByText('La personne qui devine : dos à l’écran !')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('+4 points pour le binôme')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(cadre.getByText('On inverse les rôles !')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(
    cadre.getByText('Au binôme suivant : l’un fait deviner, l’autre devine.'),
  ).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('on prépare une simple liste de mots, sans indices', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob'] });
  await page.getByRole('button', { name: /Préparer le contenu/ }).click();
  await page.getByRole('button', { name: 'Vider la liste' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vider' }).click();
  // La liste n'est vidée qu'à la fermeture de la fenêtre : on attend le message avant de saisir
  await expect(page.locator('#cadre').getByText(/Liste vidée/)).toBeVisible();
  const mot = page.getByLabel('Mot à faire deviner', { exact: true });
  await expect(mot).toHaveCount(1);
  await expect(page.getByLabel(/Indice/)).toHaveCount(0);
  await mot.fill('Écran');
  // Les mots par binôme ne se règlent plus ici : c'est sur l'accueil, à côté du nombre de mots
  await expect(page.getByLabel('Mots à faire deviner par binôme')).toHaveCount(0);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#cadre').getByText('1 mot prêt')).toBeVisible();
  await choisirNombre(page, 'Mots à faire deviner par binôme', 1);

  await lancerPartie(page);
  await expect(
    page.locator('#cadre').getByText('1 mot à faire deviner · 1 par binôme'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  await page.keyboard.press('Space');
  await expect(page.locator('.pyramide__mot')).toHaveText('Écran');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('le nombre de mots joués : 7 binômes pour 7 joueurs, ou un peu moins avec « Équilibrer »', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', {
    prenoms: ['Ana', 'Bob', 'Chloé', 'David', 'Eva', 'Fred', 'Gaëlle'],
  });
  const cadre = page.locator('#cadre');
  const mots = page.getByRole('spinbutton', { name: 'Nombre de mots' });
  const equilibrer = cadre.getByRole('button', { name: 'Équilibrer' });
  // 2 mots par binôme : 7 binômes feraient 14 mots, il n'y en a que 10
  await expect(mots).toHaveAttribute('aria-valuenow', '10');
  await expect(
    cadre.getByText(/5\sbinômes\s:\s4\sjoueurs passeront une fois de moins/),
  ).toBeVisible();
  // 1 mot par binôme : 7 binômes, chacun passe 2 fois, c'est la valeur proposée
  await choisirNombre(page, 'Mots à faire deviner par binôme', 1);
  await expect(mots).toHaveAttribute('aria-valuenow', '7');
  await expect(cadre.getByText(/7\sbinômes\s:\schacun passe 2\sfois/)).toBeVisible();
  await expect(equilibrer).toBeHidden();
  await verifierAccessibilite(page);

  // 6 binômes : deux joueurs de moins ; « Équilibrer » revient à 7
  await choisirNombre(page, 'Nombre de mots', 6);
  await expect(
    cadre.getByText(/6\sbinômes\s:\s2\sjoueurs passeront une fois de moins/),
  ).toBeVisible();
  await expect(equilibrer).toBeVisible();
  await verifierAccessibilite(page);
  await equilibrer.click();
  await expect(mots).toHaveAttribute('aria-valuenow', '7');
  await expect(equilibrer).toBeHidden();

  // Le choix est gardé : on joue 6 mots, et la partie finit après le sixième
  await choisirNombre(page, 'Nombre de mots', 6);
  await page.reload();
  await expect(mots).toHaveAttribute('aria-valuenow', '6');
  await lancerPartie(page);
  const cestParti = page.getByRole('button', { name: 'C’est parti !' });
  for (let numero = 1; numero <= 6; numero++) {
    await cestParti.click();
    await expect(cadre.getByText(`Mot ${numero} sur 6`)).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await expect(cadre.getByText('Trouvé en 1 mot d’indice !')).toBeVisible();
    if (numero < 6) await page.keyboard.press('Space');
  }
  await expect(page.getByRole('button', { name: 'Mot suivant' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Binôme suivant' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voir le classement' }).click();
  await expect(page.getByRole('heading', { name: 'Partie terminée !' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('le binôme prévu est proposé ; « Tirer au sort » reste dans ceux qui restent', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob', 'Chloé'] });
  await choisirNombre(page, 'Mots à faire deviner par binôme', 1);
  await lancerPartie(page);
  const fait = page.getByLabel('Fait deviner');
  const devine = page.getByLabel('Devine, dos à l’écran');
  const cestParti = page.getByRole('button', { name: 'C’est parti !' });
  const binome = async () => [await fait.inputValue(), await devine.inputValue()].sort().join('|');
  // 3 joueurs, 3 binômes d'un mot : les trois binômes possibles, chacun une fois, même en
  // tirant au sort à chaque fois
  const joues = [];
  for (let numero = 1; numero <= 3; numero++) {
    expect(await fait.inputValue()).not.toBe(await devine.inputValue());
    await page.getByRole('button', { name: 'Tirer au sort' }).click();
    joues.push(await binome());
    await cestParti.click();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    if (numero < 3) await page.keyboard.press('Space');
  }
  expect([...joues].sort()).toEqual(['Ana|Bob', 'Ana|Chloé', 'Bob|Chloé']);
  expect(erreurs).toEqual([]);
});

test('on recache le mot en cours de jeu, sans perdre l’indice ni relancer le temps', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await page.clock.install({ time: new Date('2026-10-05T08:00:00') });
  await ouvrirJeu(page, 'pyramide', { prenoms: ['Ana', 'Bob'] });
  await page.clock.pauseAt(new Date('2026-10-05T09:00:00'));
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  await page.getByRole('button', { name: 'C’est parti !' }).click();
  const mot = page.locator('.pyramide__mot');
  const temps = page.locator('.minuteur-manche').getByRole('timer');
  const etages = page
    .getByRole('list', { name: 'Points selon le nombre de mots d’indice' })
    .getByRole('listitem');
  await page.keyboard.press('Space');
  await expect(mot).toHaveText('Souris');
  await expect(temps).toHaveText('0:45');

  // Raté une fois (Retour arrière) : le 2e mot d'indice est en cours
  await page.keyboard.press('Backspace');
  await expect(etages.nth(1)).toHaveAttribute('aria-current', 'step');
  await page.clock.runFor(10_000);
  await expect(temps).toHaveText('0:35');

  // Espace recache le mot : l'alerte « dos à l'écran », rien d'autre ne bouge
  await expect(page.getByRole('button', { name: 'Cacher le mot' })).toBeVisible();
  await expect(cadre.getByText(/Espace\s:\scacher le mot/)).toBeVisible();
  await page.keyboard.press('Space');
  await expect(mot).toHaveCount(0);
  await expect(cadre.getByText(/dos à l’écran\s!/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Afficher le mot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cacher le mot' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Trouvé/ })).toHaveCount(0);
  await expect(etages.nth(0)).toContainText('raté');
  await expect(etages.nth(1)).toHaveAttribute('aria-current', 'step');
  // Mot caché : ni « trouvé » ni « raté » au clavier
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');
  await expect(etages.nth(1)).toHaveAttribute('aria-current', 'step');
  await page.clock.runFor(5_000);
  await expect(temps).toHaveText('0:30');

  // Espace réaffiche le même mot, au même indice, et le temps continue (il n'est pas relancé)
  await page.keyboard.press('Space');
  await expect(mot).toHaveText('Souris');
  await expect(etages.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Trouvé ! 3 points' })).toBeVisible();
  await expect(temps).toHaveText('0:30');
  // Le mot n'est pas annoncé de nouveau aux lecteurs d'écran
  await expect(page.locator('#annonces')).not.toContainText('Mot à faire deviner');
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Trouvé en 2 mots d’indice !')).toBeVisible();
  await expect(cadre.getByText('+3 points pour Ana et Bob')).toBeVisible();
  expect(erreurs).toEqual([]);
});
