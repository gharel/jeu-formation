/**
 * Accès au site réservé à l'animateur : un mot de passe est demandé avant d'afficher les jeux.
 *
 * Le mot de passe n'apparaît nulle part : le code ne garde que son empreinte PBKDF2-SHA-256
 * (sel aléatoire, 600 000 itérations), calculée par `npm run mot-de-passe`. Une fois le bon
 * mot de passe saisi, ce navigateur s'en souvient (stockage.js) jusqu'à « Verrouiller ».
 *
 * Chaque mot de passe incorrect bloque la saisie, de plus en plus longtemps : 5 minutes, 1 heure,
 * 24 heures, 1 semaine, 1 mois, puis définitivement. Le bon mot de passe remet le compte à zéro.
 *
 * Limite : le site est statique et public. C'est une porte d'entrée dissuasive, pas un coffre :
 * les fichiers restent téléchargeables par qui connaît leur adresse. Le blocage est gardé dans
 * ce navigateur : il freine les essais à la main, pas qui efface son stockage.
 */
import { lire, ecrire, effacer } from './stockage.js';
import { el, icone, remplir } from './ui.js';

const SEL = '284ebb77d9526d1b91143afc658a187b';
/** Empreinte, pas le mot de passe : la publier ne le révèle pas (sert aussi aux tests e2e). */
export const EMPREINTE = '24c2ef4b388d8d476dec140c6fa2602781626e9a94d31dbf50436e994f0e0be7';
const ITERATIONS = 600_000;
export const CLE_ACCES = 'acces';
export const CLE_ECHECS = 'acces-echecs';

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;
/** Blocage après le 1er, le 2e… mot de passe incorrect ; au-delà, il est définitif. */
const BLOCAGES = [
  { duree: 5 * MINUTE, libelle: '5 minutes' },
  { duree: HEURE, libelle: '1 heure' },
  { duree: JOUR, libelle: '24 heures' },
  { duree: 7 * JOUR, libelle: '1 semaine' },
  { duree: 30 * JOUR, libelle: '1 mois' },
];
/** Plus grand délai accepté par setTimeout (environ 24 jours) : au-delà, il part tout de suite. */
const DELAI_MAX = 2 ** 31 - 1;

function hexEnOctets(hex) {
  return new Uint8Array(hex.match(/../g).map((paire) => parseInt(paire, 16)));
}

function octetsEnHex(tampon) {
  return [...new Uint8Array(tampon)].map((o) => o.toString(16).padStart(2, '0')).join('');
}

/** Empreinte hexadécimale d'un mot de passe (Web Crypto : https ou localhost uniquement). */
export async function calculerEmpreinte(motDePasse, sel = SEL, iterations = ITERATIONS) {
  const crypto = globalThis.crypto?.subtle;
  if (!crypto) throw new Error('Chiffrement indisponible');
  const cle = await crypto.importKey(
    'raw',
    new TextEncoder().encode(String(motDePasse).normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexEnOctets(sel), iterations },
    cle,
    256,
  );
  return octetsEnHex(bits);
}

export async function motDePasseCorrect(saisie) {
  if (!saisie) return false;
  return (await calculerEmpreinte(saisie)) === EMPREINTE;
}

export function estDeverrouille() {
  return lire(CLE_ACCES) === EMPREINTE;
}

/** Échecs gardés dans le stockage, nettoyés : { nombre, dernier } (date du dernier, en ms). */
export function lireEchecs() {
  const echecs = lire(CLE_ECHECS);
  const nombre = echecs?.nombre;
  const dernier = echecs?.dernier;
  if (!Number.isInteger(nombre) || nombre < 1 || !Number.isFinite(dernier)) return null;
  return { nombre, dernier };
}

/** Échecs après un nouveau mot de passe incorrect. */
export function ajouterEchec(echecs, maintenant) {
  return { nombre: (echecs?.nombre ?? 0) + 1, dernier: maintenant };
}

/** Fin du blocage en ms : 0 sans échec, Infinity quand il est définitif. */
export function finBlocage(echecs) {
  if (!echecs) return 0;
  const blocage = BLOCAGES[echecs.nombre - 1];
  return blocage ? echecs.dernier + blocage.duree : Infinity;
}

export function estBloque(echecs, maintenant) {
  return finBlocage(echecs) > maintenant;
}

/**
 * « jusqu’à 14 h 38 » le jour même, « jusqu’au vendredi 16 octobre à 14 h 38 » sinon. La minute
 * est arrondie au-dessus : à l'heure affichée, la saisie est rouverte.
 */
function jusqua(fin, maintenant) {
  const date = new Date(Math.ceil(fin / MINUTE) * MINUTE);
  const auj = new Date(maintenant);
  // Espaces insécables : l'heure ne se coupe pas en fin de ligne
  const heure = `à\xa0${date.getHours()}\xa0h\xa0${String(date.getMinutes()).padStart(2, '0')}`;
  if (date.toDateString() === auj.toDateString()) return `jusqu’${heure}`;
  const jour = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === auj.getFullYear() ? {} : { year: 'numeric' }),
  });
  return `jusqu’au ${jour} ${heure}`;
}

