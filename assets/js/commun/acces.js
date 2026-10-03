/**
 * Accès au site réservé à l'animateur : un mot de passe est demandé avant d'afficher les jeux.
 *
 * Le mot de passe n'apparaît nulle part : le code ne garde que son empreinte PBKDF2-SHA-256
 * (sel aléatoire, 600 000 itérations), calculée par `npm run mot-de-passe`. Une fois le bon
 * mot de passe saisi, ce navigateur s'en souvient (stockage.js) jusqu'à « Verrouiller ».
 *
 * Limite : le site est statique et public. C'est une porte d'entrée dissuasive, pas un coffre :
 * les fichiers restent téléchargeables par qui connaît leur adresse.
 */
import { lire, ecrire, effacer } from './stockage.js';
import { el, icone } from './ui.js';

const SEL = '284ebb77d9526d1b91143afc658a187b';
/** Empreinte, pas le mot de passe : la publier ne le révèle pas (sert aussi aux tests e2e). */
export const EMPREINTE = '24c2ef4b388d8d476dec140c6fa2602781626e9a94d31dbf50436e994f0e0be7';
const ITERATIONS = 600_000;
export const CLE_ACCES = 'acces';

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

    const message = el('p', { class: 'porte-acces__erreur', role: 'alert' });
    const champ = el('input', {
      id: 'mot-de-passe-acces',
      class: 'champ__controle',
      type: 'password',
      autocomplete: 'current-password',
      required: true,
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

    formulaire.addEventListener('submit', async (e) => {
      e.preventDefault();
      bouton.disabled = true;
      message.textContent = '';
      let correct;
      try {
        correct = await motDePasseCorrect(champ.value);
      } catch {
        message.textContent =
          'Vérification impossible ici : ouvrez le site en https:// (ou sur localhost).';
        bouton.disabled = false;
        return;
      }
      if (!correct) {
        message.textContent = 'Mot de passe incorrect.';
        champ.value = '';
        bouton.disabled = false;
        champ.focus();
        return;
      }
      ecrire(CLE_ACCES, EMPREINTE);
      porte.remove();
      for (const noeud of autres) noeud.inert = false;
      resoudre();
    });

    document.body.append(porte);
    champ.focus();
  });
}
