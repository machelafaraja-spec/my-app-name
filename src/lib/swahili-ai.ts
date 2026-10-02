interface KnowledgeEntry {
  keywords: string[];
  response: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ['homa', 'joto', 'temperatures', 'fever', 'baridi'],
    response: 'Kwa homa, unashauriwa kunywa maji mengi, kupumzika, na kutumia Paracetamol (500mg) mara tatu kwa siku. Ikiwa homa itaendelea kwa zaidi ya siku 3 au iwe juu ya 38.5°C, tafadhali muone daktari haraka. Homa inaweza kuwa ishara ya malaria, maambukizi ya koo, au maambukizi mengine.',
  },
  {
    keywords: ['kikohozi', 'cough', 'kokwa', 'kikohozi kavu'],
    response: 'Kwa kikohozi, unaweza kutumia dawa za kupunguza kikohozi na kunywa chai ya asali na limao. Pumzika na epuka moshi. Ikiwa kikohozi kitaendelea kwa zaidi ya wiki mbili, kuna damu, au kuna shida ya kupumua, muone daktari. Kikohozi cha muda mrefu kinaweza kuwa ishara ya kifua kikuu (TB).',
  },
  {
    keywords: ['maumivu ya kichwa', 'headache', 'kichwa kuuma', 'migraine'],
    response: 'Kwa maumivu ya kichwa, jaribu kupumzika katika chumba chenye giza na utulivu. Unaweza kutumia Paracetamol au Ibuprofen. Epuka mwanga mkali na sauti kubwa. Ikiwa maumivu yanaendelea, yanaambatana na kizunguzungu au kutapika, au ni ya mara kwa mara, muone daktari kwa uchunguzi zaidi.',
  },
  {
    keywords: ['maumivu ya tumbo', 'stomach pain', 'tumbo kuuma', 'kichwa cha tumbo', 'diarrhea', 'kuhara'],
    response: 'Kwa maumivu ya tumbo na kuhara, unashauriwa kunywa maji mengi au ORS ili kuepuka upungufu wa maji mwilini. Epuka chakula chenye mafuta na pilipili. Ikiwa kuhara kuna damu, homa ya juu, au kitaendelea zaidi ya siku 2, muone daktari. Inaweza kuwa maambukizi ya tumbo, typhoid, au kipindupindu.',
  },
  {
    keywords: ['malaria', 'mbu', 'homa ya malaria', 'malaria test'],
    response: 'Dalili za malaria ni homa, kichwa kuuma, maumivu ya misuli, na kushinda kusika. Ikiwa una dalili hizi, fanya vipimo vya malaria (mRDT) kwenye kituo cha afya haraka. Malaria ni hatari ikiwa haijatibiwa. Dawa ya kawaida ni ALu (Artemether/Lumefantrine). Hakikisha unalala chini cha chandarua ili kuepuka kungatwa na mbu.',
  },
  {
    keywords: ['sukari', 'diabetes', 'sukari kwenye damu', 'blood sugar'],
    response: 'Ugonjwa wa kisukari unahitaji udhibiti wa lishe, mazoezi, na dawa kama ilivyoagizwa. Pima sukari yako mara kwa mara. Epuka vyakula vyenye sukari nyingi na wanga. Kwa wagonjwa wa kisukari cha aina ya 2, Metformin ni dawa ya kawaida. Muone daktari kwa mpango wa matibabu maalum.',
  },
  {
    keywords: ['shinikizo la damu', 'hypertension', 'blood pressure', 'sukari na shinikizo'],
    response: 'Shinikizo la damu (hypertension) linaweza kudhibitiwa kwa kupunguza chumvi, kula matunda na mboga, fanya mazoezi, na kuepuka msongo wa mawazo. Pima shinikizo la damu mara kwa mara. Dawa za kawaida ni Amlodipine au Atenolol. Ikiwa shinikizo ni la juu sana, muone daktari haraka.',
  },
  {
    keywords: ['kifua kikuu', 'tb', 'tuberculosis', 'kikohozi cha muda mrefu'],
    response: 'Kifua kikuu (TB) ni ugonjwa wa kuambukiza unaoathiri mapafu. Dalili ni kikohozi cha muda mrefu (zaidi ya wiki 2), makohozi yaliyochanganyika na damu, kupungua uzito, kusika jioni, na kusika. Kuna matibabu ya bure Tanzania (DOTS). Ikiwa una dalili hizi, nenda kituo cha afya kwa vipimo na matibabu.',
  },
  {
    keywords: ['mimba', 'mja mzito', 'pregnancy', 'ujauzito', 'mtoto'],
    response: 'Kwa mja mzito, ni muhimu kuhudhuria kliniki kwa wajawazito mara kwa mara (angalau mara 4 wakati wa ujauzito). Kula chakula chenye virutubisho, fanya mazoezi madogo, na chukua vidonge vya asidi ya foliki na chuma. Epuka uvutaji sigara na pombe. Ikiwa una damu kutokea, maumivu makali ya tumbo, au kushuka kwa kasi ya mtoto, nenda hospitali haraka.',
  },
  {
    keywords: ['mtoto', 'watoto', 'child', 'mtoto mgonjwa', 'homa ya mtoto'],
    response: 'Ikiwa mtoto ana homa, hakikisha ananywa maji mengi. Tumia Paracetamol kwa kipimo kinachofaa kulingana na umri. Ikiwa mtoto ana homa ya juu, anakataa kula na kunywa, anaicheza kifua, au ana mtetemo, muone daktari haraka. Watoto wadogo chini ya miezi 2 wenye homa wanapaswa kuonwa na daktari mara moja.',
  },
  {
    keywords: ['usingizi', 'insomnia', 'kusingizia', 'shida ya kulala'],
    response: 'Kwa shida ya usingizi, jaribu kwenda kulala wakati mmoja kila siku, epuka simu na TV kabla ya kulala, punguza kafeini jioni, na weka chumba chako kiwe giza na baridi. Ikiwa usingizi unaendelea kuwa shida kwa wiki mbili au zaidi, muone daktari.',
  },
  {
    keywords: ['msongo', 'stress', 'wasiwasi', 'anxiety', 'depression', 'huzuni'],
    response: 'Msongo wa mawazo na wasiwasi ni hali ya kawaida. Zungumza na mtu unaemuamini, fanya mazoezi, na shiriki shughuli unazopenda. Ikiwa unahisi huzuni kubwa, huna matumaini, au unapoteza nia, tafadhali omba msaada wa kitaalamu. Afya ya akili ni muhimu kama ilivyo afya ya mwili.',
  },
  {
    keywords: ['chanjo', 'vaccination', 'immunization', 'chanjo ya mtoto'],
    response: 'Chanjo ni muhimu sana kwa kuzuia magonjwa. Watoto wanapaswa kupokea chanjo kulingana na ratiba ya Tanzania (BCB, DPT-HepB-Hib, Polio, Pneumococcal, Rotavirus, Measles, HPV). Watu wazima wanaweza kupokea chanjo ya homa ya mafua (flu) na nyongo. Nenda kituo cha afya kwa maelezo zaidi kuhusu chanjo zinazofaa.',
  },
  {
    keywords: ['lishe', 'chakula', 'nutrition', 'vitamin', 'kukosa hamu ya kula'],
    response: 'Lishe nzuri ni msingi wa afya. Kula chakula chenye usawa: wanga, protini, matunda, mboga, na mafuta mema. Epuka vyakula vyenye sukari nyingi na chumvi nyingi. Kunywa maji angalau lita 2 kwa siku. Kwa watoto, hakikisha wanapata chakula chenye protini na vitamini kuzuia utapiamlo.',
  },
  {
    keywords: ['dawa', 'medication', 'side effects', 'athari za dawa'],
    response: 'Dawa zinapaswa kutumika kama ilivyoagizwa na daktari. Usivunje kozi ya dawa hata kama unahisi nafuu. Dawa zingine zina athari zinaweza kutokea kama kutapika, kizunguzungo, au rash. Ikiwa unaathari za kushangaza, simuonia daktari. Usichanganya dawa bila ushauri wa kitaalamu.',
  },
  {
    keywords: ['daktari', 'hospital', 'kituo cha afya', 'clinic', 'kuonwa'],
    response: 'Ni muhimu kuonwa na daktari ikiwa una dalili zifuatazo: homa ya juu kwa zaidi ya siku 3, maumivu makali yasiyoisha, kupoteza fahari, kutapika damu, kupumua kwa shida, au dalili zozote zinazokera. Nenda kituo cha afya kilicho karibu nawe. Afya yako ni muhimu zaidi ya chochote.',
  },
  {
    keywords: ['covid', 'korona', 'covid-19'],
    response: 'Dalili za COVID-19 ni homa, kikohozi, kushinda kusika, na kupoteza hamu ya harufu. Ikiwa una dalili, jifunike nyumbani, vaa barakasi, na fanya kipimo. Chanjo ya COVID-19 inapatikana Tanzania. Ikiwa dalili ni nzito kama kupumua kwa shida, nenda hospitali.',
  },
  {
    keywords: ['jipende', 'afya', 'kinga', 'prevent', 'usuibu'],
    response: 'Kwa afya njema: 1) Kula chakula bora na lishe nzuri, 2) Fanya mazoezi angalau dakika 30 kwa siku, 3) Pumzika vya kutosha (saa 7-8), 4) Epuka uvutaji sigara na pombe, 5) Pima afya yako mara kwa mara, 6) Nawa mikono kwa sabuni na maji, 7) Kunywa maji mengi, 8) Punguza msongo wa mawazo. Afya ni utajiri!',
  },
];

