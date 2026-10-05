import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, animer, focaliser, typographier } from '../../assets/js/commun/ui.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { schema, exemple } from './exemple.js';
import { creerIllustrationMotus } from './illustration.js';
import {
  NOMBRE_ESSAIS,
  normaliserMot,
  verifierProposition,
  evaluer,
  estTrouve,
  etatClavier,
  lettresConnues,
} from './logique.js';

const RANGEES_CLAVIER = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const LIBELLES_ETAT = { bien: 'bien placée', mal: 'mal placée', absent: 'absente' };

function demarrer(ctx) {
  const mots = ctx.elements.map((e) => ({
    secret: normaliserMot(e.mot),
    definition: String(e.definition ?? '').trim(),
  }));
  let indexMot = 0;
  let essais = [];
  let fini = false;
  let auTourDe = null;

  const surtitre = el('p', { class: 'panneau__surtitre' });
  const tour = el('p', { class: 'au-tour-de', hidden: true });
  const grille = el('div', {
    class: 'motus-grille',
    role: 'grid',
    'aria-label': 'Grille de Motus',
  });
  const message = el('p', { class: 'motus-message', role: 'alert' });
  const saisie = el('input', {
    id: 'motus-saisie',
    class: 'champ__controle motus-saisie',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'characters',
    spellcheck: 'false',
    'aria-describedby': 'motus-aide',
  });
  const formulaire = el(
    'form',
    { class: 'motus-formulaire' },
    el('label', { for: 'motus-saisie', class: 'champ__libelle' }, 'Proposition du participant'),
    el(
      'div',
      { class: 'champ__ligne' },
      saisie,
      el('button', { type: 'submit', class: 'bouton bouton--principal' }, 'Valider'),
    ),
    el(
      'p',
      { id: 'motus-aide', class: 'champ__aide' },
      'Tapez le mot proposé à l’oral puis Entrée. Pas de dictionnaire : c’est vous qui jugez.',
    ),
  );
  const clavier = el('div', { class: 'motus-clavier', 'aria-label': 'Clavier' });
  // L'animation d'apparition se rejoue d'elle-même chaque fois que le résultat cesse d'être caché
  const resultat = el('div', { class: 'motus-resultat apparition', hidden: true });
  const illustration = creerIllustrationMotus();
  const jeu = el(
    'div',
    { class: 'motus-jeu' },
    el('div', { class: 'motus-gauche' }, grille),
    el(
      'div',
      { class: 'motus-droite' },
      el(
        'div',
        { class: 'motus-droite__haut' },
        illustration.element,
        el('div', { class: 'motus-droite__saisie' }, formulaire, message),
      ),
      clavier,
      resultat,
    ),
  );

  remplir(
    ctx.zone,
    el(
      'div',
      { class: 'panneau motus' },
      el('div', { class: 'motus-entete' }, surtitre, tour),
      jeu,
    ),
  );

  ctx.quandDesigne((prenom) => {
    auTourDe = prenom;
    dessinerTour();
  });

  function dessinerTour() {
    tour.hidden = !auTourDe;
    remplir(tour, icone('microphone'), `Au tour de ${auTourDe}`);
  }

  function motCourant() {
    return mots[indexMot];
  }

  function proposition() {
    return normaliserMot(saisie.value).slice(0, motCourant().secret.length);
  }

  // La grille est créée une fois par mot : à chaque touche, seule la ligne en cours change, et
  // une ligne validée se retourne une seule fois (elle n'est plus recréée par la touche suivante)
  let lignes = [];
  let cases = [];

  function construireGrille() {
    const { secret } = motCourant();
    cases = Array.from({ length: NOMBRE_ESSAIS }, () =>
      Array.from({ length: secret.length }, (_, i) =>
        el('span', { class: 'motus-case', role: 'gridcell', style: `--i:${i}` }),
      ),
    );
    lignes = cases.map((ligne, l) =>
      el('div', { class: 'motus-ligne', role: 'row', 'aria-label': `Essai ${l + 1}` }, ligne),
    );
    remplir(grille, lignes);
    grille.style.setProperty('--colonnes', String(secret.length));
  }

  function marquerLigneActive() {
    lignes.forEach((ligne, l) => {
      ligne.classList.toggle('motus-ligne--active', !fini && l === essais.length);
    });
  }

  /** La ligne en cours : les lettres tapées, et en grisé celles déjà trouvées (indices). */
  function dessinerSaisie() {
    if (fini || essais.length >= NOMBRE_ESSAIS) return;
    const tape = proposition();
    const connues = lettresConnues(motCourant().secret, essais);
    cases[essais.length].forEach((caseMotus, i) => {
      const lettre = tape[i] ?? '';
      const indice = !lettre && Boolean(connues[i]);
      caseMotus.textContent = lettre || (indice ? connues[i] : '');
      caseMotus.classList.toggle('motus-case--indice', indice);
    });
  }

  /** Une ligne validée : ses lettres et leurs couleurs, retournées une à une. */
  function revelerLigne(l) {
    const { mot, evaluation } = essais[l];
    cases[l].forEach((caseMotus, i) => {
      caseMotus.textContent = mot[i];
      caseMotus.className = `motus-case motus-case--${evaluation[i]} motus-case--revele`;
    });
    const detail = [...mot].map((c, i) => `${c} ${LIBELLES_ETAT[evaluation[i]]}`).join(', ');
    lignes[l].setAttribute('aria-label', typographier(`Essai ${l + 1} : ${detail}`));
  }

  // Le clavier affiché, créé une fois : une proposition ne change que la couleur des touches
  const touches = new Map();
  remplir(
    clavier,
    RANGEES_CLAVIER.map((rangee, r) =>
      el(
        'div',
        { class: 'motus-rangee' },
        [...rangee].map((lettre) => {
          const touche = el(
            'button',
            {
              type: 'button',
              class: 'motus-touche',
              'aria-label': lettre,
              onclick: () => {
                saisie.value = proposition() + lettre;
                surSaisie();
                saisie.focus();
              },
            },
            lettre,
          );
          touches.set(lettre, touche);
          return touche;
        }),
        r === 2
          ? el(
              'button',
              {
                type: 'button',
                class: 'motus-touche motus-touche--large',
                'aria-label': 'Effacer une lettre',
                onclick: () => {
                  saisie.value = proposition().slice(0, -1);
                  surSaisie();
                  saisie.focus();
                },
              },
              icone('delete-left'),
            )
          : null,
      ),
    ),
  );

  function dessinerClavier() {
    const etats = etatClavier(essais);
    for (const [lettre, touche] of touches) {
      const etat = etats.get(lettre);
      touche.className = `motus-touche${etat ? ` motus-touche--${etat}` : ''}`;
      touche.setAttribute('aria-label', etat ? `${lettre}, ${LIBELLES_ETAT[etat]}` : lettre);
    }
  }

  function surSaisie() {
    const propre = proposition();
    if (saisie.value !== propre) saisie.value = propre;
    message.textContent = '';
    dessinerSaisie();
  }

  function preparerMot() {
    essais = [];
    fini = false;
    const { secret } = motCourant();
    surtitre.textContent = `Mot ${indexMot + 1} sur ${mots.length} · ${secret.length} lettres`;
    saisie.maxLength = secret.length;
    saisie.value = secret[0];
    saisie.disabled = false;
    formulaire.hidden = false;
    clavier.hidden = false;
    resultat.hidden = true;
    message.textContent = '';
    illustration.etat(null);
    construireGrille();
    marquerLigneActive();
    dessinerSaisie();
    dessinerClavier();
    saisie.focus();
    saisie.setSelectionRange(1, 1);
  }

  function terminerMot(trouve) {
    fini = true;
    const { secret, definition } = motCourant();
    formulaire.hidden = true;
    clavier.hidden = true;
    marquerLigneActive();
    const dernier = indexMot === mots.length - 1;
    const suivant = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--sombre bouton--grand',
        onclick: () => {
          if (dernier) {
            ctx.terminer({ message: 'Les 5 mots ont été joués.' });
            return;
          }
          indexMot += 1;
          preparerMot();
        },
      },
      dernier ? 'Voir le classement' : ['Mot suivant', icone('arrow-right')],
    );
    const titre = el(
      'p',
      { class: 'motus-resultat__titre' },
      trouve ? [icone('face-grin-stars'), 'Trouvé !'] : 'Pas trouvé cette fois…',
    );
    remplir(
      resultat,
      titre,
      el(
        'div',
        { class: 'reponse-revelee' },
        el('p', { class: 'reponse-revelee__valeur' }, secret),
        definition ? el('p', {}, definition) : null,
      ),
      el(
        'div',
        { class: 'actions-jeu' },
        trouve ? creerBoutonPoints(ctx, { titre: 'Qui a trouvé le mot ?' }) : null,
        suivant,
      ),
    );
    resultat.hidden = false;
    if (trouve) {
      illustration.etat('trouve');
      illustration.reagir('fete');
    } else {
      illustration.reagir('secousse');
    }
    // Fanfare ou « boum » une fois toutes les lettres révélées
    const apresLettres = { debut: secret.length * 0.12 + 0.1 };
    if (trouve) ctx.sons.motus.trouve(apresLettres);
    else ctx.sons.motus.perdu(apresLettres);
    ctx.annoncer(trouve ? `Trouvé ! Le mot était ${secret}` : `Le mot était ${secret}`);
    focaliser(titre);
  }

  saisie.addEventListener('input', surSaisie);
  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();
    const { secret } = motCourant();
    const mot = proposition();
    const probleme = verifierProposition(secret, mot);
    if (probleme) {
      remplir(message, probleme);
      saisie.focus();
      animer(lignes[essais.length], 'secousse');
      ctx.sons.erreur();
      return;
    }
    const evaluation = evaluer(secret, mot);
    essais.push({ mot, evaluation });
    revelerLigne(essais.length - 1);
    // Une note par lettre, au rythme de l’animation qui retourne les cases
    const jouerLettres = () => ctx.sons.motus.lettres(evaluation);
    if (estTrouve(evaluation)) {
      terminerMot(true);
      jouerLettres();
      return;
    }
    if (essais.length >= NOMBRE_ESSAIS) {
      terminerMot(false);
      jouerLettres();
      return;
    }
    // Le clavier ne sert plus quand le mot est fini (il est caché) : seulement ici
    dessinerClavier();
    saisie.value = secret[0];
    marquerLigneActive();
    dessinerSaisie();
    ctx.annoncer(lignes[essais.length - 1].getAttribute('aria-label'));
    saisie.focus();
    saisie.setSelectionRange(1, 1);
    jouerLettres();
  });

  preparerMot();
}

monterJeu({
  slug: 'motus',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez 5 mots du numérique (de 4 à 10 lettres).',
    'La première lettre est donnée. Un participant propose un mot à l’oral, vous le tapez.',
    'Vert : lettre bien placée. Jaune (rond) : lettre présente mais mal placée. Bleu : absente.',
    '6 essais par mot. Celui ou celle qui trouve gagne 1 point.',
  ],
  demarrer,
});
