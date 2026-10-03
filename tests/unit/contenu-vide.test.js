import { describe, it, expect } from 'vitest';
import {
  contenuVide,
  exempleDuChamp,
  nettoyerContenu,
  validerContenu,
} from '../../assets/js/commun/contenu.js';
import { JEUX } from '../../assets/js/jeux.js';

const schema = {
  reglages: [{ cle: 'duree', libelle: 'Durée', type: 'nombre', defaut: 30 }],
  elements: {
    libelle: 'Question',
    pluriel: 'questions',
    min: 2,
    max: 4,
    champs: [
      { cle: 'texte', libelle: 'Question', type: 'texte', requis: true, exemple: 'Ex. : 2 + 2 ?' },
      {
        cle: 'etapes',
        libelle: 'Étapes',
        type: 'liste',
        min: 2,
        exemple: ['Ex. : ouvrir', 'Ex. : fermer'],
      },
    ],
  },
};

describe('liste vide', () => {
  it('garde les réglages et ne laisse que le nombre minimal d’éléments vides', () => {
    const contenu = {
      reglages: { duree: 12 },
      elements: [
        { texte: 'a', etapes: ['x', 'y'] },
        { texte: 'b', etapes: ['x', 'y'] },
        { texte: 'c', etapes: ['x', 'y'] },
      ],
    };
    expect(contenuVide(schema, contenu)).toEqual({
      reglages: { duree: 12 },
      elements: [
        { texte: '', etapes: ['', ''] },
        { texte: '', etapes: ['', ''] },
      ],
    });
  });

  it('prend les réglages par défaut si aucun contenu n’est donné', () => {
    expect(contenuVide(schema).reglages).toEqual({ duree: 30 });
  });

  it('ne recopie jamais les exemples dans les valeurs', () => {
    const vide = contenuVide(schema);
    expect(JSON.stringify(vide)).not.toContain('Ex.');
  });
});

describe('exemples affichés en placeholder', () => {
  it('donne l’exemple du champ, ou celui de la ligne pour une liste', () => {
    const [texte, etapes] = schema.elements.champs;
    expect(exempleDuChamp(texte)).toBe('Ex. : 2 + 2 ?');
    expect(exempleDuChamp(texte, 3)).toBe('Ex. : 2 + 2 ?');
    expect(exempleDuChamp(etapes, 1)).toBe('Ex. : fermer');
    expect(exempleDuChamp(etapes, 2)).toBeNull();
    expect(exempleDuChamp({ type: 'texte' })).toBeNull();
  });
});

describe.each(JEUX.map((j) => j.slug))('%s', (slug) => {
  it('a un exemple (placeholder) pour chaque champ à saisir', async () => {
    const { schema: schemaJeu } = await import(`../../jeux/${slug}/exemple.js`);
    for (const champ of schemaJeu.elements.champs) {
      const aSaisir =
        ['texte', 'texte-long', 'liste'].includes(champ.type) ||
        (champ.type === 'nombre' && !('defaut' in champ));
      if (!aSaisir) continue;
      const premier = exempleDuChamp(champ, 0);
      expect(premier, `${slug} : « ${champ.libelle} »`).toMatch(/\S/);
    }
  });

  it('se vide en une liste à compléter, sans valeur d’exemple', async () => {
    const { schema: schemaJeu, exemple } = await import(`../../jeux/${slug}/exemple.js`);
    const vide = contenuVide(schemaJeu, nettoyerContenu(schemaJeu, exemple));
    expect(vide.elements).toHaveLength(schemaJeu.elements.min ?? 1);
    expect(vide.reglages).toEqual(nettoyerContenu(schemaJeu, exemple).reglages);
    // Les champs obligatoires sont à remplir : la liste vide n'est pas jouable telle quelle
    expect(validerContenu(schemaJeu, vide).length).toBeGreaterThan(0);
  });
});
