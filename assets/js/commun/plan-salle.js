/**
 * Plan de salle affiché : l'écran (et son faisceau) en haut, les tables, et une place par bouton.
 * Chaque personne est un avatar rond à ses initiales, dans une couleur de la charte, avec un
 * badge pour le thème de son info, son prénom en étiquette et son info en dessous.
 *
 * creerPlanSalle(groupe, { modifiable, hasard }) → { element, detruire }
 * - modifiable : choix de la disposition (aperçus miniatures) et du nombre de places, et trois
 *   façons de placer : toucher une place (fenêtre de choix), glisser-déposer (souris ou doigt,
 *   événements pointer), placer dans l'ordre ou mélanger. Un prénom choisi dans « À placer »
 *   se pose d'un toucher.
 * - consultation : toucher une place affiche l'info de la personne.
 * ouvrirGroupe(groupe) : fenêtre de consultation (plan + liste des prénoms et des infos).
 */
import * as salle from './salle.js';
import { initiales, themeDe } from './participants.js';
import { el, remplir, icone, annoncer } from './ui.js';
import { ouvrirDialogue } from './dialogues.js';

/** Distance (px) au-delà de laquelle un appui devient un glisser. */
const SEUIL_GLISSER = 6;
/** Adresse de la page « Le groupe », depuis n'importe quelle page du site. */
const PAGE_GROUPE = new URL('../../../groupe/', import.meta.url).href;
/** Nombre de couleurs d'avatar (classes avatar--c1 à avatar--c8 de composants.css). */
const COULEURS = 8;

const pourcent = (valeur, total) => `${(valeur / total) * 100}%`;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Position et taille d'un élément de la salle, en pourcentages (x, y = centre). */
function cadrer({ x, y, l, h }) {
  return `left: ${pourcent(x - l / 2, salle.LARGEUR)}; top: ${pourcent(y - h / 2, salle.HAUTEUR)}; width: ${pourcent(l, salle.LARGEUR)}; height: ${pourcent(h, salle.HAUTEUR)};`;
}

/** Style d'une table : position, taille, et épaisseur des branches de la table en U. */
function styleTable(t) {
  return `${cadrer(t)}${t.epaisseur ? ` --ep: ${t.epaisseur};` : ''}`;
}

/** Avatar rond aux initiales, de la couleur de la personne (son rang dans la liste). */
export function avatar(groupe, prenom, classe = '') {
  const rang = Math.max(0, groupe.participants.indexOf(prenom));
  const info = groupe.infoDe(prenom);
  return el(
    'span',
    {
      class: `avatar avatar--c${(rang % COULEURS) + 1}${classe ? ` ${classe}` : ''}`,
      'aria-hidden': 'true',
    },
    initiales(prenom),
    info ? el('span', { class: 'avatar__badge' }, icone(themeDe(info.theme).icone)) : null,
  );
}

