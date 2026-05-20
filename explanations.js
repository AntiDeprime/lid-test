window.LID_EXPLANATION_HELPERS = (() => {
  "use strict";

  const TERM_NOTES = [
    ["Bundestag", "The Bundestag is Germany's national parliament; it passes federal laws, elects the Chancellor, and controls the federal government."],
    ["Bundesregierung", "The Bundesregierung is the federal government: the Chancellor and federal ministers. It is not the same thing as the Bundestag."],
    ["Bundesrat", "The Bundesrat represents the governments of the 16 federal states in federal lawmaking."],
    ["Bundespräsident", "The Bundespräsident is Germany's head of state and mainly represents the country; day-to-day government is led by the Chancellor."],
    ["Bundeskanz", "The Bundeskanzler or Bundeskanzlerin leads the federal government."],
    ["Bundesversammlung", "The Bundesversammlung is a special body that meets to elect the Federal President."],
    ["Bundesverfassungsgericht", "The Bundesverfassungsgericht is Germany's highest constitutional court."],
    ["Grundgesetz", "The Grundgesetz is Germany's constitution and protects basic rights."],
    ["Verfassung", "A Verfassung is a constitution: the highest set of rules for the state."],
    ["Rechtsstaat", "A Rechtsstaat is a state governed by law: citizens and the state must obey the law."],
    ["Meinungsfreiheit", "Meinungsfreiheit means freedom of opinion, but it does not protect insults, lies about people, or banned extremist symbols."],
    ["Pressefreiheit", "Pressefreiheit means freedom of the press and is protected as a basic right."],
    ["Religionsfreiheit", "Religionsfreiheit means people may choose and practice their religion."],
    ["Glaubens- und Gewissensfreiheit", "Glaubens- und Gewissensfreiheit protects belief, religion, and conscience."],
    ["Menschenwürde", "Menschenwürde means human dignity; Article 1 of the Basic Law protects it."],
    ["Gleichbehandlung", "Gleichbehandlung means equal treatment and protects people from discrimination by the state and in many everyday situations."],
    ["Freizügigkeit", "Freizügigkeit means freedom to choose where to live and move within Germany."],
    ["Asyl", "Asyl is protection for people persecuted in another country, so this right is specifically for foreigners."],
    ["Republik", "A Republik has an elected head of state, not a monarch."],
    ["Monarchie", "A Monarchie has a king, queen, or similar hereditary ruler; Germany does not."],
    ["Diktatur", "A Diktatur concentrates power and does not allow free democratic control."],
    ["Bundesstaat", "A Bundesstaat divides power between the federal level and the federal states."],
    ["Zentralstaat", "A Zentralstaat concentrates political power at the national level; Germany is not organized that way."],
    ["Staatenbund", "A Staatenbund is a loose alliance of states, not Germany's federal system."],
    ["Staatenverbund", "Staatenverbund usually describes a union of states, for example the EU, not Germany's internal structure."],
    ["Sozialstaat", "A Sozialstaat supports people through systems such as health insurance, pensions, and unemployment insurance."],
    ["Sozialversicherung", "Sozialversicherung is Germany's social insurance system, funded mainly by contributions from workers and employers."],
    ["Sozialabgaben", "Sozialabgaben are social security contributions paid for systems such as health, pension, care, and unemployment insurance."],
    ["Koalition", "A Koalition is cooperation between parties to form a government."],
    ["Fraktion", "A Fraktion is a parliamentary group of members from the same party or allied parties."],
    ["Opposition", "The Opposition is made up of members of parliament who are not part of the governing parties."],
    ["Legislative", "The Legislative is the lawmaking branch, mainly parliament."],
    ["Exekutive", "The Exekutive is the executive branch, such as government, ministries, police, and administration."],
    ["Judikative", "The Judikative is the judicial branch: courts and judges."],
    ["Direktive", "Direktive is not one of the three branches of state power in Germany."],
    ["Landtag", "A Landtag is the parliament of a federal state."],
    ["Landtagswahl", "A Landtagswahl elects the parliament of a federal state."],
    ["Bundesländer", "Bundesländer are Germany's 16 federal states, each with its own government and responsibilities."],
    ["Gemeinden", "Gemeinden are municipalities, the lowest political level in Germany."],
    ["Kommunen", "Kommunen are local municipalities and districts."],
    ["Ordnungsamt", "The Ordnungsamt is a local public order office, part of municipal administration."],
    ["Auswärtiges Amt", "The Auswärtiges Amt is the federal foreign office, not local municipal administration."],
    ["Bürgerinitiative", "A Bürgerinitiative is a citizens' initiative formed to influence a local or political issue."],
    ["Briefwahl", "Briefwahl means postal voting."],
    ["Wahlbenachrichtigung", "A Wahlbenachrichtigung is the official notice telling eligible voters when and where to vote."],
    ["5%-Hürde", "The 5%-Hürde is the five-percent threshold a party usually needs to enter parliament."],
    ["aktives Wahlrecht", "Aktives Wahlrecht means the right to vote; passives Wahlrecht means the right to stand as a candidate."],
    ["Wahlhelfer", "Wahlhelferinnen and Wahlhelfer help run elections, for example by counting votes."],
    ["Arbeitsgericht", "The Arbeitsgericht is the labor court for disputes between employees and employers."],
    ["Kündigungsschutzklage", "A Kündigungsschutzklage is a legal claim against an unfair dismissal."],
    ["Kündigungsfrist", "A Kündigungsfrist is the notice period required before ending an employment contract."],
    ["Betriebsrat", "A Betriebsrat is a works council that represents employees inside a company."],
    ["Rechtsanw", "A Rechtsanwalt or Rechtsanwältin gives legal advice and represents people in court."],
    ["Schöff", "A Schöffe or Schöffin is a lay judge who helps decide guilt and punishment."],
    ["Prozess", "A Prozess is a court trial or legal proceeding."],
    ["Synagoge", "A Synagoge is a Jewish house of prayer."],
    ["Holocaust", "The Holocaust was the Nazi genocide of Jews; denying it is antisemitic."],
    ["Nationalsozial", "National Socialism was the Nazi dictatorship in Germany from 1933 to 1945."],
    ["Drittes Reich", "The 'Third Reich' means the Nazi dictatorship, not a democracy."],
    ["DDR", "DDR means German Democratic Republic, the East German state that existed from 1949 to 1990."],
    ["GDR", "GDR means German Democratic Republic, the East German state that existed from 1949 to 1990."],
    ["Stasi", "The Stasi was the GDR's Ministry for State Security, a secret police and intelligence service."],
    ["Warschauer Pakt", "The Warsaw Pact was the Soviet-led military alliance during the Cold War."],
    ["NATO", "NATO is the Western defense alliance; the GDR did not belong to it."],
    ["Planwirtschaft", "A Planwirtschaft is a planned economy controlled by the state."],
    ["soziale Marktwirtschaft", "The social market economy combines market competition with social protection by the state."],
    ["Römischen Verträge", "The Treaties of Rome founded the European Economic Community, a predecessor of today's EU."],
    ["Europäische Union", "The European Union is a political and economic union of European states."],
    ["Europäischen Parlament", "The European Parliament is elected by EU citizens."],
    ["Elterngeldstelle", "The Elterngeldstelle is the office where parents apply for parental allowance."],
    ["Jugendamt", "The Jugendamt is the youth welfare office; it helps families and protects children."],
    ["Einwohnermeldeamt", "The Einwohnermeldeamt registers residents and address changes."],
    ["Standesamt", "The Standesamt handles civil status matters such as marriages, births, and deaths."],
    ["Mutterschutz", "Mutterschutz protects pregnant employees and mothers around childbirth."],
    ["Briefgeheimnis", "Briefgeheimnis protects the privacy of letters and mail."],
    ["Widerspruch", "A Widerspruch is a formal objection to an administrative decision."],
    ["Einspruch", "An Einspruch is a formal objection, for example against a tax assessment."],
    ["Kirchensteuer", "Kirchensteuer is church tax collected with wage or income tax for members of certain churches."],
    ["Adventszeit", "Adventszeit is the four-week period before Christmas."],
    ["Gastarbeiter", "Gastarbeiterinnen and Gastarbeiter were foreign workers recruited by West Germany, especially from the 1950s and 1960s."],
    ["Regierende Bürgermeister", "In Berlin the head of government is called the Governing Mayor, not Minister-President."],
    ["Senator", "In Berlin, senators are members of the state government responsible for policy areas such as finance, interior, or justice."],
    ["Stadtstaat", "A Stadtstaat is a city that is also a federal state; Berlin, Hamburg, and Bremen are city-states."]
  ];

  const SHORT_FACTS = {
    21: "Correct: Bild 1 shows the Federal Eagle, Germany's coat of arms. The other pictures show different symbols, not the federal coat of arms.",
    29: "Correct: the eagle is Germany's heraldic animal. The lion, bear, and horse are associated with other places or symbols.",
    40: "Correct: the anthem begins with 'Einigkeit und Recht und Freiheit'. The other lines belong to other songs or historical slogans.",
    55: "Correct: the picture shows the Bundestag building in Berlin. The other options are different federal institutions or buildings.",
    130: "Correct: candidate 1 has the most votes in the shown example. The other numbers mark candidates with fewer votes.",
    176: "Correct: the map labels the zones as Great Britain, Soviet Union, USA, and France. The other orders swap occupying powers.",
    209: "Correct: Bild 4 shows the GDR coat of arms with hammer, compass, and wreath. The other images show different symbols.",
    226: "Correct: Bild 2 shows the European Union flag with yellow stars on blue. The other pictures are not the EU flag.",
    321: "Correct: Bild 4 is Berlin's coat of arms with the bear. The other images are not Berlin's official coat of arms.",
    328: "Correct: Berlin is marked as number 4 on the map. The question is simply asking you to identify Berlin's location."
  };

  function optionList(options, predicate) {
    return options.filter(predicate).map((option) => option.text.replace(/\.$/, ""));
  }

  function findTermNotes(question) {
    const haystack = [question.prompt, ...question.options.map((option) => option.text)].join(" ");
    const notes = [];
    TERM_NOTES.forEach(([term, note]) => {
      if (haystack.includes(term) && !notes.includes(note)) {
        notes.push(note);
      }
    });
    return notes.slice(0, 2);
  }

  function isSimpleVisualQuestion(question) {
    return question.images.length > 0 || /Bild|Wappen|Flagge|Karte/.test(question.prompt);
  }

  function buildExplanation(question) {
    if (SHORT_FACTS[question.id]) {
      return SHORT_FACTS[question.id];
    }

    const correct = optionList(question.options, (option) => option.correct)[0];
    const wrong = optionList(question.options, (option) => !option.correct);
    const notes = findTermNotes(question);
    const wrongText = wrong.length
      ? ` The other options are not correct here: ${wrong.join("; ")}.`
      : "";
    const context = isSimpleVisualQuestion(question)
      ? "This is an identification question, so the correct option is the image or label that matches the official symbol or place."
      : "This matches the rule, institution, date, or civic term asked for in the question.";
    const termText = notes.length ? ` ${notes.join(" ")}` : "";

    return `Correct: ${correct}. ${context}${termText}${wrongText}`;
  }

  function attachExplanations(questions) {
    questions.forEach((question) => {
      question.explanation = buildExplanation(question);
    });
  }

  return { attachExplanations };
})();

window.LID_EXPLANATION_HELPERS.attachExplanations(window.LID_QUESTIONS || []);
