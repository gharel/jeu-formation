import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
} from '../../assets/js/commun/ui.js';
import { creerMinuteur, formaterDuree } from '../../assets/js/commun/chrono.js';
import { lire, ecrire } from '../../assets/js/commun/stockage.js';
import { reponseAffichee } from '../../assets/js/commun/reponses.js';
import { schema, exemple } from './exemple.js';
import { ouvre, creerCoffre, cleRecord, estNouveauRecord } from './logique.js';
import { creerIllustrationCoffre } from './illustration.js';

/** Aide « (Entrée) » d'un bouton : inutile sur téléphone, où elle est masquée (base.css). */
const aideClavier = (touche) => el('span', { class: 'aide-clavier' }, ` (${touche})`);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const serruresOuvertes = (n) => `${n} serrure${n > 1 ? 's' : ''} ouverte${n > 1 ? 's' : ''}`;

/** « 30 secondes », « 1 minute », « 1 min 30 s ». */
function duree(ms) {
  const secondes = Math.round(ms / 1000);
  if (secondes < 60) return pluriel(secondes, 'seconde');
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return reste ? `${minutes} min ${reste} s` : pluriel(minutes, 'minute');
}

/** « 30 s », « 1 min », « 1 min 30 s » : le temps qui s'envole près du chrono. */
function dureeCourte(ms) {
  const secondes = Math.round(ms / 1000);
  if (secondes < 60) return `${secondes} s`;
  const reste = secondes % 60;
  return `${Math.floor(secondes / 60)} min${reste ? ` ${reste} s` : ''}`;
}