export function creerPlanSalle(groupe, { modifiable = false, hasard = Math.random } = {}) {
  const element = el('div', { class: `plan-salle${modifiable ? ' plan-salle--modifiable' : ''}` });
  const reglages = el('div', { class: 'plan-salle__reglages' });
  const boite = el('div', { class: 'salle', role: 'group' });
  const aPlacer = el('div', { class: 'plan-salle__a-placer' });
  const detail = el('p', { class: 'plan-salle__detail', 'aria-live': 'polite' });
  // Prénom choisi dans « À placer », posé au prochain toucher d'une place
  let selection = null;
  let ignorerClic = false;
  let glisser = null;

  const plan = () => groupe.plan;
  const changer = (nouveau) => groupe.changerPlan(nouveau);

  /** « Place 4 » ou « Place 4, îlot 2 ». */
  const ouEst = (place) =>
    place.groupe ? `Place ${place.numero}, îlot ${place.groupe}` : `Place ${place.numero}`;

  /** Nom accessible d'une place : « Place 3 : Ana, dessert préféré : le tiramisu ». */
  function nommerPlace(place) {
    const prenom = salle.occupant(plan(), groupe.participants, place.id);
    const ou = ouEst(place);
    if (!prenom) return `${ou}, libre`;
    const info = groupe.decrire(prenom);
    return `${ou} : ${prenom}${info ? `, ${info.charAt(0).toLowerCase()}${info.slice(1)}` : ''}`;
  }

  // ---------- Dessin ----------

  function dessinerPlace(place, taille) {
    const prenom = salle.occupant(plan(), groupe.participants, place.id);
    const info = prenom ? groupe.infoDe(prenom) : null;
    return el(
      'button',
      {
        type: 'button',
        class: `salle__place${prenom ? '' : ' salle__place--libre'}${place.inverse ? ' salle__place--inverse' : ''}`,
        dataset: { place: place.id },
        'aria-label': nommerPlace(place),
        title: prenom ?? null,
        style: cadrer({ ...place, ...taille }),
        onclick: () => toucherPlace(place),
        onpointerdown: prenom && modifiable ? (e) => appuyer(e, { place: place.id, prenom }) : null,
      },
      prenom
        ? [
            avatar(groupe, prenom, 'salle__avatar'),
            el('span', { class: 'salle__nom' }, prenom),
            info ? el('span', { class: 'salle__info' }, info.texte) : null,
          ]
        : el(
            'span',
            { class: 'avatar avatar--libre salle__avatar', 'aria-hidden': 'true' },
            String(place.numero),
          ),
    );
  }

  function dessinerSalle() {
    const { places, taille, tables } = salle.dessinerSalle(plan(), groupe.participants);
    const disposition = salle.DISPOSITIONS.find((d) => d.valeur === plan().disposition);
    // Peu de place par personne : l'info, puis le prénom, laissent la place à l'avatar
    let densite = '';
    if (taille.l < 6.5) densite = ' salle--minuscule';
    else if (taille.l < 9.5) densite = ' salle--serree';
    boite.className = `salle salle--${plan().disposition}${densite}`;
    boite.setAttribute(
      'aria-label',
      `Plan de salle (${disposition.libelle}), ${pluriel(places.length, 'place')}`,
    );
    boite.style.setProperty('--s', taille.l);
    remplir(
      boite,
      el('div', { class: 'salle__faisceau', 'aria-hidden': 'true' }),
      el('div', { class: 'salle__ecran', 'aria-hidden': 'true' }, icone('display'), 'Écran'),
      tables.map((t) =>
        el(
          'div',
          {
            class: `salle__table salle__table--${t.forme}`,
            'aria-hidden': 'true',
            style: styleTable(t),
          },
          t.libelle ? el('span', { class: 'salle__table-libelle' }, t.libelle) : null,
        ),
      ),
      places.map((place) => dessinerPlace(place, taille)),
    );
  }

  function dessinerAPlacer() {
    const restants = salle.nonPlaces(plan(), groupe.participants);
    if (selection && !restants.includes(selection)) selection = null;
    const places = salle.nombreDePlaces(plan(), groupe.participants);
    remplir(
      aPlacer,
      el(
        'h4',
        { class: 'plan-salle__titre' },
        'À placer',
        el('span', { class: 'plan-salle__compte' }, String(restants.length)),
      ),
      restants.length
        ? el(
            'ul',
            { class: 'plan-salle__puces', 'aria-label': 'À placer' },
            restants.map((prenom) =>
              el(
                'li',
                {},
                el(
                  'button',
                  {
                    type: 'button',
                    class: 'plan-salle__puce',
                    'aria-pressed': String(selection === prenom),
                    onclick: () => choisir(prenom),
                    onpointerdown: (e) => appuyer(e, { prenom }),
                  },
                  avatar(groupe, prenom, 'avatar--mini'),
                  prenom,
                ),
              ),
            ),
          )
        : el(
            'p',
            { class: 'champ__aide' },
            groupe.participants.length
              ? [icone('circle-check'), 'Tout le monde est placé.']
              : 'Ajoutez des participants pour les placer.',
          ),
      restants.length
        ? el(
            'p',
            { class: 'champ__aide' },
            restants.length > places - Object.keys(plan().places).length
              ? `Pas assez de places : augmentez le « Nombre de places » (${salle.PLACES_MAX} au plus).`
              : 'Faites glisser un prénom sur une place, ou touchez-le puis touchez une place.',
          )
        : null,
    );
  }

  /** Aperçu miniature d'une disposition : ses tables et ses places, avec le nombre de places actuel. */
  function apercu(disposition) {
    const { places, taille, tables } = salle.dessinerSalle(
      { ...plan(), disposition },
      groupe.participants,
    );
    const point = taille.l * 0.62;
    return el(
      'span',
      { class: 'disposition__apercu', 'aria-hidden': 'true' },
      tables.map((t) =>
        el('span', {
          class: `disposition__table disposition__table--${t.forme}`,
          style: styleTable(t),
        }),
      ),
      places.map((p) =>
        el('span', { class: 'disposition__point', style: cadrer({ ...p, l: point, h: point }) }),
      ),
    );
  }

  function dessinerReglages() {
    const actuel = plan();
    const dispositions = el(
      'fieldset',
      { class: 'plan-salle__dispositions' },
      el('legend', { class: 'champ__libelle' }, 'Disposition'),
      el(
        'div',
        { class: 'plan-salle__choix' },
        salle.DISPOSITIONS.map((d) =>
          el(
            'label',
            { class: 'disposition' },
            el('input', {
              type: 'radio',
              name: 'disposition',
              value: d.valeur,
              class: 'visuellement-cache',
              checked: actuel.disposition === d.valeur,
              onchange: () => changer({ ...plan(), disposition: d.valeur }),
            }),
            apercu(d.valeur),
            el('span', { class: 'disposition__nom' }, d.libelle),
            el('span', { class: 'disposition__coche', 'aria-hidden': 'true' }, icone('check')),
          ),
        ),
      ),
    );
    const nombre = el('input', {
      id: 'nombre-places',
      class: 'champ__controle champ__controle--court',
      type: 'number',
      min: 1,
      max: salle.PLACES_MAX,
      inputmode: 'numeric',
      value: String(salle.nombreDePlaces(actuel, groupe.participants)),
      'aria-describedby': 'aide-nombre-places',
      onchange: (e) => {
        const valeur = e.target.value.trim();
        // Champ vidé : la salle suit de nouveau la taille du groupe
        changer({ ...plan(), nombre: valeur === '' ? null : Math.round(Number(valeur)) || null });
      },
    });
    const parIlot =
      actuel.disposition === 'ilots'
        ? el(
            'div',
            { class: 'champ' },
            el('label', { for: 'par-ilot', class: 'champ__libelle' }, 'Personnes par îlot'),
            el(
              'select',
              {
                id: 'par-ilot',
                class: 'champ__controle champ__controle--court',
                onchange: (e) => changer({ ...plan(), parIlot: Number(e.target.value) }),
              },
              salle.PAR_ILOT.map((n) =>
                el('option', { value: n, selected: n === actuel.parIlot || null }, String(n)),
              ),
            ),
          )
        : null;
    remplir(
      reglages,
      dispositions,
      el(
        'div',
        { class: 'plan-salle__barre' },
        el(
          'div',
          { class: 'plan-salle__tailles' },
          el(
            'div',
            { class: 'champ' },
            el('label', { for: 'nombre-places', class: 'champ__libelle' }, 'Nombre de places'),
            nombre,
          ),
          parIlot,
        ),
        el(
          'div',
          { class: 'groupe-boutons' },
          el(
            'button',
            {
              type: 'button',
              class: 'bouton',
              onclick: () => changer(salle.placerDansLOrdre(plan(), groupe.participants)),
            },
            icone('arrow-down-1-9'),
            'Placer dans l’ordre',
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'bouton',
              onclick: () => changer(salle.melanger(plan(), groupe.participants, hasard)),
            },
            icone('shuffle'),
            'Mélanger',
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--discret',
              onclick: () => changer(salle.vider(plan())),
            },
            icone('eraser'),
            'Vider le plan',
          ),
        ),
      ),
      el(
        'p',
        { id: 'aide-nombre-places', class: 'champ__aide' },
        actuel.nombre === null
          ? `Autant de places que de participants (${salle.PLACES_PAR_DEFAUT_MAX} au plus). Jusqu’à ${salle.PLACES_MAX} si besoin.`
          : 'Videz le champ pour revenir à la taille du groupe.',
      ),
    );
  }

  function dessiner() {
    // Garde le focus sur la même place, ou le même réglage, après le nouveau dessin
    const actif = document.activeElement;
    const placeActive = boite.contains(actif) ? actif.dataset.place : null;
    const reglageActif = reglages.contains(actif) ? actif.id || actif.value : null;
    if (modifiable) dessinerReglages();
    dessinerSalle();
    if (modifiable) dessinerAPlacer();
    if (placeActive) boite.querySelector(`[data-place="${placeActive}"]`)?.focus();
    if (reglageActif) {
      (
        reglages.querySelector(`#${CSS.escape(reglageActif)}`) ??
        reglages.querySelector(`input[value="${CSS.escape(reglageActif)}"]`)
      )?.focus();
    }
  }

  // ---------- Toucher ----------

  function choisir(prenom) {
    if (ignorerClic) return;
    selection = selection === prenom ? null : prenom;
    dessinerAPlacer();
    aPlacer.querySelector('[aria-pressed="true"]')?.focus();
    if (selection) annoncer(`${selection} : touchez maintenant une place.`);
  }

  async function toucherPlace(place) {
    if (ignorerClic) return;
    const prenom = salle.occupant(plan(), groupe.participants, place.id);
    if (!modifiable) {
      for (const choisie of boite.querySelectorAll('.salle__place--choisie')) {
        choisie.classList.remove('salle__place--choisie');
      }
      boite.querySelector(`[data-place="${place.id}"]`)?.classList.add('salle__place--choisie');
      const info = prenom ? groupe.decrire(prenom) : '';
      remplir(
        detail,
        prenom
          ? [
              avatar(groupe, prenom, 'avatar--mini'),
              el('strong', {}, prenom),
              info ? ` · ${info}` : '',
              ` · ${ouEst(place)}`,
            ]
          : `${ouEst(place)} : libre.`,
      );
      return;
    }
    if (selection) {
      changer(salle.placer(plan(), place.id, selection));
      annoncer(`${selection} : ${ouEst(place).toLowerCase()}.`);
      selection = null;
      return;
    }
    const choix = await choisirPourPlace(place, prenom);
    if (!choix) return;
    if (choix.liberer) changer(salle.liberer(plan(), place.id));
    else changer(salle.placer(plan(), place.id, choix.prenom));
    boite.querySelector(`[data-place="${place.id}"]`)?.focus();
  }

  /** Fenêtre « Qui est assis ici ? » : les personnes à placer d'abord, puis les autres. */
  function choisirPourPlace(place, occupantActuel) {
    return ouvrirDialogue({
      titre: ouEst(place),
      classe: 'dialogue--prenoms',
      construire({ corps, pied, fermer }) {
        const bouton = (prenom) =>
          el(
            'button',
            {
              type: 'button',
              class: 'puce-prenom puce-prenom--avatar',
              onclick: () => fermer({ prenom }),
            },
            avatar(groupe, prenom, 'avatar--mini'),
            prenom,
          );
        const restants = salle.nonPlaces(plan(), groupe.participants);
        const assis = groupe.participants.filter(
          (p) => !restants.includes(p) && p !== occupantActuel,
        );
        corps.append(el('p', { class: 'dialogue__message' }, 'Qui est assis ici ?'));
        if (restants.length) {
          corps.append(el('div', { class: 'grille-prenoms' }, restants.map(bouton)));
        }
        if (assis.length) {
          corps.append(
            el('p', { class: 'champ__aide' }, 'Déjà placés (ils échangent leur place) :'),
            el('div', { class: 'grille-prenoms' }, assis.map(bouton)),
          );
        }
        if (!restants.length && !assis.length) {
          corps.append(el('p', {}, 'Personne d’autre à placer.'));
        }
        pied.append(
          occupantActuel
            ? el(
                'button',
                { type: 'button', class: 'bouton', onclick: () => fermer({ liberer: true }) },
                `Libérer la place de ${occupantActuel}`,
              )
            : null,
          el('button', { type: 'button', class: 'bouton', onclick: () => fermer(null) }, 'Annuler'),
        );
      },
    });
  }

  // ---------- Glisser-déposer (souris et doigt) ----------

  function appuyer(e, source) {
    if (e.button !== 0 || !modifiable) return;
    glisser = { source, x: e.clientX, y: e.clientY, actif: false, fantome: null, cible: null };
    document.addEventListener('pointermove', bouger);
    document.addEventListener('pointerup', lacher);
    document.addEventListener('pointercancel', annulerGlisser);
    document.addEventListener('keydown', echap);
  }

  function placeSous(x, y) {
    const sous = document.elementFromPoint(x, y)?.closest('.salle__place');
    return sous && boite.contains(sous) ? sous : null;
  }

  function bouger(e) {
    if (!glisser) return;
    if (!glisser.actif) {
      if (Math.hypot(e.clientX - glisser.x, e.clientY - glisser.y) < SEUIL_GLISSER) return;
      glisser.actif = true;
      glisser.fantome = el(
        'div',
        { class: 'salle__fantome', 'aria-hidden': 'true' },
        avatar(groupe, glisser.source.prenom, 'avatar--mini'),
        glisser.source.prenom,
      );
      document.body.append(glisser.fantome);
      element.classList.add('plan-salle--glisse');
    }
    e.preventDefault();
    glisser.fantome.style.left = `${e.clientX}px`;
    glisser.fantome.style.top = `${e.clientY}px`;
    const cible = placeSous(e.clientX, e.clientY);
    if (cible !== glisser.cible) {
      glisser.cible?.classList.remove('salle__place--visee');
      cible?.classList.add('salle__place--visee');
      glisser.cible = cible;
    }
  }

  function lacher(e) {
    if (!glisser) return;
    const { actif, source } = glisser;
    const cible = actif ? placeSous(e.clientX, e.clientY) : null;
    finirGlisser();
    if (!actif) return;
    // Le clic qui suit le lâcher ne doit pas ouvrir la fenêtre de choix
    ignorerClic = true;
    setTimeout(() => {
      ignorerClic = false;
    }, 0);
    const vers = cible?.dataset.place;
    if (source.place && vers) changer(salle.echanger(plan(), source.place, vers));
    else if (vers) changer(salle.placer(plan(), vers, source.prenom));
    // Lâché hors des places : la personne retourne parmi les personnes à placer
    else if (source.place) changer(salle.liberer(plan(), source.place));
    if (vers) annoncer(`${source.prenom} : ${vers.replace('p', 'place ')}.`);
  }

  function echap(e) {
    if (e.key === 'Escape' && glisser?.actif) {
      e.preventDefault();
      annulerGlisser();
    }
  }

  function annulerGlisser() {
    finirGlisser();
  }

  function finirGlisser() {
    glisser?.fantome?.remove();
    glisser?.cible?.classList.remove('salle__place--visee');
    element.classList.remove('plan-salle--glisse');
    glisser = null;
    document.removeEventListener('pointermove', bouger);
    document.removeEventListener('pointerup', lacher);
    document.removeEventListener('pointercancel', annulerGlisser);
    document.removeEventListener('keydown', echap);
  }

  // ---------- Montage ----------

  if (modifiable) element.append(reglages);
  element.append(boite);
  if (modifiable) element.append(aPlacer);
  else element.append(detail);
  dessiner();
  const arreterEcoute = groupe.surChangement(dessiner);

  return {
    element,
    detruire() {
      finirGlisser();
      arreterEcoute();
    },
  };
}

