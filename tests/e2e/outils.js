import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Collecte les erreurs de la page (console et exceptions) pour vérifier qu'il n'y en a aucune. */
export function surveillerErreurs(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(`exception : ${e.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') erreurs.push(`console : ${message.text()}`);
  });
  return erreurs;
}

/**
 * Ouvre un jeu avec une graine fixe (tirages reproductibles). Les prénoms donnés forment le
 * groupe (géré d'ordinaire sur la page « Le groupe ») : ils sont mis dans le stockage du
 * navigateur, puis la page est rechargée. Par défaut, tout le groupe joue.
 */
export async function ouvrirJeu(page, slug, { prenoms = [] } = {}) {
  const titre = page.getByRole('heading', { name: 'Comment on joue ?' });
  await page.goto(`/jeux/${slug}/?graine=1`);
  await expect(titre).toBeVisible();
  if (prenoms.length) {
    await page.evaluate(
      (liste) => localStorage.setItem('skazy-jeux:participants', JSON.stringify(liste)),
      prenoms,
    );
    await page.reload();
    await expect(titre).toBeVisible();
    await expect(page.getByRole('list', { name: 'Joueurs' }).getByRole('listitem')).toHaveCount(
      prenoms.length,
    );
  }
}

export async function lancerPartie(page) {
  await page.getByRole('button', { name: /Lancer la partie/ }).click();
  await expect(page.getByRole('button', { name: /Quitter la partie/ })).toBeVisible();
}

/** Clique « Attribuer … » puis le prénom dans la fenêtre (et « Valider » si le choix est multiple). */
export async function attribuerPoints(page, prenom) {
  await page.getByRole('button', { name: /Attribuer/ }).click();
  const dialogue = page.getByRole('dialog');
  await dialogue.getByRole('button', { name: prenom, exact: true }).click();
  const valider = dialogue.getByRole('button', { name: 'Valider' });
  if (await valider.isVisible().catch(() => false)) await valider.click();
  await expect(page.getByRole('button', { name: new RegExp(`pour ${prenom}`) })).toBeDisabled();
}

/** Points affichés pour un prénom dans le tableau des points. */
export function pointsDe(page, prenom) {
  return page
    .getByRole('list', { name: 'Points' })
    .getByRole('listitem')
    .filter({ hasText: prenom })
    .locator('.tableau-points__valeur');
}

/**
 * Vérifie l'accessibilité : aucune violation grave ou critique (axe-core), et une typographie
 * qui ne laisse jamais ? ! ; : seul en début de ligne (verifierTypographie).
 */
export async function verifierAccessibilite(page) {
  const resultats = await new AxeBuilder({ page }).analyze();
  const graves = resultats.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
  expect(graves, graves.join('\n')).toEqual([]);
  await verifierTypographie(page);
}

/**
 * Typographie française de tout le texte affiché (et des placeholders, info-bulles) :
 * une espace insécable avant ? ! ; : » et après «. Une espace ordinaire laisserait la
 * ponctuation seule en début de ligne ; l'espace fine, trop étroite, ne se voit pas.
 */
export async function verifierTypographie(page) {
  const fautes = await page.evaluate(() => {
    const textes = [];
    const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (parcours.nextNode()) {
      const noeud = parcours.currentNode;
      if (noeud.parentElement?.closest('script, style, noscript, textarea, svg')) continue;
      textes.push(noeud.textContent);
    }
    for (const element of document.querySelectorAll('[placeholder], [title]')) {
      textes.push(element.getAttribute('placeholder') ?? '', element.getAttribute('title') ?? '');
    }
    const regles = [
      [/[ \u202f][!?;:»]/u, 'espace sécable ou fine avant la ponctuation'],
      [/«[ \u202f]/u, 'espace sécable ou fine après «'],
      [/[\p{L}\p{N}][!?;:](?=\s|$)/u, 'ponctuation collée au mot'],
    ];
    return textes.flatMap((texte) =>
      regles.filter(([motif]) => motif.test(texte)).map(([, faute]) => `${faute} : « ${texte} »`),
    );
  });
  expect(fautes, fautes.join('\n')).toEqual([]);
}
