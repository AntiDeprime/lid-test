const TERM_HINTS = [
  ["Grundgesetz", "Grundgesetz means Germany's constitution."],
  ["Rechtsstaat", "Rechtsstaat means the state and public offices must follow the law."],
  ["Bundestag", "Bundestag is the federal parliament elected by voters."],
  ["Bundesrat", "Bundesrat represents the federal states in federal lawmaking."],
  ["Landtag", "Landtag is a parliament at Bundesland level."],
  ["Meinungsfreiheit", "Meinungsfreiheit protects opinions, but not insults or banned extremist symbols."],
  ["Pressefreiheit", "Pressefreiheit protects independent journalism."],
  ["Religionsfreiheit", "Religionsfreiheit protects choosing, practicing, changing, or rejecting religion."],
  ["Koalition", "A Koalition is cooperation between parties to form a government."],
  ["Opposition", "Opposition means parties or members of parliament outside the government."],
  ["Briefwahl", "Briefwahl means postal voting."],
  ["Schöff", "A Schöffe or Schöffin is a lay judge."],
  ["Betriebsrat", "A Betriebsrat represents employees inside a company."],
  ["Landeszentrale", "A Landeszentrale für politische Bildung offers non-partisan civic education."],
  ["Ministerpräsident", "Ministerpräsident or Ministerpräsidentin is the head of most state governments."]
];

export function getLearnerHint(question) {
  const text = [
    question.prompt,
    question.options.map((option) => option.text).join(" ")
  ].join(" ");
  const match = TERM_HINTS.find(([term]) => text.includes(term));
  if (match) return match[1];
  if (question.images.length) return "Use the image labels carefully; visual questions often test a specific map position, symbol, or building.";
  if (/nicht|kein|keine|welcher.*nicht/i.test(question.prompt)) return "This asks for the exception, so look for the answer that does not fit.";
  return "";
}
