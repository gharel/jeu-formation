/**
 * Petits outils d'affichage. Tout texte passe par textContent : jamais d'innerHTML
 * avec du contenu saisi ou importé.
 */

const ESPACE_FINE = String.fromCharCode(0x202f);

/** Typographie française : espace fine insécable avant ! ? ; : et dans les guillemets. */
export function typographier(texte) {
  return String(texte)
    .replace(/ ([!?;:»])/g, `${ESPACE_FINE}$1`)
    .replace(/« /g, `«${ESPACE_FINE}`);
}

function ajouterEnfants(noeud, enfants) {
  for (const enfant of enfants.flat(Infinity)) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    noeud.append(enfant instanceof Node ? enfant : document.createTextNode(typographier(enfant)));
  }
}

/**
 * Crée un élément : el('button', { class: 'bouton', onclick: fn, 'aria-label': '…' }, 'Texte').
 * Les attributs à false/null/undefined sont ignorés, true donne un attribut vide.
 */
export function el(balise, attributs = {}, ...enfants) {
  const noeud = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs ?? {})) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (cle === 'class') noeud.className = valeur;
    else if (cle === 'dataset') Object.assign(noeud.dataset, valeur);
    else if (cle.startsWith('on') && typeof valeur === 'function') {
      noeud.addEventListener(cle.slice(2), valeur);
    } else if (cle === 'value') noeud.value = valeur;
    else if (cle === 'checked') noeud.checked = Boolean(valeur);
    else if (valeur === true) noeud.setAttribute(cle, '');
    else noeud.setAttribute(cle, String(valeur));
  }
  ajouterEnfants(noeud, enfants);
  return noeud;
}

/**
 * Icône Font Awesome décorative (cachée aux lecteurs d'écran) :
 * icone('dice') → <i class="fa-solid fa-dice icone" aria-hidden="true"></i>.
 * Le texte qui l'accompagne doit suffire à comprendre le bouton ou le message.
 */
export function icone(nom, { style = 'solid', classe = '' } = {}) {
  return el('i', {
    class: `fa-${style} fa-${nom} icone${classe ? ` ${classe}` : ''}`,
    'aria-hidden': 'true',
  });
}

/** Remplace tout le contenu d'un nœud. */
export function remplir(noeud, ...enfants) {
  noeud.replaceChildren();
  ajouterEnfants(noeud, enfants);
  return noeud;
}

/** Message lu par les lecteurs d'écran. */
export function annoncer(texte) {
  const zone = document.getElementById('annonces');
  if (!zone) return;
  zone.textContent = '';
  setTimeout(() => {
    zone.textContent = texte;
  }, 30);
}

const TYPES_NON_TEXTE = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'file',
]);

export function estChampDeSaisie(cible) {
  if (!(cible instanceof Element)) return false;
  if (cible.isContentEditable) return true;
  if (cible.tagName === 'TEXTAREA' || cible.tagName === 'SELECT') return true;
  return cible.tagName === 'INPUT' && !TYPES_NON_TEXTE.has(cible.type);
}

function estActivable(cible) {
  return (
    cible instanceof Element &&
    (estChampDeSaisie(cible) ||
      cible.closest('button, a[href], summary, input, [role="button"]') !== null)
  );
}

/** Nom simple de la touche : 'Espace', 'Entrée', 'Retour', 'Échap' ou la lettre en minuscule. */
export function nomTouche(evenement) {
  switch (evenement.key) {
    case ' ':
    case 'Spacebar':
      return 'Espace';
    case 'Enter':
      return 'Entrée';
    case 'Backspace':
      return 'Retour';
    case 'Escape':
      return 'Échap';
    default:
      return evenement.key.length === 1 ? evenement.key.toLowerCase() : evenement.key;
  }
}

/**
 * Raccourcis clavier de la page. `actions` : { r: fn, Espace: fn, … }.
 * Ignorés pendant la saisie dans un champ, quand une fenêtre de dialogue est ouverte
 * ou avec Ctrl/Alt/Cmd. Espace et Entrée sont aussi ignorés sur un bouton ou un lien
 * (le navigateur les gère déjà). Renvoie une fonction pour retirer l'écoute.
 */
export function ecouterClavier(actions) {
  function surTouche(evenement) {
    if (evenement.ctrlKey || evenement.metaKey || evenement.altKey || evenement.repeat) return;
    if (document.querySelector('dialog[open]')) return;
    const touche = nomTouche(evenement);
    const action = actions[touche];
    if (!action) return;
    const cible = evenement.target;
    if (estChampDeSaisie(cible)) return;
    if ((touche === 'Espace' || touche === 'Entrée') && estActivable(cible)) return;
    evenement.preventDefault();
    action(evenement);
  }
  document.addEventListener('keydown', surTouche);
  return () => document.removeEventListener('keydown', surTouche);
}

export async function basculerPleinEcran() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // plein écran refusé par le navigateur : rien à faire
  }
}

/** Met le focus sur le titre d'un écran qui vient de s'afficher. */
export function focaliser(noeud) {
  if (!noeud) return;
  if (!noeud.hasAttribute('tabindex')) noeud.setAttribute('tabindex', '-1');
  noeud.focus({ preventScroll: false });
}

/** Petite animation CSS rejouable (secousse, apparition…). */
export function animer(noeud, classe) {
  noeud.classList.remove(classe);
  void noeud.offsetWidth;
  noeud.classList.add(classe);
}