/** Message affiché pendant le blocage, '' s'il n'y en a pas. */
export function messageBlocage(echecs, maintenant) {
  const fin = finBlocage(echecs);
  if (fin === Infinity) {
    return 'Trop de mots de passe incorrects : l’accès est bloqué définitivement sur ce navigateur.';
  }
  if (fin <= maintenant) return '';
  const { libelle } = BLOCAGES[echecs.nombre - 1];
  const message = `Mot de passe incorrect : accès bloqué ${libelle}, ${jusqua(fin, maintenant)}.`;
  return echecs.nombre === BLOCAGES.length
    ? `${message} Au prochain échec, il sera bloqué définitivement.`
    : message;
}

/** Oublie le mot de passe sur ce navigateur : il sera redemandé. */
export function verrouiller() {
  effacer(CLE_ACCES);
}

/**
 * Affiche l'écran de mot de passe par-dessus la page tant que l'accès n'est pas ouvert.
 * Renvoie une promesse résolue une fois le bon mot de passe saisi (tout de suite si déjà fait).
 */
export function exigerAcces() {
  if (estDeverrouille()) return Promise.resolve();
  return new Promise((resoudre) => {
    const autres = [...document.body.children];
    for (const noeud of autres) noeud.inert = true;

    const message = el('p', { id: 'erreur-acces', class: 'porte-acces__erreur', role: 'alert' });
    const champ = el('input', {
      id: 'mot-de-passe-acces',
      class: 'champ__controle',
      type: 'password',
      autocomplete: 'current-password',
      required: true,
      'aria-describedby': 'erreur-acces',
    });
    const bouton = el(
      'button',
      { type: 'submit', class: 'bouton bouton--principal' },
      'Entrer',
      icone('arrow-right', { classe: 'icone--apres' }),
    );
    const formulaire = el(
      'form',
      { class: 'porte-acces__formulaire' },
      el('label', { for: 'mot-de-passe-acces', class: 'champ__libelle' }, 'Mot de passe'),
      el('div', { class: 'porte-acces__ligne' }, champ, bouton),
      message,
    );
    const porte = el(
      'div',
      {
        class: 'porte-acces',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'titre-acces',
      },
      el(
        'div',
        { class: 'porte-acces__carte' },
        el('img', {
          class: 'porte-acces__logo',
          src: new URL('../../img/logo-skazy-formation-blanc.svg', import.meta.url).href,
          alt: 'Skazy Formation',
          width: '200',
          height: '66',
        }),
        el(
          'h1',
          { id: 'titre-acces', class: 'porte-acces__titre' },
          icone('lock'),
          'Accès réservé',
        ),
        el('p', {}, 'Saisissez le mot de passe de l’animateur pour ouvrir les jeux.'),
        formulaire,
      ),
    );

    // Échecs gardés en mémoire si le stockage refuse l'écriture : le blocage tient jusqu'au rechargement
    let echecsEnMemoire = null;
    const echecsActuels = () => lireEchecs() ?? echecsEnMemoire;
    let minuterie = null;

    /** Ferme ou rouvre la saisie selon les échecs enregistrés ; renvoie true si elle est bloquée. */
    const appliquerBlocage = () => {
      clearTimeout(minuterie);
      const echecs = echecsActuels();
      const maintenant = Date.now();
      const bloque = estBloque(echecs, maintenant);
      champ.disabled = bloque;
      bouton.disabled = bloque;
      remplir(message, messageBlocage(echecs, maintenant));
      const fin = finBlocage(echecs);
      if (bloque && fin !== Infinity) {
        // Relu à la fin du blocage, par étapes au-delà de la limite de setTimeout
        minuterie = setTimeout(
          () => {
            if (!appliquerBlocage()) champ.focus();
          },
          Math.min(fin - maintenant, DELAI_MAX),
        );
      }
      return bloque;
    };

    formulaire.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Un autre onglet a pu bloquer la saisie entre-temps
      if (appliquerBlocage()) return;
      bouton.disabled = true;
      let correct;
      try {
        correct = await motDePasseCorrect(champ.value);
      } catch {
        remplir(
          message,
          'Vérification impossible ici : ouvrez le site en https:// (ou sur localhost).',
        );
        bouton.disabled = false;
        return;
      }
      if (!correct) {
        const echecs = ajouterEchec(echecsActuels(), Date.now());
        if (!ecrire(CLE_ECHECS, echecs)) echecsEnMemoire = echecs;
        champ.value = '';
        appliquerBlocage();
        return;
      }
      effacer(CLE_ECHECS);
      ecrire(CLE_ACCES, EMPREINTE);
      porte.remove();
      for (const noeud of autres) noeud.inert = false;
      resoudre();
    });

    document.body.append(porte);
    if (!appliquerBlocage()) champ.focus();
  });
}