function demarrer(ctx) {
  const enigmes = ctx.elements;
  const { duree: dureeMinutes, penalite, coutIndice } = ctx.reglages;
  const cle = cleRecord(enigmes.length, dureeMinutes);
  let minuteur = null;
  let touches = {};
  // Le coffre dessiné : sa molette tourne à chaque erreur, sa porte s'ouvre à la fin
  const illustration = creerIllustrationCoffre();
  const retirerClavier = ecouterClavier({
    Entrée: () => touches.entree?.(),
    p: () => touches.pause?.(),
  });

  // ---------- Avant le compte à rebours ----------
  function afficherIntro() {
    const record = lire(cle);
    const titre = el(
      'h3',
      { class: 'panneau__texte' },
      `${pluriel(enigmes.length, 'serrure')}, ${pluriel(dureeMinutes, 'minute')} pour ouvrir le coffre`,
    );
    touches = { entree: commencer };
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau coffre-intro' },
        illustration.element,
        titre,
        el(
          'ul',
          { class: 'coffre-intro__regles' },
          el(
            'li',
            {},
            icone('people-group'),
            'Tout le groupe cherche ensemble, une serrure après l’autre.',
          ),
          el(
            'li',
            {},
            icone('hourglass-half'),
            penalite
              ? `Une mauvaise réponse coûte ${duree(penalite * 1000)}.`
              : 'Les mauvaises réponses ne coûtent rien.',
          ),
          el(
            'li',
            {},
            icone('lightbulb'),
            coutIndice
              ? `Besoin d’un coup de pouce ? Un indice coûte ${duree(coutIndice * 1000)}.`
              : 'Besoin d’un coup de pouce ? Les indices sont gratuits.',
          ),
        ),
        typeof record === 'number'
          ? el(
              'p',
              { class: 'coffre-intro__record' },
              icone('trophy'),
              `Record à battre : coffre ouvert avec ${formaterDuree(record)} d’avance`,
            )
          : null,
        el(
          'div',
          { class: 'actions-jeu' },
          el(
            'button',
            { type: 'button', class: 'bouton bouton--principal bouton--grand', onclick: commencer },
            icone('play'),
            'Lancer le compte à rebours',
            aideClavier('Entrée'),
          ),
        ),
      ),
    );
    focaliser(titre);
  }

  // ---------- Le coffre ----------
  function commencer() {
    touches = {};
    const coffre = creerCoffre({
      nombre: enigmes.length,
      penaliteMs: penalite * 1000,
      coutIndiceMs: coutIndice * 1000,
    });
    let fini = false;
    // Temps écoulé : l'alarme du coffre seule, sans le son de fin du minuteur par-dessus
    minuteur = creerMinuteur({
      duree: dureeMinutes * 60,
      sons: ctx.sons,
      surFin: tempsEcoule,
      sonFin: false,
    });

    const serrures = el('ol', { class: 'coffre__serrures', 'aria-label': 'Serrures' });
    const ecart = el('p', { class: 'coffre__ecart', 'aria-hidden': 'true' });
    illustration.etat(null);
    const porte = el('div', { class: 'coffre__porte' }, illustration.element, serrures);
    const surtitre = el('p', { class: 'panneau__surtitre' });
    const enonce = el('h3', { class: 'coffre__enigme' });
    const saisie = el('input', {
      id: 'coffre-reponse',
      class: 'champ__controle coffre__saisie',
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const essayer = el(
      'button',
      { type: 'submit', class: 'bouton bouton--principal' },
      icone('key'),
      'Essayer',
    );
    const formulaire = el(
      'form',
      { class: 'coffre__formulaire' },
      el('label', { for: 'coffre-reponse', class: 'champ__libelle' }, 'Réponse du groupe'),
      el('div', { class: 'champ__ligne' }, saisie, essayer),
    );
    const message = el('div', { class: 'coffre__message', 'aria-live': 'polite' });
    const indice = el('p', { class: 'coffre__indice', hidden: true });
    const outils = el('div', { class: 'groupe-boutons coffre__outils' });
    const zoneEnigme = el(
      'div',
      { class: 'coffre__zone-enigme' },
      surtitre,
      enonce,
      formulaire,
      message,
      indice,
      outils,
    );
    const panneau = el(
      'div',
      { class: 'panneau coffre', tabindex: '-1' },
      el('div', { class: 'coffre__gauche' }, porte, minuteur.element, ecart),
      zoneEnigme,
    );

    function dessinerSerrures() {
      remplir(
        serrures,
        enigmes.map((_, i) => {
          let etat = 'fermee';
          if (i < coffre.ouvertes) etat = 'ouverte';
          else if (i === coffre.ouvertes && !fini) etat = 'courante';
          return el(
            'li',
            { class: `coffre__serrure coffre__serrure--${etat}` },
            icone(etat === 'ouverte' ? 'lock-open' : 'lock'),
            el(
              'span',
              { class: 'visuellement-cache' },
              `Serrure ${i + 1} : ${etat === 'ouverte' ? 'ouverte' : 'fermée'}`,
            ),
          );
        }),
      );
    }

    function dessinerOutils() {
      const i = coffre.ouvertes;
      const avecIndice = Boolean(enigmes[i]?.indice);
      const enPause = !minuteur.enCours;
      touches = { pause: basculerPause };
      remplir(
        outils,
        avecIndice
          ? el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--discret',
                disabled: coffre.indicePaye() || enPause,
                onclick: acheterIndice,
              },
              icone('lightbulb'),
              coutIndice ? `Indice (−${duree(coutIndice * 1000)})` : 'Indice',
            )
          : null,
        el(
          'button',
          { type: 'button', class: 'bouton bouton--discret', onclick: basculerPause },
          icone(enPause ? 'play' : 'pause'),
          enPause ? 'Reprendre' : 'Pause',
          aideClavier('P'),
        ),
      );
    }

    function afficherEnigme() {
      const i = coffre.ouvertes;
      remplir(surtitre, `Serrure ${i + 1} sur ${enigmes.length}`);
      remplir(enonce, enigmes[i].enigme);
      indice.hidden = true;
      remplir(indice);
      saisie.value = '';
      dessinerSerrures();
      dessinerOutils();
      animer(enonce, 'apparition');
      saisie.focus();
    }

    /** Petit « −30 s » qui s'envole près du chrono. */
    function montrerEcart(ms) {
      remplir(ecart, `${ms < 0 ? '−' : '+'}${dureeCourte(Math.abs(ms))}`);
      ecart.classList.toggle('coffre__ecart--bonus', ms > 0);
      animer(ecart, 'coffre__ecart--visible');
    }

    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      if (fini || !minuteur.enCours || !saisie.value.trim()) return;
      const proposition = saisie.value.trim();
      const juste = ouvre(proposition, enigmes[coffre.ouvertes].reponse);
      const issue = coffre.essayer(juste);
      if (issue === 'erreur') {
        if (penalite) {
          minuteur.ajuster(-penalite * 1000);
          montrerEcart(-penalite * 1000);
        }
        // La pénalité a vidé le chrono : le bilan est déjà affiché, rien d'autre à faire
        if (fini) return;
        remplir(
          message,
          el(
            'p',
            { class: 'coffre__verdict coffre__verdict--erreur' },
            icone('xmark'),
            `« ${proposition} » : la serrure résiste !`,
            penalite ? ` −${duree(penalite * 1000)}` : '',
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'bouton bouton--discret coffre__accepter',
              onclick: accepterQuandMeme,
            },
            icone('check'),
            'La réponse était bonne : ouvrir quand même',
          ),
        );
        saisie.select();
        // Les animations et le son une fois la page à jour
        illustration.reagir('secousse');
        animer(illustration.element, 'coffre-ill--molette');
        ctx.sons.coffre.erreur();
        return;
      }
      serrureOuverte(issue);
    });

    function accepterQuandMeme() {
      const annule = coffre.accepterQuandMeme();
      if (!annule) return;
      if (annule.rendu) {
        minuteur.ajuster(annule.rendu);
        montrerEcart(annule.rendu);
      }
      serrureOuverte(annule.issue);
    }

    function serrureOuverte(issue) {
      if (issue === 'coffre-ouvert') {
        coffreOuvert();
        return;
      }
      remplir(
        message,
        el(
          'p',
          { class: 'coffre__verdict coffre__verdict--ok' },
          icone('lock-open'),
          `Serrure ${coffre.ouvertes} ouverte ! La réponse : ${reponseAffichee(enigmes[coffre.ouvertes - 1].reponse)}`,
        ),
      );
      ctx.annoncer(`Serrure ${coffre.ouvertes} ouverte. Serrure suivante.`);
      afficherEnigme();
      illustration.reagir('hop');
      ctx.sons.coffre.serrure();
    }

    function acheterIndice() {
      const prix = coffre.acheterIndice();
      if (prix === null) return;
      if (prix) {
        minuteur.ajuster(-prix);
        montrerEcart(-prix);
      }
      // L'indice a vidé le chrono : le bilan est affiché, et Entrée doit mener au classement
      if (fini) return;
      remplir(indice, icone('lightbulb'), `Indice : ${enigmes[coffre.ouvertes].indice}`);
      indice.hidden = false;
      // Le bouton « ouvrir quand même » n'a plus cours
      remplir(message);
      dessinerOutils();
      saisie.focus();
      animer(indice, 'apparition');
      ctx.sons.coffre.indice();
    }

    function basculerPause() {
      if (fini) return;
      if (minuteur.enCours) minuteur.pause();
      else minuteur.demarrer();
      const enPause = !minuteur.enCours;
      panneau.classList.toggle('coffre--pause', enPause);
      saisie.disabled = enPause;
      essayer.disabled = enPause;
      dessinerOutils();
      if (!enPause) saisie.focus();
    }

    function terminerCoffre() {
      fini = true;
      touches = {};
      minuteur.arreter();
      saisie.disabled = true;
      essayer.disabled = true;
      dessinerSerrures();
    }

    function coffreOuvert() {
      const restant = minuteur.restant();
      terminerCoffre();
      const ancien = lire(cle);
      const record = estNouveauRecord(ancien, restant);
      if (record) ecrire(cle, restant);
      illustration.etat('ouvert');
      afficherBilan(
        el('p', { class: 'coffre__titre-bilan' }, icone('unlock'), 'Coffre ouvert !'),
        el(
          'p',
          { class: 'coffre__detail-bilan' },
          `Avec ${formaterDuree(restant)} d’avance${coffre.erreurs ? `, malgré ${pluriel(coffre.erreurs, 'erreur')}` : ''}.`,
        ),
        record
          ? el('p', { class: 'coffre__record' }, icone('trophy'), 'Nouveau record !')
          : el(
              'p',
              { class: 'coffre__detail-bilan' },
              `Le record reste à ${formaterDuree(ancien)} d’avance.`,
            ),
      );
      // La fête et la fanfare une fois le bilan affiché
      illustration.reagir('fete');
      ctx.sons.coffre.ouvert();
      ctx.annoncer(`Coffre ouvert avec ${formaterDuree(restant)} d’avance !`);
    }

    function tempsEcoule() {
      if (fini) return;
      terminerCoffre();
      const restantes = enigmes.slice(coffre.ouvertes);
      afficherBilan(
        el(
          'p',
          { class: 'coffre__titre-bilan coffre__titre-bilan--rate' },
          icone('lock'),
          'Temps écoulé !',
        ),
        el(
          'p',
          { class: 'coffre__detail-bilan' },
          `Le coffre reste fermé : ${serruresOuvertes(coffre.ouvertes)} sur ${enigmes.length}.`,
        ),
        el(
          'div',
          { class: 'reponse-revelee coffre__solutions' },
          el('p', { class: 'panneau__surtitre' }, 'Les réponses qui manquaient'),
          el(
            'ul',
            {},
            restantes.map((e) => el('li', {}, reponseAffichee(e.reponse))),
          ),
        ),
      );
      illustration.reagir('secousse');
      ctx.sons.coffre.alarme();
      ctx.annoncer('Temps écoulé : le coffre reste fermé.');
    }

    function afficherBilan(...contenu) {
      const suite = () =>
        ctx.terminer({
          message: coffre.ouvert
            ? 'Le coffre est ouvert : bravo à toute l’équipe !'
            : `Le coffre est resté fermé : ${serruresOuvertes(coffre.ouvertes)} sur ${enigmes.length}.`,
        });
      touches = { entree: suite };
      const bouton = el(
        'button',
        { type: 'button', class: 'bouton bouton--sombre bouton--grand', onclick: suite },
        'Voir le classement',
        aideClavier('Entrée'),
      );
      remplir(
        zoneEnigme,
        el('div', { class: 'coffre__bilan' }, ...contenu),
        el('div', { class: 'actions-jeu' }, bouton),
      );
      animer(zoneEnigme, 'apparition');
      focaliser(zoneEnigme.querySelector('.coffre__titre-bilan'));
    }

    remplir(ctx.zone, panneau);
    minuteur.demarrer();
    afficherEnigme();
    ctx.annoncer(`Le compte à rebours est lancé : ${pluriel(dureeMinutes, 'minute')}.`);
  }

  afficherIntro();
  return () => {
    minuteur?.arreter();
    retirerClavier();
  };
}

monterJeu({
  slug: 'coffre-fort',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez de 3 à 8 énigmes : chacune ferme une serrure du coffre.',
    'Lancez le compte à rebours : tout le groupe cherche ensemble et vous donne sa réponse, que vous tapez. Majuscules, accents et petites fautes de frappe sont pardonnés, et un seul mot de la réponse suffit.',
    'Bonne réponse : la serrure s’ouvre. Mauvaise réponse : le chrono perd du temps. Un indice aussi.',
    'Toutes les serrures ouvertes avant la fin : le coffre s’ouvre ! Le temps restant devient le record à battre.',
  ],
  demarrer,
});
