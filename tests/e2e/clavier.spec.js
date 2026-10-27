import { test, expect } from '@playwright/test';
import { surveillerErreurs, ouvrirJeu, lancerPartie, pointsDe } from './outils.js';

// Les mêmes touches partout : Espace ou → avance, Entrée valide (jamais « suivant »), Retour arrière
// compte une mauvaise réponse, P met le minuteur de manche en pause.

test('Qui suis-je : → démarre, Espace stoppe, Retour arrière reprend, Entrée valide', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'qui-suis-je', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const stop = page.getByRole('button', { name: /Stop/ });
  const bonne = page.getByRole('button', { name: 'Bonne réponse' });

  // La ligne d'aide suit l'étape
  await expect(cadre.getByText(/Espace\sou\s→\s:\sdémarrer/)).toBeVisible();
  // Entrée n'avance jamais : rien ne démarre
  await page.keyboard.press('Enter');
  await expect(stop).toHaveCount(0);
  // → fait comme Espace : le jeu démarre
  await page.keyboard.press('ArrowRight');
  await expect(stop).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\sstop/)).toBeVisible();
  // Espace : stop, puis les trois verdicts possibles
  await page.keyboard.press('Space');
  await expect(bonne).toBeVisible();
  await expect(
    cadre.getByText(/Entrée\s:\sbonne réponse\s·\sRetour arrière\s:\smauvaise réponse, on reprend/),
  ).toBeVisible();
  // Retour arrière : mauvaise réponse, on reprend
  await page.keyboard.press('Backspace');
  await expect(stop).toBeVisible();
  await expect(bonne).toHaveCount(0);
  // Entrée : bonne réponse, la fenêtre « Qui a trouvé ? » s'ouvre
  await page.keyboard.press('Space');
  await expect(bonne).toBeVisible();
  await page.keyboard.press('Enter');
  const dialogue = page.getByRole('dialog', { name: /Qui a trouvé/ });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: 'Bob', exact: true }).click();
  await expect(cadre.getByText(/\+\d\spoints? pour Bob/)).toBeVisible();

  // Manche finie : Entrée n'avance pas, Espace passe au mystère suivant
  await expect(cadre.getByText('Mystère 1 sur 10')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Mystère 1 sur 10')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(cadre.getByText('Mystère 2 sur 10')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Duel buzzer : → affiche la question, Entrée est bonne, Retour arrière mauvaise', async ({
  page,
}) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'duel-buzzer', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  await page.getByRole('button', { name: 'Commencer le duel' }).click();
  const cadre = page.locator('#cadre');
  const attente = cadre.getByText('Mains sur les buzzers… Prêts ?');
  await expect(attente).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\safficher la question/)).toBeVisible();

  // Entrée n'affiche rien, → affiche la question
  await page.keyboard.press('Enter');
  await expect(attente).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(attente).toHaveCount(0);
  await expect(cadre.getByText(/Espace\sou\s→\s:\spersonne ne sait/)).toBeVisible();

  // Ana buzze, se trompe (Retour arrière) : la main passe à Bob, qui a juste (Entrée)
  await page.keyboard.press('a');
  await expect(cadre.getByText('Ana répond !')).toBeVisible();
  await expect(
    cadre.getByText(/Entrée\s:\sbonne réponse\s·\sRetour arrière\s:\smauvaise réponse/),
  ).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(cadre.getByText('Raté ! Bob peut répondre')).toBeVisible();
  await expect(pointsDe(page, 'Ana')).toHaveText('0');
  await page.keyboard.press('Enter');
  await expect(pointsDe(page, 'Bob')).toHaveText('1');

  // Fin de la manche : Entrée n'avance pas, Espace passe à la question suivante
  await expect(cadre.getByText(/Question\s1\ssur/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(cadre.getByText(/Question\s1\ssur/)).toBeVisible();
  await page.keyboard.press('Space');
  await expect(cadre.getByText(/Question\s2\ssur/)).toBeVisible();
  await expect(attente).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Duel buzzer : P met le minuteur de manche en pause, puis le reprend', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.clock.install({ time: new Date('2026-10-05T08:00:00') });
  await ouvrirJeu(page, 'duel-buzzer');
  await page.clock.pauseAt(new Date('2026-10-05T09:00:00'));
  await lancerPartie(page);
  await page.getByRole('button', { name: 'Commencer le duel' }).click();
  await page.keyboard.press('Space');
  const minuteur = page.locator('.minuteur-manche');
  const temps = minuteur.locator('.minuteur-manche__temps');
  await page.clock.runFor(10_000);
  const avant = await temps.textContent();

  await page.keyboard.press('p');
  await expect(minuteur).toHaveClass(/minuteur-manche--pause/);
  await expect(minuteur.getByRole('button', { name: 'Reprendre le minuteur' })).toBeVisible();
  await page.clock.runFor(20_000);
  await expect(temps).toHaveText(avant);

  await page.keyboard.press('p');
  await expect(minuteur).not.toHaveClass(/minuteur-manche--pause/);
  await page.clock.runFor(5_000);
  await expect(temps).not.toHaveText(avant);
  expect(erreurs).toEqual([]);
});

test('Bingo : → commence, tire et dévoile ; Entrée n’avance pas', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'bingo', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const preparation = cadre.getByRole('heading', { name: 'Préparez vos grilles !' });
  await expect(preparation).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\scommencer le tirage/)).toBeVisible();

  // Entrée ne commence pas le tirage, → le commence
  await page.keyboard.press('Enter');
  await expect(preparation).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(preparation).toHaveCount(0);
  await expect(cadre.getByText(/Espace\sou\s→\s:\stirer le premier mot/)).toBeVisible();

  // Espace tire le premier mot (sa définition d'abord) ; Entrée ne le dévoile pas
  await page.keyboard.press('Space');
  await expect(cadre.getByText('Quel est ce mot ?')).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\sdévoiler le mot/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(cadre.getByText('Quel est ce mot ?')).toBeVisible();
  await expect(cadre.locator('.bingo__tire')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(cadre.locator('.bingo__tire')).toHaveCount(1);
  await expect(cadre.getByText('Quel est ce mot ?')).toHaveCount(0);

  // Mot dévoilé : Entrée ne tire pas le suivant, Espace oui
  await page.keyboard.press('Enter');
  await expect(cadre.getByText(/Mot\s1\ssur/)).toBeVisible();
  await page.keyboard.press('Space');
  await expect(cadre.getByText(/Mot\s2\ssur/)).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Debout ou assis : → avance, Entrée n’avance jamais', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirJeu(page, 'debout-assis', { prenoms: ['Ana', 'Bob'] });
  await lancerPartie(page);
  const cadre = page.locator('#cadre');
  const depart = page.getByRole('button', { name: 'C’est parti !' });
  await expect(depart).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\sc’est parti/)).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(depart).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(cadre.getByText(/Affirmation\s1\ssur/)).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\srévéler la réponse/)).toBeVisible();

  // Révéler : Entrée n'a aucun effet, Espace révèle
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Révéler la réponse' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(cadre.getByText(/Les bonnes réponses/)).toBeVisible();
  await expect(cadre.getByText(/Espace\sou\s→\s:\saffirmation suivante/)).toBeVisible();

  // Affirmation suivante : → comme Espace, Entrée non
  await page.keyboard.press('Enter');
  await expect(cadre.getByText(/Affirmation\s1\ssur/)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(cadre.getByText(/Affirmation\s2\ssur/)).toBeVisible();
  expect(erreurs).toEqual([]);
});
