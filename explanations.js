window.LID_EXPLANATION_HELPERS = (() => {
  "use strict";

  const SPECIFIC_EXPLANATIONS = {
    1: "In Germany, people are allowed to criticize the government because freedom of opinion is protected by the Basic Law. This means you may express political opinions publicly, including online, in conversations, or at demonstrations. Paying taxes and having the right to vote are important, but they are not the reason people may openly criticize the government. Religious freedom protects belief and religion, not political criticism.",
    3: "A Rechtsstaat means that everyone is bound by law: citizens, residents, public offices, police, courts, and the government itself. The state cannot simply act however it wants. If an authority makes a decision, there must be a legal basis, and people can challenge unfair decisions in court. The answer \"only Germans must obey the law\" is wrong because laws apply to everyone living in Germany.",
    14: "Freedom of opinion means you may express your views publicly, including on the internet, even if others disagree with you or your opinion criticizes the government. But this freedom has limits: it does not allow insults, threats, false claims about specific people, or banned extremist symbols. That is why insulting people on the street and publicly wearing banned extremist symbols are not protected answers.",
    21: "Bild 1 shows the Bundesadler, the Federal Eagle, which is Germany's coat of arms. The eagle is used by federal institutions such as the Bundestag and federal ministries. The other pictures may look official, but they are not the federal coat of arms.",
    29: "The eagle is Germany's heraldic animal and appears in the federal coat of arms. The bear is strongly associated with Berlin, the lion and horse appear in other regional symbols, but they are not the national symbol of Germany.",
    40: "The German national anthem begins with \"Einigkeit und Recht und Freiheit\". These words mean unity, justice, and freedom, three central ideas of the Federal Republic. The other answer choices are not the opening line of today's official anthem.",
    55: "The picture shows the Reichstag building in Berlin, where the Bundestag meets. The Bundestag is Germany's federal parliament and passes federal laws. It is different from the Bundesrat, which represents the federal states, and from the Chancellery, where the Chancellor works.",
    130: "In this voting example, candidate 1 has the most votes, so candidate 1 wins. For this question you do not need a special political rule; you only need to compare the numbers shown in the image. The other candidates have fewer votes.",
    176: "After the Second World War, Germany was divided into occupation zones controlled by Great Britain, the Soviet Union, the USA, and France. The map in the question labels those four zones in that order. This is background for understanding the later division into West Germany and the GDR.",
    209: "Bild 4 shows the GDR coat of arms: hammer, compass, and a wreath of grain. The GDR was East Germany from 1949 to 1990. The other images show different symbols and are not the official GDR emblem.",
    226: "Bild 2 shows the European Union flag: twelve yellow stars on a blue background. The number of stars does not change with the number of EU member states; it is a fixed symbol of unity and solidarity. The other pictures are not the EU flag.",
    288: "Germany's special responsibility toward Israel comes from the crimes committed against Jews under National Socialism, especially the Holocaust. This responsibility is historical and political: Germany remembers these crimes, protects Jewish life, and maintains a special relationship with Israel. EU membership, Christian tradition, and the Basic Law are important in other contexts, but they are not the reason asked for here.",
    321: "Bild 4 is Berlin's coat of arms: a black bear on a white shield. The bear is Berlin's best-known city symbol and also appears on Berlin's state flag. The other images are not Berlin's official coat of arms.",
    328: "Berlin is marked as number 4 on the map. Berlin is a city-state in eastern Germany and is surrounded by Brandenburg. This question is only asking you to identify Berlin's location, not to name a neighboring state."
  };

  const TERM_NOTES = [
    ["Bundestag", "The Bundestag is Germany's national parliament. Voters elect it, and it passes federal laws, elects the Chancellor, debates government policy, and controls the federal government."],
    ["Bundesregierung", "The Bundesregierung is the federal government: the Chancellor plus the federal ministers. It proposes policy and runs the federal administration, but it is not the same as parliament."],
    ["Bundesrat", "The Bundesrat represents the governments of the 16 federal states. It takes part in federal lawmaking, especially when state responsibilities or finances are affected."],
    ["Bundespräsident", "The Bundespräsident is the head of state. The role is mostly representative; day-to-day political leadership belongs to the Chancellor and the federal government."],
    ["Bundeskanz", "The Bundeskanzler or Bundeskanzlerin leads the federal government, chooses ministers, and sets the main direction of government policy."],
    ["Bundesversammlung", "The Bundesversammlung is a special assembly that meets to elect the Federal President. It is not a regular parliament for passing laws."],
    ["Bundesverfassungsgericht", "The Bundesverfassungsgericht is Germany's highest constitutional court. It checks whether laws and state action follow the Basic Law."],
    ["Grundgesetz", "The Grundgesetz is Germany's constitution. It protects basic rights and defines how democratic institutions must work."],
    ["Verfassung", "A Verfassung is a constitution: the highest legal framework of a state. In Germany, the federal constitution is called the Grundgesetz."],
    ["Rechtsstaat", "A Rechtsstaat is a state governed by law. Public authorities need a legal basis for their actions, and people can defend their rights in court."],
    ["Meinungsfreiheit", "Meinungsfreiheit protects the right to express opinions, including criticism of the state. It does not protect insults, threats, deliberate false claims about people, or banned extremist symbols."],
    ["Pressefreiheit", "Pressefreiheit protects independent journalism. The state may not simply abolish or control the press because it dislikes criticism."],
    ["Religionsfreiheit", "Religionsfreiheit means people may choose, change, practice, or reject a religion."],
    ["Glaubens- und Gewissensfreiheit", "Glaubens- und Gewissensfreiheit protects religious belief, personal conscience, and the decision not to believe."],
    ["Menschenwürde", "Menschenwürde means human dignity. Article 1 of the Basic Law protects every person from being treated as less than human."],
    ["Gleichbehandlung", "Gleichbehandlung means equal treatment. It is the idea behind protection from discrimination, for example because of origin, skin color, gender, disability, or religion."],
    ["Freizügigkeit", "Freizügigkeit means freedom of movement and the right to choose where to live within Germany."],
    ["Asyl", "Asyl is protection for people persecuted in another country. That is why this basic right specifically concerns foreigners."],
    ["Republik", "A republic has an elected head of state. Germany is a republic because it has a Federal President, not a monarch."],
    ["Monarchie", "A monarchy has a king, queen, or similar hereditary ruler. Germany is not a monarchy."],
    ["Diktatur", "A dictatorship concentrates power and does not allow free democratic control, real opposition, or free elections."],
    ["Bundesstaat", "A Bundesstaat is a federal state. Power is shared between the federal level and the Bundesländer."],
    ["Zentralstaat", "A Zentralstaat keeps most political power at the national level. Germany is not organized this way because the states have their own powers."],
    ["Staatenbund", "A Staatenbund is a loose alliance of independent states. Germany itself is a federal state, not a loose alliance."],
    ["Staatenverbund", "Staatenverbund is often used for a union of states, especially the European Union, not for Germany's internal structure."],
    ["Sozialstaat", "A Sozialstaat supports people through systems such as health insurance, pensions, unemployment insurance, social assistance, and family support."],
    ["Sozialversicherung", "Sozialversicherung is Germany's social insurance system. Workers and employers usually pay contributions for health, pension, care, accident, and unemployment insurance."],
    ["Sozialabgaben", "Sozialabgaben are social security contributions, not normal sales tax. They finance systems such as health, pension, care, and unemployment insurance."],
    ["Partei", "A political party is an organization that competes in elections and tries to influence government policy. Parties connect voters, candidates, parliament, and government."],
    ["Parteien", "Political parties compete in elections and form parliamentary groups, coalitions, or opposition. They are central to Germany's representative democracy."],
    ["Koalition", "A coalition is cooperation between parties to form a government, usually because one party does not have a majority alone."],
    ["Fraktion", "A Fraktion is a parliamentary group, usually made up of members from the same party or allied parties. It organizes work inside parliament."],
    ["Opposition", "The opposition consists of parliament members and parties that are not part of the governing coalition. Their job is to criticize and control the government."],
    ["5%-Hürde", "The 5 percent threshold means a party usually needs at least five percent of the vote to enter parliament. It is meant to prevent too many very small parties from fragmenting parliament."],
    ["Legislative", "The legislative branch makes laws. In Germany this is mainly parliament, especially the Bundestag at federal level."],
    ["Exekutive", "The executive branch applies laws and runs administration. It includes the government, ministries, authorities, and police."],
    ["Judikative", "The judicial branch is the court system. Judges decide legal disputes and criminal cases independently."],
    ["Direktive", "Direktive is not one of Germany's three branches of state power. The three are legislative, executive, and judicial."],
    ["Landtag", "A Landtag is the parliament of a federal state. It makes state laws and elects or controls the state government."],
    ["Landtagswahl", "A Landtagswahl elects the parliament of a federal state, not the federal Bundestag."],
    ["Bundesländer", "The Bundesländer are Germany's 16 federal states. They have their own parliaments, governments, and responsibilities, especially for schools, police, and culture."],
    ["Gemeinden", "Gemeinden are municipalities, the local level of government. They deal with many everyday local matters."],
    ["Kommunen", "Kommunen are municipalities and districts. They handle local public services such as registration offices, local roads, and many social services."],
    ["Ordnungsamt", "The Ordnungsamt is a local public order office. It belongs to municipal administration and deals with local rules, permits, and public order issues."],
    ["Auswärtiges Amt", "The Auswärtiges Amt is the federal foreign office. It handles foreign policy and embassies, not local municipal tasks."],
    ["Bürgerinitiative", "A Bürgerinitiative is a citizens' initiative. People organize one when they want to influence a concrete local or political issue."],
    ["Briefwahl", "Briefwahl means postal voting. It lets eligible voters vote without going to the polling station on election day."],
    ["Wahlbenachrichtigung", "A Wahlbenachrichtigung is the official election notice. It tells eligible voters when and where they can vote."],
    ["aktives Wahlrecht", "Aktives Wahlrecht means the right to vote. Passives Wahlrecht means the right to stand as a candidate."],
    ["Wahlhelfer", "Wahlhelferinnen and Wahlhelfer help run elections, for example by checking voter lists and counting votes. It is an honorary civic duty."],
    ["Arbeitsgericht", "The Arbeitsgericht is the labor court. It handles disputes between employees and employers, such as dismissals or unpaid wages."],
    ["Kündigungsschutzklage", "A Kündigungsschutzklage is a legal claim against dismissal. It is filed at the labor court if an employee believes the termination is unlawful."],
    ["Kündigungsfrist", "A Kündigungsfrist is the notice period. It is the time that must pass between giving notice and the employment ending."],
    ["Betriebsrat", "A Betriebsrat is a works council elected by employees. It represents employee interests inside a company."],
    ["Rechtsanw", "A Rechtsanwalt or Rechtsanwältin gives legal advice and can represent people in court."],
    ["Schöff", "A Schöffe or Schöffin is a lay judge. Lay judges are ordinary citizens who help professional judges decide some criminal cases."],
    ["Prozess", "A Prozess is a court trial or legal proceeding. Courts decide according to law, not according to private revenge."],
    ["Synagoge", "A synagogue is a Jewish house of prayer and community life."],
    ["Holocaust", "The Holocaust was the Nazi genocide of European Jews. Denying or approving Nazi crimes is not protected as normal political opinion in Germany."],
    ["Nationalsozial", "National Socialism was the Nazi dictatorship in Germany from 1933 to 1945. It destroyed democracy and committed mass crimes."],
    ["Drittes Reich", "The Third Reich means the Nazi dictatorship from 1933 to 1945, not a democratic period."],
    ["DDR", "DDR means German Democratic Republic, the East German state that existed from 1949 to 1990. Despite its name, it was not a free parliamentary democracy."],
    ["GDR", "GDR means German Democratic Republic, the East German state that existed from 1949 to 1990."],
    ["Stasi", "The Stasi was the GDR's Ministry for State Security. It was a secret police and surveillance service."],
    ["Warschauer Pakt", "The Warsaw Pact was the Soviet-led military alliance during the Cold War. The GDR belonged to it, while West Germany belonged to NATO."],
    ["NATO", "NATO is the Western defense alliance. West Germany joined NATO; the GDR did not."],
    ["Planwirtschaft", "A planned economy is controlled mainly by the state. The GDR used this system instead of a free market economy."],
    ["soziale Marktwirtschaft", "The social market economy combines market competition with social protection. It is the economic model of the Federal Republic of Germany."],
    ["Römischen Verträge", "The Treaties of Rome founded the European Economic Community, an important predecessor of today's European Union."],
    ["Europäische Union", "The European Union is a political and economic union of European states. EU citizens also elect the European Parliament."],
    ["Europäischen Parlament", "The European Parliament is elected directly by EU citizens. It is not the same as the German Bundestag."],
    ["Elterngeldstelle", "The Elterngeldstelle is the office where parents apply for parental allowance after a child is born."],
    ["Jugendamt", "The Jugendamt is the youth welfare office. It supports families and is responsible for protecting children."],
    ["Einwohnermeldeamt", "The Einwohnermeldeamt registers residents and address changes. In Germany, people normally must register where they live."],
    ["Standesamt", "The Standesamt handles civil status matters such as marriages, births, and deaths."],
    ["Mutterschutz", "Mutterschutz protects pregnant employees and mothers around childbirth, for example through employment protection and health rules."],
    ["Briefgeheimnis", "Briefgeheimnis protects the privacy of letters and mail. Opening someone else's letter without permission violates this right."],
    ["Widerspruch", "A Widerspruch is a formal objection to an administrative decision, for example from an authority."],
    ["Einspruch", "An Einspruch is a formal objection, often against a tax assessment or other official notice."],
    ["Kirchensteuer", "Kirchensteuer is church tax. Members of certain churches pay it together with wage or income tax."],
    ["Adventszeit", "Advent is the four-week period before Christmas."],
    ["Gastarbeiter", "Gastarbeiterinnen and Gastarbeiter were foreign workers recruited by West Germany, especially from the 1950s and 1960s."],
    ["Regierende Bürgermeister", "In Berlin, the head of government is called the Governing Mayor. This is because Berlin is a city-state."],
    ["Senator", "In Berlin, senators are members of the state government responsible for areas such as finance, interior, justice, or education."],
    ["Stadtstaat", "A Stadtstaat is both a city and a federal state. Berlin, Hamburg, and Bremen are Germany's city-states."]
  ];

  const TOPIC_NOTES = [
    {
      test: /Grundrecht|Grundrechten|Menschenwürde|Meinungsfreiheit|Pressefreiheit|Religionsfreiheit|Glaubens|Asyl|Gleichbehandlung|Freizügigkeit|Briefgeheimnis/,
      note: "For exam questions about basic rights, focus on what the Basic Law protects against state interference and where the right has limits."
    },
    {
      test: /Wahl|wählen|Stimm|Kandidat|Partei|Parteien|Koalition|Opposition|Fraktion|5%-Hürde/,
      note: "For election and party questions, remember that Germany uses representative democracy: voters choose parties and candidates, and elected representatives form governments, coalitions, or opposition."
    },
    {
      test: /Bundestag|Bundesrat|Bundesregierung|Bundeskanz|Bundespräsident|Bundesversammlung|Minister|Parlament/,
      note: "For institution questions, separate parliament, government, courts, and state representation. Many wrong answers mix up these bodies."
    },
    {
      test: /Gericht|Richter|Rechtsanw|Arbeitsgericht|Prozess|Klage|Schöff|Strafe|Polizei/,
      note: "For legal questions, remember that disputes and punishments are handled through courts and legal procedures, not by private revenge or arbitrary state action."
    },
    {
      test: /DDR|Nationalsozial|Drittes Reich|Holocaust|Stasi|Mauer|Warschauer Pakt|Wiedervereinigung|1949|1933|1945|1990/,
      note: "For history questions, keep the timeline clear: Nazi dictatorship from 1933 to 1945, two German states from 1949, and reunification in 1990."
    },
    {
      test: /EU|Europäische|Europa|Römischen Verträge|Euro/,
      note: "For Europe questions, distinguish German federal institutions from EU institutions. The European Parliament is elected by EU citizens, while the Bundestag is Germany's national parliament."
    },
    {
      test: /Jugendamt|Standesamt|Einwohnermeldeamt|Ordnungsamt|Finanzamt|Behörde|Amt|Elterngeldstelle/,
      note: "For everyday administration questions, pay attention to which office is responsible: registration, family support, public order, taxes, or civil status."
    },
    {
      test: /Arbeit|Arbeitgeber|Arbeitnehmer|Kündigung|Betriebsrat|Mutterschutz|Versicherung|Sozialabgaben|Gehalt|Lohn/,
      note: "For work questions, separate employment rights, social insurance, taxes, and company representation. The test often checks which protection or office applies in a concrete work situation."
    },
    {
      test: /Eltern|Kinder|Kind|Erziehung|Schule|Ehe|verheiratet|Scheidung|Familie|volljährig/,
      note: "For family questions, remember that parents are responsible for children, but adults make their own life choices and the state protects equal rights and child welfare."
    },
    {
      test: /Weihnachten|Ostern|Pfingsten|Advent|Karneval|Rosenmontag|Religion|Christentum|Synagoge/,
      note: "For custom and religion questions, the test usually asks for common German cultural knowledge while still respecting freedom of religion."
    },
    {
      test: /Berlin|Pankow|Regierende|Senator|Stadtstaat|Landesflagge|Wappen/,
      note: "For Berlin questions, remember that Berlin is both a city and a federal state, so its institutions have city-state names such as Governing Mayor and Senate."
    }
  ];

  const WRONG_OPTION_NOTES = [
    [/Steuern|Steuer|Kirchensteuer/, "Taxes are a funding or administration topic; they usually do not explain political rights unless the question specifically asks about tax."],
    [/Wahlrecht|wählen|Wahl/, "Voting rights matter for elections, but they are not the same as basic freedoms such as speech, religion, or press freedom."],
    [/Bundesrat/, "The Bundesrat represents state governments; it is often a wrong answer when the question is about the elected national parliament or the federal government."],
    [/Bundestag/, "The Bundestag is parliament, so it is not the same as the federal government, the courts, or the Federal President."],
    [/Bundesregierung/, "The federal government runs policy, but it does not replace parliament, courts, or the Federal President."],
    [/Polizei/, "Police enforce laws, but they do not make laws and do not replace courts."],
    [/Gericht|Gerichte/, "Courts apply and review the law; they do not normally make the political decisions asked about in election or government questions."],
    [/Gewalt|Selbstjustiz|Faustrecht|Prügel|Folter|Todesstrafe|Zwangsarbeit/, "Answers involving private violence, torture, forced labor, or arbitrary punishment conflict with the Basic Law and the rule of law."],
    [/Diktatur|Nationalsozial|Drittes Reich|Stasi/, "Dictatorship-related answers are usually traps when the question asks about democratic Germany."],
    [/Monarchie|König|Kaiser/, "Germany is a republic, so answers involving a monarch do not fit today's political system."],
    [/NATO|Warschauer Pakt/, "NATO and the Warsaw Pact are military alliances; they are often used as traps in questions about the Cold War or the GDR."],
    [/EU|Europäische Union|Europäischen Parlament/, "EU institutions are different from German federal institutions, even when both are democratic."],
    [/Ordnungsamt|Einwohnermeldeamt|Standesamt|Jugendamt|Finanzamt/, "German offices have narrow responsibilities, so the correct answer depends on the exact life situation in the question."],
    [/Ministerpräsident|Oberbürgermeister|Senatspräsident/, "Berlin uses special city-state titles. Its head of government is the Governing Mayor, not a Minister-President."]
  ];

  function clean(text) {
    return text.replace(/\s+/g, " ").replace(/\.$/, "").trim();
  }

  function sentence(text) {
    const trimmed = clean(text);
    if (!trimmed) return "";
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  }

  function quoted(text) {
    return `"${clean(text)}"`;
  }

  function haystack(question) {
    return [question.prompt, ...question.options.map((option) => option.text)].join(" ");
  }

  function correctOption(question) {
    return question.options.find((option) => option.correct);
  }

  function wrongOptions(question) {
    return question.options.filter((option) => !option.correct);
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function matchingTermNotes(question, limit = 2) {
    const promptAndCorrect = [question.prompt, correctOption(question)?.text || ""].join(" ");
    const allText = haystack(question);
    const ranked = TERM_NOTES
      .filter(([term]) => allText.includes(term))
      .map(([term, note]) => ({
        term,
        note,
        rank: promptAndCorrect.includes(term) ? 0 : 1
      }))
      .filter((item, index, items) => {
        if (item.term === "Partei" && allText.includes("Parteien")) return false;
        return items.findIndex((candidate) => candidate.note === item.note) === index;
      })
      .sort((a, b) => a.rank - b.rank);

    return ranked.map((item) => item.note).slice(0, limit);
  }

  function matchingTopicNotes(question, limit = 1) {
    const text = haystack(question);
    return TOPIC_NOTES.filter((topic) => topic.test.test(text)).map((topic) => topic.note).slice(0, limit);
  }

  function matchingWrongNotes(question, limit = 2) {
    const wrongText = wrongOptions(question).map((option) => option.text).join(" ");
    return unique(
      WRONG_OPTION_NOTES.filter(([pattern]) => pattern.test(wrongText)).map(([, note]) => note)
    ).slice(0, limit);
  }

  function isNegativeQuestion(question) {
    return /\b(nicht|kein|keine|keinen|keinem|keiner|verboten|abschaffen|darf nicht)\b/i.test(question.prompt);
  }

  function isVisualQuestion(question) {
    return question.images.length > 0 || /Bild|Wappen|Flagge|Karte/.test(question.prompt);
  }

  function isDateOrNumberQuestion(question) {
    return /Wann|In welchem Jahr|Seit wann|Wie lange|Jahre|Alter|ab welchem Alter|wie viele|wie viel|Anzahl/i.test(question.prompt);
  }

  function isPersonOrGroupQuestion(question) {
    return /Wer|Wen|Welche Person|Präsident|Kanzler|Bürgermeister|Arbeitnehmer|Abgeordnete/i.test(question.prompt);
  }

  function isPlaceOrOfficeQuestion(question) {
    return /Wo|Wohin|Bei wem|Welche Behörde|Amt|Gericht|wohin/i.test(question.prompt);
  }

  function openingFor(question, correct) {
    if (isVisualQuestion(question)) {
      return `The correct answer is ${quoted(correct.text)} because that image or label matches the official symbol, map, or place asked for in the question.`;
    }

    if (isNegativeQuestion(question)) {
      if (/abschaffen/i.test(question.prompt)) {
        return `This question asks whether a protected democratic right can simply be abolished. The correct answer is ${quoted(correct.text)}.`;
      }

      if (/verbietet|verboten/i.test(question.prompt)) {
        return `This question asks what German law or the Basic Law forbids. The correct answer is ${quoted(correct.text)}.`;
      }

      if (/\bnicht\b/i.test(question.prompt)) {
        return `Because the wording says "not", look for the answer that does not belong. The correct answer is ${quoted(correct.text)}.`;
      }

      return `This question is asking for the exception, the limit, or the option that is not correct. The correct answer is ${quoted(correct.text)}.`;
    }

    if (/Was bedeutet|Was ist damit gemeint|Wofür steht|Was versteht man/i.test(question.prompt)) {
      return `${quoted(correct.text)} is the definition the test is looking for.`;
    }

    if (isPersonOrGroupQuestion(question)) {
      return `The correct person or office is ${quoted(correct.text)}.`;
    }

    if (isDateOrNumberQuestion(question)) {
      return `The correct fact to remember is ${quoted(correct.text)}.`;
    }

    if (isPlaceOrOfficeQuestion(question)) {
      return `The responsible place or institution is ${quoted(correct.text)}.`;
    }

    return `The correct answer is ${quoted(correct.text)}.`;
  }

  function explainWrongOptions(question) {
    const wrong = wrongOptions(question).map((option) => clean(option.text));
    if (!wrong.length) return "";

    if (wrong.some((text) => /alle|immer|müssen|nur|nie/i.test(text))) {
      return "Be careful with absolute wording such as \"always\", \"only\", or \"everyone must\"; these answers often go too far for German law and civic rules.";
    }

    if (isNegativeQuestion(question)) {
      return "The other choices may describe real rights, institutions, or customs, but they are not the exception asked for here.";
    }

    const notes = matchingWrongNotes(question);
    if (notes.length) {
      return notes.join(" ");
    }

    if (isVisualQuestion(question)) {
      return "The other pictures or labels are distractors, so compare the symbol, flag, map position, or building carefully.";
    }

    if (isDateOrNumberQuestion(question)) {
      return "The other numbers are plausible-looking distractors, so this is a fact to memorize rather than infer from the wording.";
    }

    if (isPersonOrGroupQuestion(question)) {
      return "The other choices name different people, groups, or offices, but they do not have the responsibility asked for in this question.";
    }

    if (isPlaceOrOfficeQuestion(question)) {
      return "The other choices may be real places or offices, but they handle different situations.";
    }

    const conciseWrong = wrong.slice(0, 2).map(quoted).join(" and ");
    return `The tempting wrong answers, such as ${conciseWrong}, point to a different right, institution, date, or everyday rule than the one asked for here.`;
  }

  function buildExplanation(question) {
    if (SPECIFIC_EXPLANATIONS[question.id]) {
      return SPECIFIC_EXPLANATIONS[question.id];
    }

    const correct = correctOption(question);
    if (!correct) return "";

    const parts = [
      openingFor(question, correct),
      ...matchingTermNotes(question),
      ...matchingTopicNotes(question),
      explainWrongOptions(question)
    ];

    return unique(parts).map(sentence).join(" ");
  }

  function attachExplanations(questions) {
    questions.forEach((question) => {
      question.explanation = buildExplanation(question);
    });
  }

  return { attachExplanations, buildExplanation };
})();

window.LID_EXPLANATION_HELPERS.attachExplanations(window.LID_QUESTIONS || []);
