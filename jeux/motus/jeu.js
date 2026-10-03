import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, animer, focaliser } from '../../assets/js/commun/ui.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { schema, exemple } from './exemple.js';
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
  const resultat = el('div', { class: 'motus-resultat', hidden: true });
  const jeu = el(
    'div',
    { class: 'motus-jeu' },
    el('div', { class: 'motus-gauche' }, grille),
    el('div', { class: 'motus-droite' }, formulaire, message, clavier, resultat),
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

  function dessinerGrille({ revelerDerniere = false } = {}) {
    const { secret } = motCourant();
    const connues = lettresConnues(secret, essais);
    const lignes = [];
    for (let l = 0; l < NOMBRE_ESSAIS; l++) {
      const essai = essais[l];
      const enCours = !fini && l === essais.length;
      const cases = [];
      for (let i = 0; i < secret.length; i++) {
        let lettre = '';
        let classe = 'motus-case';
        if (essai) {
          lettre = essai.mot[i];
          classe += ` motus-case--${essai.evaluation[i]}`;
          if (revelerDerniere && l === essais.length - 1) classe += ' motus-case--revele';
        } else if (enCours) {
          const tape = proposition();
          lettre = tape[i] ?? '';
          if (!lettre && connues[i]) {
            lettre = connues[i];
            classe += ' motus-case--indice';
          }
        }
        cases.push(el('span', { class: classe, role: 'gridcell', style: `--i:${i}` }, lettre));
      }
      const description = essai
        ? `Essai ${l + 1} : ${[...essai.mot].map((c, i) => `${c} ${LIBELLES_ETAT[essai.evaluation[i]]}`).join(', ')}`
        : `Essai ${l + 1}`;
      lignes.push(
        el(
          'div',
          {
            class: `motus-ligne${enCours ? ' motus-ligne--active' : ''}`,
            role: 'row',
            'aria-label': description,
          },
          cases,
        ),
      );
    }
    remplir(grille, lignes);
    grille.style.setProperty('--colonnes', String(secret.length));
  }

  function dessinerClavier() {
    const etats = etatClavier(essais);
    const touche = (lettre) =>
      el(
        'button',
        {
          type: 'button',
          class: `motus-touche${etats.has(lettre) ? ` motus-touche--${etats.get(lettre)}` : ''}`,
          'aria-label': etats.has(lettre)
            ? `${lettre}, ${LIBELLES_ETAT[etats.get(lettre)]}`
            : lettre,
          onclick: () => {
            saisie.value = proposition() + lettre;
            surSaisie();
            saisie.focus();
          },
        },
        lettre,
      );
    remplir(
      clavier,
      RANGEES_CLAVIER.map((rangee, r) =>
        el(
          'div',
          { class: 'motus-rangee' },
          [...rangee].map(touche),
          r === 2
            ? [
                el(
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
                ),
              ]
            : null,
        ),
      ),
    );
  }

  function surSaisie() {
    const propre = proposition();
    if (saisie.value !== propre) saisie.value = propre;
    message.textContent = '';
    dessinerGrille();
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
    dessinerGrille();
    dessinerClavier();
    saisie.focus();
    saisie.setSelectionRange(1, 1);
  }

  function terminerMot(trouve) {
    fini = true;
    const { secret, definition } = motCourant();
    formulaire.hidden = true;
    clavier.hidden = true;
    dessinerGrille({ revelerDerniere: true });
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
    animer(resultat, 'apparition');
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
      message.textContent = probleme;
      ctx.sons.erreur();
      animer(grille.querySelector('.motus-ligne--active') ?? grille, 'secousse');
      saisie.focus();
      return;
    }
    const evaluation = evaluer(secret, mot);
    essais.push({ mot, evaluation });
    // Une note par lettre, au rythme de l’animation qui retourne les cases
    ctx.sons.motus.lettres(evaluation);
    dessinerClavier();
    if (estTrouve(evaluation)) {
      terminerMot(true);
      return;
    }
    if (essais.length >= NOMBRE_ESSAIS) {
      terminerMot(false);
      return;
    }
    saisie.value = secret[0];
    dessinerGrille({ revelerDerniere: true });
    ctx.annoncer(grille.children[essais.length - 1].getAttribute('aria-label'));
    saisie.focus();
    saisie.setSelectionRange(1, 1);
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
