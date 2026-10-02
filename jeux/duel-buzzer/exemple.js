export const schema = {
  reglages: [
    {
      cle: 'pointsVictoire',
      libelle: 'Points pour gagner un duel',
      type: 'nombre',
      defaut: 3,
      min: 1,
      max: 10,
    },
  ],
  elements: {
    libelle: 'Question',
    pluriel: 'questions',
    feminin: true,
    min: 1,
    max: 60,
    champs: [
      {
        cle: 'question',
        libelle: 'Question',
        type: 'texte-long',
        requis: true,
        exemple: 'Ex. : Quel raccourci clavier permet de copier ?',
      },
      {
        cle: 'reponse',
        libelle: 'Réponse attendue',
        type: 'texte',
        requis: true,
        secret: true,
        longueurMax: 120,
        exemple: 'Ex. : Ctrl + C',
        aide: 'Masquée pendant le jeu : vous l’affichez quand vous voulez.',
      },
    ],
  },
};

export const exemple = {
  reglages: { pointsVictoire: 3 },
  elements: [
    { question: 'Quel raccourci clavier permet de copier ?', reponse: 'Ctrl + C' },
    { question: 'Combien de bits y a-t-il dans un octet ?', reponse: '8' },
    { question: 'Que signifie le « www » des adresses web ?', reponse: 'World Wide Web' },
    {
      question: 'Quel symbole sépare le nom et le domaine dans une adresse e-mail ?',
      reponse: 'L’arobase @',
    },
    { question: 'Quel raccourci annule la dernière action ?', reponse: 'Ctrl + Z' },
    {
      question:
        'Comment appelle-t-on un faux message qui imite votre banque pour voler vos codes ?',
      reponse: 'Le hameçonnage (phishing)',
    },
    { question: 'Quelle extension porte un classeur Excel récent ?', reponse: '.xlsx' },
    { question: 'Quel raccourci ferme l’onglet actif du navigateur ?', reponse: 'Ctrl + W' },
    { question: 'Que veut dire le sigle PDF ?', reponse: 'Portable Document Format' },
    {
      question: 'Quelle touche permet d’écrire en majuscules sans maintenir Maj enfoncée ?',
      reponse: 'Verr. Maj (Caps Lock)',
    },
  ],
};
