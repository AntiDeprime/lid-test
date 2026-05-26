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
    46: "Building roads and schools is a public infrastructure task. The state and municipalities provide many services that private companies do not simply decide for everyone, such as public roads and public schools. Selling clothes, producing cars, or giving everyone free newspapers are not core state tasks.",
    66: "This question uses Gemeinden to mean Jewish communities, not municipalities. Berlin and Munich have the largest Jewish communities in Germany. The other city pairs may have Jewish history or communities too, but they are not the largest pair asked for here.",
    77: "The Bundeswehr is Germany's armed forces, so the correct answer is the German army. It is separate from the police, which handles internal public safety, and from citizen initiatives, which are voluntary civic groups.",
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
      test: /Eltern|Kinder|Kind|Erziehung|Ehe|verheiratet|Scheidung|Familie|volljährig/,
      note: "For family questions, remember that parents are responsible for children, but adults make their own life choices and the state protects equal rights and child welfare."
    },
    {
      test: /Weihnachten|Ostern|Pfingsten|Advent|Karneval|Rosenmontag|Religion|Christentum|Synagoge/,
      note: "For custom and religion questions, the test usually asks for common German cultural knowledge while still respecting freedom of religion."
    },
    {
      test: /Berlin|Pankow|Regierende|Senator|Stadtstaat/,
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

  const ANSWER_NOTES = [
    [/Religionsunterricht teilnimmt/, "In Germany, religious education has a special constitutional status. Parents may decide about a child's participation until age 14; after that, the child decides on religious matters for themselves."],
    [/Meinungsfreiheit/, "Meinungsfreiheit is a basic right because it protects public and private expression, including political criticism. It is different from voting rights or religious freedom."],
    [/Glaubens- und Gewissensfreiheit/, "This right protects both religious belief and personal conscience. The test often contrasts it with social or economic interests such as work, housing, or entertainment."],
    [/Alle sollen gleich viel Geld haben/, "The Basic Law guarantees equality before the law and basic freedoms, but it does not require everyone to have the same income or wealth."],
    [/die Geldstrafe/, "A Geldstrafe is a lawful criminal penalty decided through legal procedure. Torture, corporal punishment, and the death penalty conflict with human dignity and the Basic Law."],
    [/Zwangsarbeit/, "Forced labor is banned because people may not be compelled to work against their will, except for very narrow civic duties allowed by law."],
    [/Ungleichbehandlung der Bürgerinnen und Bürger durch den Staat/, "The state must treat people equally under the law. Rights such as expression, petitions, and assembly are protected, not forbidden."],
    [/verfassungswidrig/, "A party that aims to abolish democracy and create a dictatorship acts against the constitution. In Germany, defending the free democratic basic order is part of the constitutional system."],
    [/Pressezensur/, "Pressezensur means state control or suppression of the press. It is not a feature of democracy because independent media are needed to inform voters and scrutinize power."],
    [/Presse/, "Germany's three branches of state power are legislative, executive, and judicial. The press is independent and important in democracy, but it is not a branch of state authority."],
    [/Koalition/, "A coalition is formed when parties cooperate to create a governing majority. This is common in Germany because one party often does not win enough seats to govern alone."],
    [/Krankenversicherung/, "Health insurance is part of Germany's social security system. It protects people from major financial risk when they need medical care."],
    [/eine eigene Regierung/, "Because Germany is a federal state, each Bundesland has its own parliament and government. Foreign policy and currency are federal or European matters, not state-level powers."],
    [/Schulpolitik/, "Education policy is mainly a responsibility of the Bundesländer. That is why school rules can differ between German states."],
    [/Bund, Länder und Kommunen/, "Germany's administration is organized across the federal level, the states, and municipalities. This is different from the temporary occupation zones after 1945."],
    [/Gemeinden/, "Gemeinden are the local level of political administration. They handle local public services and are the lowest level in the three-tier structure."],
    [/Frank-Walter Steinmeier/, "Germany's head of state is the Federal President, currently Frank-Walter Steinmeier. This office is separate from the Bundestag presidency, state premiers, and former Federal Presidents."],
    [/Christlich Demokratische Union/, "CDU stands for Christlich Demokratische Union. It is a party name, not an entrepreneurs' club or a generic phrase about Germany."],
    [/Sozialdemokratische Partei Deutschlands/, "SPD stands for Sozialdemokratische Partei Deutschlands. The exact party name matters because the distractors use similar-sounding but unofficial wording."],
    [/Freie Demokratische Partei/, "FDP stands for Freie Demokratische Partei. The distractors are built from plausible political words, so learn the official party name as a fixed abbreviation."],
    [/Bündnis 90\/Die Grünen/, "This is the official name of the Green party in Germany. The name combines the East German civil rights alliance Bündnis 90 with Die Grünen."],
    [/Die Linke/, "Die Linke is the party name. Do not infer the answer from generic political direction alone; the test asks for the official name."],
    [/CDU\/CSU und AfD/, "This question asks for the current largest parliamentary groups, so it can change after Bundestag elections. Learn it as a current-facts item rather than as a permanent rule."],
    [/Bundestag/, "The Bundestag is elected by voters and is Germany's national parliament. It is different from the Bundesrat, which represents state governments."],
    [/Bundesversammlung/, "The Bundesversammlung has one main task: electing the Federal President. It is not a normal lawmaking parliament."],
    [/Bundeswehr/, "The Bundeswehr is Germany's armed forces. It is responsible for military defense, not policing, intelligence surveillance, or citizens' initiatives."],
    [/ein Recht/, "Voting in Germany is a right, not a legal duty. Eligible voters may choose whether to vote."],
    [/Mehrheits- und Verhältniswahlrecht/, "Federal elections combine constituency candidates with proportional party representation. That is why the system is described as both majority and proportional voting."],
    [/frei, gleich, geheim/, "These are core election principles: voters decide freely, each vote has equal value, and the ballot is secret."],
    [/Mindestanteil an Wählerstimmen, um ins Parlament zu kommen/, "The 5 percent threshold is the minimum vote share a party usually needs to enter parliament. It is meant to keep parliament workable by limiting fragmentation."],
    [/viele kleine Parteien die Regierungsbildung erschweren/, "The 5 percent threshold is meant to keep parliament workable. If many very small parties entered parliament, forming stable majorities and governments would become harder."],
    [/eine Wahlbenachrichtigung von der Gemeinde/, "Before an election, eligible voters receive an official notice from their municipality. It tells them where and when they can vote."],
    [/Man kann durch Briefwahl seine Stimme abgeben/, "Postal voting is allowed in Germany. It lets eligible voters cast their ballot without going to the polling station on election day."],
    [/entscheidet mit Richterinnen\/Richtern über Schuld und Strafe/, "A Schöffin or Schöffe is a lay judge. They sit with professional judges in some criminal cases and help decide guilt and punishment."],
    [/arbeitet an einem Gericht und spricht Urteile/, "A judge's core task is to decide legal cases at court and issue judgments. Legal advice is the work of lawyers, and official documents are often handled by administrative offices."],
    [/Judikative|rechtsprechenden Gewalt|Recht sprechen/, "Judges belong to the judicial branch. Their role is to apply the law independently, not to govern, legislate, or carry out police work."],
    [/die Einhaltung von Gesetzen zu überwachen/, "Police help enforce laws and protect public safety. They do not make laws, run the country, or replace courts."],
    [/den Holocaust leugnen/, "Denying the Holocaust is antisemitic because it rejects the Nazi genocide of Jews. Visiting a Jewish festival or criticizing a government is not automatically antisemitic."],
    [/Ende des Zweiten Weltkriegs in Europa/, "8 May 1945 marks the end of the Second World War in Europe and the defeat of Nazi Germany. It is not a date for German reunification or an election."],
    [/der Zweite Weltkrieg/, "The war from 1939 to 1945 was the Second World War. Keeping major dates straight helps separate Nazi-era questions from Cold War and reunification questions."],
    [/das Attentat auf Hitler am 20. Juli 1944/, "Stauffenberg is remembered for the 20 July 1944 assassination attempt against Hitler. The question is about resistance to National Socialism, not sport or architecture."],
    [/Jüdische Geschäfte und Synagogen werden durch Nationalsozialisten und ihre Anhänger zerstört/, "9 November 1938 refers to the November pogroms, when Nazis and supporters attacked Jewish shops and synagogues. It is a key date in Nazi persecution of Jews."],
    [/USA, Sowjetunion, Großbritannien, Frankreich/, "After the Second World War, these four powers occupied Germany. Their occupation zones shaped the later division into the Federal Republic and the GDR."],
    [/sowjetischen Besatzungszone/, "The GDR was founded in the Soviet occupation zone. The western zones developed into the Federal Republic of Germany."],
    [/der Europäischen Union \(EU\)/, "Germany was a founding member of the European integration project that became the EU. NATO and the Warsaw Pact were military alliances, not the answer here."],
    [/Einheit/, "The Day of German Unity on 3 October commemorates German reunification in 1990. It is Germany's national holiday."],
    [/Willy Brandt/, "Willy Brandt, Chancellor from 1969 to 1974, is closely associated with Ostpolitik and the treaties with Eastern Europe. These policies aimed to reduce Cold War tensions."],
    [/Bundesrepublik Deutschland/, "Germany's full official name is Bundesrepublik Deutschland. The name points to a federal republic, not a monarchy or a loose confederation."],
    [/Dänemark|Tschechien/, "Neighbor-country questions are geography facts. Germany borders Denmark in the north and Czechia to the east."],
    [/das Abitur/, "The Abitur is the school-leaving qualification normally required for university study in Germany. It is different from vocational qualifications or lower secondary certificates."],
    [/einem Abendgymnasium/, "An Abendgymnasium is an evening school where adults can earn the Abitur. It is designed for people who want to continue education after regular school age."],
    [/Türkei/, "Many people with a migration background in Germany have roots in Turkey, especially because of labor migration agreements and family migration after the 1960s."],
    [/Westerwaldkreis|Neunkirchen/, "District-name questions test local geography within the selected Bundesland. The other options are real or plausible districts from other states."],
    [/richtet sich nach Angebot und Nachfrage, aber der Staat sorgt für einen sozialen Ausgleich/, "The social market economy combines market competition with social protection. Prices and supply are shaped by markets, while the state helps balance social risks."],
    [/Ministerpräsidentin\/Ministerpräsident/, "In most Bundesländer, the head of the state government is called Ministerpräsidentin or Ministerpräsident. City-states can use different titles."],
    [/Regierende Bürgermeisterin\/Regierender Bürgermeister/, "Berlin's head of government is called the Governing Mayor because Berlin is both a city and a federal state."],
    [/Außenministerin\/Außenminister|Senatorin\/Senator für Außenbeziehungen/, "Foreign policy is handled at the federal level, so a Bundesland does not have its own foreign minister. State governments have portfolios such as interior, justice, and finance."],
    [/Landeszentrale für politische Bildung|Landesbeauftragten für politische Bildung/, "The state political education office is the public source for civic education and political information. It is different from consumer advice, churches, or local public-order offices."],
    [/Landkreis|Kreis|Vogtlandkreis|Wartburgkreis|Börde|Nordfriesland|Rhein-Sieg-Kreis|Uckermark|Prignitz|Altötting|Ammerland|Mecklenburgische Seenplatte/, "District-name questions test local geography within the selected Bundesland. The other options are real or plausible districts from other states."],
    [/weiß|rot|grün|blau|gelb|schwarz/, "Flag-color questions are memorization items for the selected Bundesland. The distractors often reuse colors from other state flags."],
    [/^3$|^4$|^5$|^6$|^14$|^16$|^18$|^20$/, "Number questions usually test a fixed legal or civic fact. Check whether the prompt asks about years, voting age, or a count before choosing."]
  ];

  const PROMPT_NOTES = [
    [/Staatsoberhaupt/, "Staatsoberhaupt means head of state. In Germany that is the Federal President, while the Chancellor leads the federal government."],
    [/Wappen gehört zum (Bundesland|Freistaat)|Welches Wappen/, "For coat-of-arms questions, compare the official state symbol shown in the image. These are state symbols, not federal institutions."],
    [/Welches Bundesland ist/, "Map questions ask you to recognize the selected Bundesland by location. Learn each state with its position and neighboring states."],
    [/Für wie viele Jahre wird der Landtag/, "State parliaments are elected for fixed legislative terms. In these state questions, the expected answer is the current term length for that Bundesland."],
    [/Ab welchem Alter darf man .* Kommunalwahlen wählen/, "Kommunalwahlen are local elections. Voting age can differ by Bundesland, so this is a state-specific fact."],
    [/Welche Farben hat die Landesflagge/, "A Landesflagge is the state flag, not the German federal flag. The answer is the color combination used by that Bundesland."],
    [/Welche Ministerin\/welchen Minister hat .* nicht|Welche Senatorin\/welchen Senator hat .* nicht/, "The word \"nicht\" makes this an exception question. Choose the ministry portfolio that does not exist at state level."],
    [/Wie nennt man die Regierungschefin\/den Regierungschef/, "This asks for the title of the head of a state government. Most states use Ministerpräsidentin or Ministerpräsident; Berlin, Hamburg, and Bremen have city-state titles."],
    [/Landeshauptstadt/, "Landeshauptstadt means state capital. This is a direct geography fact for the selected Bundesland."],
    [/Abkürzung/, "Abbreviation questions are best learned as fixed official names; the wrong answers often differ by only one political-sounding word."],
    [/Alliierte Besatzungsmächte/, "Allied occupation powers refers to the countries that controlled occupation zones in Germany after the Second World War."],
    [/Bundeswehr/, "Bundeswehr means Germany's armed forces. The test contrasts external defense with police work and civic participation."],
    [/soziale Sicherheit|Sozialversicherung|Pflegeversicherung|Krankenversicherung|Rentenversicherung|Arbeitslosenversicherung/, "Social-security questions are about public insurance systems that protect against illness, care needs, unemployment, accidents, and old age."],
    [/Schulwesen|Schulpolitik|Schule/, "School policy is a major responsibility of the Bundesländer, even though the Basic Law sets the broader constitutional framework."],
    [/Nationalsozial|Drittes Reich|Hitler|Holocaust|Synagogen|8\. Mai 1945|9\. November 1938|1939 bis 1945|20\. Juli 1944/, "Nazi-era questions test dictatorship, persecution, war, and resistance. Separate these dates from the Cold War and reunification timeline."],
    [/DDR|Besatzungszone|Montagsdemonstrationen|Wir sind das Volk|Wiedervereinigung|Warschauer Pakt/, "GDR questions belong to the Cold War period: two German states existed from 1949 until reunification in 1990."],
    [/Gericht|Richter|Schöff|Polizei|Strafe|Urteile/, "Legal-system questions separate police, courts, judges, lawyers, and lay judges. Each has a different role in the rule of law."]
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
      .filter(([term]) => promptAndCorrect.includes(term))
      .map(([term, note]) => ({
        term,
        note,
        rank: promptAndCorrect.includes(term) ? 0 : 1
      }))
      .filter((item, index, items) => {
        if (item.term === "Partei" && allText.includes("Parteien")) return false;
        if (item.term === "Gemeinden" && /jüdischen Gemeinden/.test(promptAndCorrect)) return false;
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

  function matchingAnswerNotes(question, limit = 2) {
    const correct = correctOption(question);
    if (!correct) return [];
    const source = clean(correct.text);
    return unique(ANSWER_NOTES.filter(([pattern]) => pattern.test(source)).map(([, note]) => note)).slice(0, limit);
  }

  function matchingPromptNotes(question, limit = 1) {
    const source = question.prompt;
    return PROMPT_NOTES.filter(([pattern]) => pattern.test(source)).map(([, note]) => note).slice(0, limit);
  }

  function isNegativeQuestion(question) {
    return /\b(nicht|kein|keine|keinen|keinem|keiner|verboten|abschaffen|darf nicht)\b/i.test(question.prompt);
  }

  function isVisualQuestion(question) {
    return question.images.length > 0 || /\b(Bild|Wappen|Flagge|Karte)\b/.test(question.prompt);
  }

  function isDateOrNumberQuestion(question) {
    return /Wann|In welchem Jahr|Seit wann|Wie lange|Jahre|Alter|ab welchem Alter|wie viele|wie viel|Anzahl/i.test(question.prompt);
  }

  function isPersonOrGroupQuestion(question) {
    return /\b(Wer|Wen|Welche Person)\b|Präsident|Kanzler|Bürgermeister|Arbeitnehmer|Abgeordnete/i.test(question.prompt);
  }

  function isPlaceOrOfficeQuestion(question) {
    return /Wo|Wohin|Bei wem|Welche Behörde|Amt|Gericht|wohin/i.test(question.prompt);
  }

  function openingFor(question, correct) {
    if (isVisualQuestion(question)) {
      return `${quoted(correct.text)} matches the official symbol, map position, building, or image label asked for here.`;
    }

    if (isNegativeQuestion(question)) {
      if (/abschaffen/i.test(question.prompt)) {
        return `This question asks whether a protected democratic right can simply be abolished; ${quoted(correct.text)} is the answer because basic rights bind the state.`;
      }

      if (/verbietet|verboten/i.test(question.prompt)) {
        return `This question asks what German law or the Basic Law forbids, so ${quoted(correct.text)} is the prohibited item.`;
      }

      if (/\bnicht\b/i.test(question.prompt)) {
        return `Because the wording says "not", ${quoted(correct.text)} is the option that does not belong.`;
      }

      return `This question asks for an exception or limit, so ${quoted(correct.text)} is the option that does not fit the rule.`;
    }

    if (/Was bedeutet|Was ist damit gemeint|Wofür steht|Was versteht man/i.test(question.prompt)) {
      return `${quoted(correct.text)} is the definition the test is looking for.`;
    }

    if (isPersonOrGroupQuestion(question)) {
      return `${quoted(correct.text)} is the person, group, or office with the role asked about here.`;
    }

    if (isDateOrNumberQuestion(question)) {
      return `${quoted(correct.text)} is the date, number, or fixed fact the question is testing.`;
    }

    if (isPlaceOrOfficeQuestion(question)) {
      return `${quoted(correct.text)} is the responsible place or institution for this situation.`;
    }

    return `${quoted(correct.text)} fits the exact concept asked for in the question.`;
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

    return "";
  }

  function buildExplanation(question) {
    if (SPECIFIC_EXPLANATIONS[question.id]) {
      return SPECIFIC_EXPLANATIONS[question.id];
    }

    const correct = correctOption(question);
    if (!correct) return "";

    const answerNotes = matchingAnswerNotes(question);
    const promptNotes = matchingPromptNotes(question);
    const termNotes = matchingTermNotes(question, answerNotes.length || promptNotes.length ? 1 : 2);
    const topicNotes = matchingTopicNotes(question, promptNotes.length ? 0 : 1);
    const wrongExplanation = answerNotes.length && promptNotes.length ? "" : explainWrongOptions(question);

    const parts = [
      openingFor(question, correct),
      ...answerNotes,
      ...promptNotes,
      ...termNotes,
      ...topicNotes,
      wrongExplanation
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
