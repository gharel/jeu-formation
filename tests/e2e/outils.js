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
 * Vérifie l'accessibilité : aucune violation grave ou critique (axe-core), une typographie
 * qui ne laisse jamais ? ! ; : seul en début de ligne (verifierTypographie), et une mise en page
 * où aucun texte ne déborde de son cadre (verifierMiseEnPage).
 */
export async function verifierAccessibilite(page) {
  const resultats = await new AxeBuilder({ page }).analyze();
  const graves = resultats.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
  expect(graves, graves.join('\n')).toEqual([]);
  await verifierTypographie(page);
  await verifierMiseEnPage(page);
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

/**
 * Mise en page, à vérifier en particulier sur téléphone :
 * - la page ne défile pas en largeur ;
 * - aucun texte ne sort de son cadre (badge, bouton, carte : l'élément le plus proche qui a un
 *   fond ou une bordure), même avec un grand nombre ;
 * - aucun nombre n'est coupé dans un champ numérique ;
 * - aucun bouton ni titre ne laisse un mot très court seul sur sa ligne (« Le » au-dessus de
 *   « groupe », « 3 » au-dessus de « participants »).
 */
export async function verifierMiseEnPage(page) {
  const fautes = await page.evaluate(() => {
    const fautes = [];
    const nom = (e) => {
      const classes = typeof e.className === 'string' ? e.className.trim() : '';
      return `${e.tagName.toLowerCase()}${classes ? `.${classes.split(/\s+/).join('.')}` : ''}`;
    };
    // Caché : non affiché, transparent, ou rogné pour les seuls lecteurs d'écran
    const masque = (e) => {
      if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return true;
      for (let n = e; n && n !== document.body; n = n.parentElement) {
        if (n.matches('svg, .visuellement-cache, #annonces')) return true;
        if (getComputedStyle(n).clipPath !== 'none') return true;
      }
      return false;
    };
    const aUnCadre = (e) => {
      const s = getComputedStyle(e);
      return (
        !/^(transparent|rgba\(.*,\s*0\))$/.test(s.backgroundColor) ||
        s.backgroundImage !== 'none' ||
        parseFloat(s.borderLeftWidth) > 0 ||
        parseFloat(s.borderRightWidth) > 0
      );
    };
    const extrait = (texte) => `« ${texte.trim().replace(/\s+/g, ' ').slice(0, 50)} »`;

    const { scrollWidth } = document.documentElement;
    if (scrollWidth > window.innerWidth) {
      fautes.push(`la page déborde en largeur (${scrollWidth} px pour ${window.innerWidth} px)`);
    }

    const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (parcours.nextNode()) {
      const noeud = parcours.currentNode;
      const parent = noeud.parentElement;
      if (!noeud.textContent.trim() || !parent || parent.closest('script, style, noscript')) {
        continue;
      }
      if (masque(parent)) continue;
      let cadre = parent;
      while (cadre !== document.body && !aUnCadre(cadre)) cadre = cadre.parentElement;
      if (cadre === document.body) continue;
      const bord = cadre.getBoundingClientRect();
      const plage = document.createRange();
      plage.selectNodeContents(noeud);
      const sort = [...plage.getClientRects()].some(
        (r) => r.width > 0 && (r.left < bord.left - 1 || r.right > bord.right + 1),
      );
      if (sort) fautes.push(`${extrait(noeud.textContent)} sort de son cadre ${nom(cadre)}`);
    }

    for (const champ of document.querySelectorAll('input[type="number"]')) {
      if (!masque(champ) && champ.scrollWidth > champ.clientWidth) {
        fautes.push(`le nombre ${champ.value} est coupé dans son champ ${nom(champ)}`);
      }
    }

    // Lignes d'un bouton ou d'un titre : un mot qui revient à gauche (ou plus bas) en commence une.
    // Les mots sont séparés par les seules espaces sécables : « parti ! » reste un mot.
    for (const element of document.querySelectorAll('.bouton, h1, h2, h3')) {
      if (masque(element)) continue;
      const mots = [];
      const textes = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (textes.nextNode()) {
        const noeud = textes.currentNode;
        if (masque(noeud.parentElement)) continue;
        for (const m of noeud.textContent.matchAll(/[^ \t\n\r\f]+/g)) {
          const plage = document.createRange();
          plage.setStart(noeud, m.index);
          plage.setEnd(noeud, m.index + m[0].length);
          const r = [...plage.getClientRects()].find((x) => x.width > 0);
          if (r) mots.push({ mot: m[0], haut: r.top, gauche: r.left, hauteur: r.height });
        }
      }
      const lignes = [];
      for (const [i, m] of mots.entries()) {
        const avant = mots[i - 1];
        const nouvelle =
          !avant || m.haut > avant.haut + avant.hauteur / 2 || m.gauche < avant.gauche - 1;
        if (nouvelle) lignes.push([m.mot]);
        else lignes.at(-1).push(m.mot);
      }
      if (lignes.length < 2) continue;
      const seul = lignes.find(
        (ligne) => ligne.length === 1 && ligne[0].replace(/[^\p{L}\p{N}]/gu, '').length <= 2,
      );
      if (seul) {
        fautes.push(
          `« ${seul[0]} » est seul sur sa ligne dans ${nom(element)} : ${lignes.map((l) => l.join(' ')).join(' / ')}`,
        );
      }
    }
    return fautes;
  });
  expect(fautes, fautes.join('\n')).toEqual([]);
}
