import { describe, it, expect, beforeEach } from 'vitest';
import {
  FORMAT_GROUPE,
  preparerExportGroupe,
  lireImportGroupe,
} from '../../assets/js/commun/fichier-groupe.js';
import { creerGroupe } from '../../assets/js/commun/groupe.js';
import { chargerNom, normaliserNom, LONGUEUR_NOM } from '../../assets/js/commun/participants.js';

const maintenant = new Date('2026-10-04T08:30:00Z');
const fichier = (donnees) => JSON.stringify(donnees);

beforeEach(() => localStorage.clear());

/** Un groupe de 4 en îlots de 4 : Ana (info, place 2), Bob (absent, place 1), Chloé, David. */
function groupeExemple() {
  return {
    nom: 'Google Sheets, mairie',
    participants: ['Ana', 'Bob', 'Chloé', 'David'],
    infos: { ana: { theme: 'dessert', texte: 'le tiramisu' } },
    absents: ['bob'],
    plan: { disposition: 'ilots', nombre: 8, parIlot: 4, places: { p2: 'ana', p1: 'bob' } },
  };
}

describe('fichier du groupe : export', () => {
  it('écrit un fichier lisible : salle, puis une entrée par personne', () => {
    expect(preparerExportGroupe(groupeExemple(), maintenant)).toEqual({
      format: FORMAT_GROUPE,
      version: 1,
      exporteLe: '2026-10-04T08:30:00.000Z',
      groupe: {
        nom: 'Google Sheets, mairie',
        salle: { disposition: 'ilots', nombreDePlaces: 8, parIlot: 4 },
        participants: [
          { prenom: 'Ana', info: { theme: 'dessert', texte: 'le tiramisu' }, place: 2 },
          { prenom: 'Bob', place: 1, absent: true },
          { prenom: 'Chloé' },
          { prenom: 'David' },
        ],
      },
    });
  });

  it('se relit à l’identique', () => {
    const export_ = preparerExportGroupe(groupeExemple(), maintenant);
    const lu = lireImportGroupe(fichier(export_));
    const { places, ...reglages } = lu.plan;
    expect(lu).toMatchObject({
      nom: 'Google Sheets, mairie',
      participants: ['Ana', 'Bob', 'Chloé', 'David'],
      infos: { ana: { theme: 'dessert', texte: 'le tiramisu' } },
      absents: ['bob'],
      avertissements: [],
    });
    expect(reglages).toEqual({ disposition: 'ilots', nombre: 8, parIlot: 4 });
    expect(places).toEqual({ p2: 'ana', p1: 'bob' });
  });
});

describe('fichier du groupe : import', () => {
  it('accepte un fichier écrit à la main : prénoms seuls, info en texte, sans enveloppe', () => {
    const lu = lireImportGroupe(
      fichier({
        participants: ['Ana', { prenom: '  Bob  ', info: 'la plongée', place: '3' }],
        salle: { disposition: 'cercle', nombreDePlaces: '6' },
      }),
    );
    expect(lu.nom).toBe('');
    expect(lu.participants).toEqual(['Ana', 'Bob']);
    expect(lu.infos).toEqual({ bob: { theme: 'autre', texte: 'la plongée' } });
    expect(lu.plan).toMatchObject({ disposition: 'cercle', nombre: 6, places: { p3: 'bob' } });
  });

  it('signale ce qui est ignoré : doublon, place inexistante ou déjà prise, salle inconnue', () => {
    const lu = lireImportGroupe(
      fichier({
        format: FORMAT_GROUPE,
        groupe: {
          salle: { disposition: 'amphi' },
          participants: [
            { prenom: 'Ana', place: 1 },
            { prenom: 'ana' },
            { prenom: 'Bob', place: 1 },
            { prenom: 'Chloé', place: 9 },
            { prenom: 'David', place: 'fond' },
            { prenom: '' },
            42,
          ],
        },
      }),
    );
    expect(lu.participants).toEqual(['Ana', 'Bob', 'Chloé', 'David']);
    expect(lu.plan.disposition).toBe('u');
    expect(lu.plan.places).toEqual({ p1: 'ana' });
    expect(lu.avertissements).toEqual([
      'Ana apparaît deux fois : le doublon est ignoré.',
      'Disposition « amphi » inconnue (u, classe, ilots, cercle) : la salle est en U.',
      'Place 1 déjà prise : Bob reste à placer.',
      'Place 9 de Chloé ignorée : la salle a 4 places.',
      'Place « fond » de David ignorée : un numéro est attendu.',
    ]);
  });

  it('ne coupe pas un prénom qui contient une virgule en deux personnes', () => {
    expect(
      lireImportGroupe(fichier({ participants: [{ prenom: 'Jean, Paul' }] })).participants,
    ).toEqual(['Jean Paul']);
  });

  it('refuse un fichier abîmé, un contenu de jeu ou autre chose, avec un message clair', () => {
    expect(() => lireImportGroupe('{pas du json')).toThrow('JSON illisible');
    expect(() => lireImportGroupe(fichier({ format: 'skazy-jeux', jeu: 'motus' }))).toThrow(
      'importez-le sur la page « Les contenus »',
    );
    expect(() => lireImportGroupe(fichier({ format: 'skazy-jeux-donnees' }))).toThrow(
      'pas un groupe',
    );
    expect(() => lireImportGroupe(fichier({ format: 'autre', participants: [] }))).toThrow(
      'n’est pas un groupe des mini-jeux',
    );
    expect(() => lireImportGroupe(fichier({ participants: 'Ana, Bob' }))).toThrow(
      'n’est pas un groupe des mini-jeux',
    );
  });
});

describe('le groupe partagé : nom et remplacement', () => {
  it('nomme le groupe, nettoyé et enregistré', () => {
    const groupe = creerGroupe();
    expect(groupe.nom).toBe('');
    groupe.changerNom('  Formation   Excel ');
    expect(groupe.nom).toBe('Formation Excel');
    expect(chargerNom()).toBe('Formation Excel');
    expect(normaliserNom('x'.repeat(200))).toHaveLength(LONGUEUR_NOM);
  });

  it('remplace tout le groupe d’un coup, enregistré et cohérent, en prévenant une fois', () => {
    const groupe = creerGroupe();
    groupe.changerParticipants(['Zoé']);
    let changements = 0;
    groupe.surChangement(() => changements++);
    groupe.remplacer({
      ...groupeExemple(),
      // Une info et une place pour quelqu'un qui n'est pas dans la liste : ignorées
      infos: { ...groupeExemple().infos, zoe: { theme: 'film', texte: 'Up' } },
      plan: { ...groupeExemple().plan, places: { p1: 'bob', p2: 'ana', p3: 'zoé' } },
    });
    expect(changements).toBe(1);
    const relu = creerGroupe();
    expect(relu.nom).toBe('Google Sheets, mairie');
    expect(relu.participants).toEqual(['Ana', 'Bob', 'Chloé', 'David']);
    expect(relu.infos).toEqual({ ana: { theme: 'dessert', texte: 'le tiramisu' } });
    expect(relu.absents).toEqual(['bob']);
    expect(relu.plan).toEqual({
      disposition: 'ilots',
      nombre: 8,
      parIlot: 4,
      places: { p1: 'bob', p2: 'ana' },
    });
    expect(relu.placeDe('Ana')).toBe('Place 2, îlot 1');
  });
});
