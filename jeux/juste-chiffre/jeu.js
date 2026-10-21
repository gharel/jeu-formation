import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
} from '../../assets/js/commun/ui.js';
import { creerBoutonPoints, nommerMarqueur } from '../../assets/js/commun/points.js';
import { nommerAvecEquipe } from '../../assets/js/commun/mode-jeu.js';
import { lireNombre, formaterNombre } from '../../assets/js/commun/nombres.js';
import { schema, exemple } from './exemple.js';
import { creerIllustrationJuste } from './illustration.js';
import { MESSAGES, comparer, fourchette, decrireFourchette, suivant } from './logique.js';

const FLECHES = { plus: 'arrow-up', moins: 'arrow-down', juste: 'bullseye' };
const aideClavier = (touche) => el('span', { class: 'aide-clavier' }, ` (${touche})`);

/** « 30 secondes », « 1 minute 30 ». */
function dureeLisible(secondes) {
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  const morceaux = [];
  if (minutes) morceaux.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (reste) morceaux.push(minutes ? String(reste) : `${reste} seconde${reste > 1 ? 's' : ''}`);
  return morceaux.join(' ');
}

function demarrer(ctx) {
  const { duree, tourDeRole } = ctx.reglages;
  const questions = ctx.elements;
  const avecTour = tourDeRole && ctx.participants.length > 0;
  // Tour de rôle : les joueurs, ou les équipes chacune leur tour (leurs membres tournent)
  const ordre = ctx.ordreDePassage();
  let indexQuestion = 0;
  let indexJoueur = 0;
  let designe = null;
  let rafraichirJoueur = null;
  // Temps par question (choisi au lancement) : à zéro, une alerte ; on peut ajouter du temps ou
  // révéler la réponse. Sans limite : pas de chrono
  let revelerCourant = null;
  const minuteur = ctx.creerMinuteurManche({
    duree,
    passer: { libelle: 'Révéler la réponse', faire: () => revelerCourant?.('temps') },
  });
  // Entrée : « Afficher la question » sur l'écran d'attente
  let toucheEntree = null;
  const retirerClavier = ecouterClavier({ Entrée: () => toucheEntree?.() });

  function joueurCourant() {
    if (avecTour) return ordre[indexJoueur];
    return designe;
  }

  /** « Au tour de Bob », « Au tour de Bob (Les Bleus) » en équipes. */
  const auTourDe = (joueur) => `Au tour de ${nommerAvecEquipe(ctx.equipes, joueur)}`;

  ctx.quandDesigne((prenom) => {
    designe = prenom;
    if (avecTour) indexJoueur = Math.max(0, ordre.indexOf(prenom));
    rafraichirJoueur?.();
  });

  // ---------- Avant chaque question : le chrono ne part qu'au signal de l'animateur ----------
  function afficherAttente() {
    minuteur?.arreter();
    const illustration = creerIllustrationJuste();
    const titre = el(
      'h3',
      { class: 'panneau__texte juste-attente__titre' },
      'Prêts ? La question s’affiche avec le chrono.',
    );
    const tour = el('p', { class: 'au-tour-de' });
    rafraichirJoueur = () => {
      const joueur = joueurCourant();
      tour.hidden = !joueur;
      remplir(tour, icone('microphone'), auTourDe(joueur));
    };
    rafraichirJoueur();
    const lancer = () => {
      toucheEntree = null;
      afficherQuestion();
    };
    toucheEntree = lancer;
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau juste-attente' },
        illustration.element,
        el(
          'div',
          { class: 'juste-attente__textes' },
          el(
            'p',
            { class: 'panneau__surtitre' },
            `Question ${indexQuestion + 1} sur ${questions.length}`,
          ),
          titre,
          el(
            'p',
            { class: 'juste-attente__duree' },
            icone('stopwatch'),
            duree
              ? `${dureeLisible(duree)} pour trouver le nombre`
              : 'Sans limite de temps pour trouver le nombre',
          ),
          tour,
          el(
            'button',
            { type: 'button', class: 'bouton bouton--principal bouton--grand', onclick: lancer },
            icone('play'),
            'Afficher la question',
            aideClavier('Entrée'),
          ),
        ),
      ),
    );
    focaliser(titre);
  }

  function afficherQuestion() {
    const q = questions[indexQuestion];
    const unite = String(q.unite ?? '').trim();
    const historique = [];
    let finie = false;

    const surtitre = el(
      'p',
      { class: 'panneau__surtitre' },
      `Question ${indexQuestion + 1} sur ${questions.length}`,
    );
    const enonce = el('h3', { class: 'panneau__texte juste__question' }, q.question);
    const precision = unite ? el('p', { class: 'juste__unite' }, `Réponse en ${unite}`) : null;
    const tour = el('p', { class: 'au-tour-de' });
    const etiquette = el('label', { for: 'juste-saisie', class: 'champ__libelle' });
    const saisie = el('input', {
      id: 'juste-saisie',
      class: 'champ__controle juste__saisie',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      'aria-describedby': 'juste-erreur',
    });
    const erreur = el('p', { id: 'juste-erreur', class: 'juste__erreur', role: 'alert' });
    const formulaire = el(
      'form',
      { class: 'juste__formulaire' },
      etiquette,
      el(
        'div',
        { class: 'champ__ligne' },
        saisie,
        el('button', { type: 'submit', class: 'bouton bouton--principal' }, 'Valider'),
      ),
    );
    const verdict = el('p', { class: 'juste__verdict', 'aria-live': 'assertive' });
    // La flèche se plante sous le centre (c'est plus), au-dessus (c'est moins) ou en plein cœur
    const illustration = creerIllustrationJuste();
    const borne = el('p', { class: 'juste__fourchette' });
    const liste = el('ol', { class: 'juste__historique', 'aria-label': 'Propositions' });
    const compteur = el('p', { class: 'juste__compteur' });
    const devoiler = el(
      'button',
      { type: 'button', class: 'bouton bouton--discret', onclick: () => reveler('abandon') },
      'Révéler la réponse',
    );
    // L'animation d'apparition se joue d'elle-même quand le bilan cesse d'être caché
    const fin = el('div', { class: 'juste__fin apparition', hidden: true });
    const commandes = el('div', { class: 'groupe-boutons groupe-boutons--centre' }, devoiler);

    rafraichirJoueur = () => {
      const joueur = joueurCourant();
      tour.hidden = !joueur;
      remplir(tour, icone('microphone'), auTourDe(joueur));
      etiquette.textContent = joueur ? `Proposition de ${joueur}` : 'Proposition';
    };
    rafraichirJoueur();

    /** La dernière proposition s'ajoute en tête de l'historique (sans refaire toute la liste). */
    function dessinerHistorique() {
      const h = historique.at(-1);
      liste.prepend(
        el(
          'li',
          { class: `juste__entree juste__entree--${h.resultat}` },
          el('span', { class: 'juste__valeur' }, formaterNombre(h.valeur)),
          h.joueur ? el('span', { class: 'juste__joueur' }, h.joueur) : null,
          el('span', { class: 'juste__sens' }, icone(FLECHES[h.resultat]), h.resultat),
        ),
      );
      // remplir() et non textContent : espaces insécables (« 1 000 », « 3 propositions »)
      remplir(borne, decrireFourchette(fourchette(historique), unite));
      remplir(
        compteur,
        historique.length
          ? `${historique.length} proposition${historique.length > 1 ? 's' : ''}`
          : '',
      );
    }

    function reveler(raison) {
      if (finie) return;
      finie = true;
      minuteur?.arreter();
      formulaire.hidden = true;
      commandes.hidden = true;
      verdict.hidden = true;
      tour.hidden = true;
      erreur.textContent = '';
      const trouve = raison === 'juste';
      const gagnant = trouve ? historique.at(-1)?.joueur : null;
      if (gagnant) ctx.scores.ajouter(gagnant, 1);
      const marqueur = gagnant ? nommerMarqueur(ctx, gagnant) : null;
      const reponse = `${formaterNombre(q.reponse)}${unite ? ` ${unite}` : ''}`;
      const titre = el(
        'p',
        { class: 'juste__resultat' },
        trouve
          ? [icone('face-grin-stars'), `Trouvé${gagnant ? ` par ${gagnant}` : ''} !`]
          : raison === 'temps'
            ? [icone('hourglass-end'), 'Temps écoulé !']
            : 'Réponse',
      );
      const dernier = indexQuestion === questions.length - 1;
      remplir(
        fin,
        el('div', { class: 'juste__bilan' }, illustration.element, titre),
        el(
          'div',
          { class: 'reponse-revelee' },
          el('p', { class: 'reponse-revelee__valeur' }, reponse),
          q.anecdote ? el('p', {}, q.anecdote) : null,
        ),
        el(
          'div',
          { class: 'actions-jeu' },
          gagnant
            ? el('p', { class: 'juste__point' }, icone('check'), `+1 point pour ${marqueur}`)
            : trouve
              ? creerBoutonPoints(ctx, { titre: 'Qui a trouvé ?' })
              : null,
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--sombre bouton--grand',
              onclick: () => {
                if (dernier) {
                  ctx.terminer({ message: 'Toutes les questions ont été jouées.' });
                  return;
                }
                indexQuestion += 1;
                if (avecTour) indexJoueur = suivant(ordre, indexJoueur);
                afficherAttente();
              },
            },
            dernier ? 'Voir le classement' : ['Question suivante', icone('arrow-right')],
          ),
        ),
      );
      fin.hidden = false;
      // L'illustration et le son une fois le bilan affiché (au temps écoulé, le minuteur a déjà
      // sonné la fin : pas de second son par-dessus)
      if (trouve) illustration.etat('juste');
      illustration.reagir(trouve ? 'fete' : 'secousse');
      if (trouve) ctx.sons.juste.juste();
      else if (raison === 'abandon') ctx.sons.erreur();
      ctx.annoncer(`${trouve ? 'Trouvé' : 'La réponse était'} : ${reponse}`);
      focaliser(titre);
    }

    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const valeur = lireNombre(saisie.value);
      if (valeur === null) {
        remplir(erreur, 'Tapez un nombre (exemple : 1 500 ou 2,5).');
        animer(saisie, 'secousse');
        return;
      }
      erreur.textContent = '';
      const resultat = comparer(q.reponse, valeur, q.marge ?? 0);
      historique.push({ valeur, resultat, joueur: joueurCourant() });
      saisie.value = '';
      dessinerHistorique();
      if (resultat === 'juste') {
        // Le verdict serait caché aussitôt par le bilan : on ne le dessine pas
        reveler('juste');
        return;
      }
      remplir(
        verdict,
        el('span', { class: 'juste__fleche' }, icone(FLECHES[resultat])),
        MESSAGES[resultat],
      );
      // Les classes du sens seulement : `apparition` doit rester pour qu'animer() la relance
      verdict.classList.toggle('juste__verdict--plus', resultat === 'plus');
      verdict.classList.toggle('juste__verdict--moins', resultat === 'moins');
      illustration.etat(resultat);
      animer(verdict, 'apparition');
      saisie.focus();
      ctx.sons.juste[resultat]();
    });

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau juste' },
        surtitre,
        enonce,
        precision,
        el(
          'div',
          { class: 'juste__colonnes' },
          el(
            'div',
            { class: 'juste__gauche' },
            commandes,
            el('div', { class: 'juste__infos' }, borne, compteur, liste),
          ),
          el(
            'div',
            { class: 'juste__droite' },
            tour,
            formulaire,
            erreur,
            el('div', { class: 'juste__retour' }, illustration.element, verdict),
            fin,
          ),
        ),
      ),
    );
    revelerCourant = reveler;
    minuteur?.relancer();
    saisie.focus();
  }

  afficherAttente();
  return () => {
    minuteur?.arreter();
    retirerClavier();
  };
}

monterJeu({
  slug: 'juste-chiffre',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des questions dont la réponse est un nombre.',
    'Un participant propose un nombre à l’oral, vous le tapez : le jeu répond « c’est plus » ou « c’est moins ».',
    'Le minuteur (réglé au lancement) part quand vous affichez la question : à zéro, il sonne et clignote ; ajoutez du temps ou révélez la réponse.',
    'Qui trouve gagne 1 point (ou le fait gagner à son équipe). La même personne propose jusqu’à la fin de la question, puis le tour de rôle passe la main (en équipes : à l’équipe suivante).',
  ],
  demarrer,
});