/** Fenêtre « Le groupe » : le plan, puis chaque prénom avec son info et sa place. */
export function ouvrirGroupe(groupe, { focusApres = null } = {}) {
  return ouvrirDialogue({
    focusApres,
    titre: 'Le groupe',
    classe: 'dialogue--groupe',
    construire({ corps, pied, fermer, dialog }) {
      const { participants } = groupe;
      if (!participants.length) {
        corps.append(el('p', {}, 'Aucun participant pour l’instant.'));
      } else {
        const plan = creerPlanSalle(groupe);
        dialog.addEventListener('close', () => plan.detruire());
        const tries = [...participants].sort((a, b) => a.localeCompare(b, 'fr'));
        corps.append(
          plan.element,
          el(
            'ul',
            { class: 'liste-groupe', 'aria-label': 'Prénoms et infos' },
            tries.map((prenom) => {
              const info = groupe.infoDe(prenom);
              return el(
                'li',
                { class: 'liste-groupe__ligne' },
                avatar(groupe, prenom, 'avatar--mini'),
                el(
                  'span',
                  { class: 'liste-groupe__texte' },
                  el('strong', { class: 'liste-groupe__prenom' }, prenom),
                  info
                    ? el(
                        'span',
                        { class: 'liste-groupe__info' },
                        el(
                          'span',
                          { class: 'visuellement-cache' },
                          `${themeDe(info.theme).libelle} : `,
                        ),
                        info.texte,
                      )
                    : null,
                ),
                groupe.placeDe(prenom)
                  ? el('span', { class: 'liste-groupe__place' }, groupe.placeDe(prenom))
                  : null,
              );
            }),
          ),
        );
      }
      pied.append(
        el('a', { class: 'bouton', href: PAGE_GROUPE }, icone('pen'), 'Modifier le groupe'),
        el(
          'button',
          { type: 'button', class: 'bouton bouton--principal', onclick: () => fermer() },
          'Fermer',
        ),
      );
    },
  });
}