const GREETINGS = [
  'Jambo! Karibu kwenye AfyaApp. Habari yako? Niambie unahisi vipi leo.',
  'Karibu! Mimi ni msaidizi wako wa afya. Niambile shida yako na nitakusaidia.',
  'Habari! Niko hapa kukusaidia kuhusu maswala ya afya. Uliza swali lolote.',
];

const FALLBACK_RESPONSES = [
  'Samahani, sielewi vizuri swali lako. Unaweza kueleze zaidi? Kwa mfano, unahisi vipi mwilini?',
  'Tafadhali nieleze zaidi kuhusu unachohisi. Una maumivu mahali popote? Homa? Kikohozi?',
  'Sijapata kuelewa vizuri. Unaweza kuniambia dalili zako kwa Kiswahili? Kwa mfano: "Nina homa na kikohozi."',
];

export function getSwahiliResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim();

  if (lower.length < 3 || /^(jambo|habari|hi|hello|mambo|vipi|sasa|vipi)/i.test(lower)) {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }

  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.response;
  }

  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

export const QUICK_QUESTIONS = [
  'Nina homa na kikohozi',
  'Maumivu ya kichwa',
  'Maumivu ya tumbo',
  'Ninawezaje kujikinga na malaria?',
  'Dalili za kisukari',
  'Lishe nzuri kwa afya',
];
