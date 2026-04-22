const AGES = [
  {
    id: 'stone',
    name: 'Stone Age',
    color: '#9c8060',
    essenceThreshold: 0,
    knowledgeThreshold: 0,
    tribeMaxPop: 60,
    tribeMaxTech: 2,
    tribeMilitaryScale: 1,
    yearStart: 1,
    yearEnd: 500,
    description: 'Primitive clans clash with stone tools.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons'],
  },
  {
    id: 'bronze',
    name: 'Bronze Age',
    color: '#c07a30',
    essenceThreshold: 300,
    knowledgeThreshold: 80,
    tribeMaxPop: 200,
    tribeMaxTech: 5,
    tribeMilitaryScale: 2.5,
    yearStart: 501,
    yearEnd: 1200,
    description: 'Metal forged. Cities rise. Armies march.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot'],
  },
  {
    id: 'iron',
    name: 'Iron Age',
    color: '#708090',
    essenceThreshold: 1200,
    knowledgeThreshold: 250,
    tribeMaxPop: 600,
    tribeMaxTech: 10,
    tribeMilitaryScale: 5,
    yearStart: 1201,
    yearEnd: 2500,
    description: 'Iron dominates. Empires begin to form.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','manipulate_weather','kidnap_scientist','forge_evidence'],
  },
  {
    id: 'classical',
    name: 'Classical Age',
    color: '#e8d080',
    essenceThreshold: 3500,
    knowledgeThreshold: 600,
    tribeMaxPop: 2000,
    tribeMaxTech: 18,
    tribeMilitaryScale: 10,
    yearStart: 2501,
    yearEnd: 5000,
    description: 'Philosophy, trade, and conquest define the era.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','manipulate_weather','kidnap_scientist','forge_evidence','poison_wells','corrupt_general','inspire_prophet'],
  },
  {
    id: 'medieval',
    name: 'Medieval Age',
    color: '#6080b0',
    essenceThreshold: 10000,
    knowledgeThreshold: 1500,
    tribeMaxPop: 8000,
    tribeMaxTech: 30,
    tribeMilitaryScale: 20,
    yearStart: 5001,
    yearEnd: 10000,
    description: 'Feudal lords and cathedrals. Black death and crusades.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','manipulate_weather','kidnap_scientist','forge_evidence','poison_wells','corrupt_general','inspire_prophet','plague_release','economic_sabotage','spy_network'],
  },
  {
    id: 'renaissance',
    name: 'Renaissance',
    color: '#d4c060',
    essenceThreshold: 35000,
    knowledgeThreshold: 4000,
    tribeMaxPop: 30000,
    tribeMaxTech: 50,
    tribeMilitaryScale: 40,
    yearStart: 10001,
    yearEnd: 20000,
    description: 'Art, science, gunpowder. The world expands.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','manipulate_weather','kidnap_scientist','forge_evidence','poison_wells','corrupt_general','inspire_prophet','plague_release','economic_sabotage','spy_network','gunpowder_accident','navigation_error','religious_schism'],
  },
  {
    id: 'industrial',
    name: 'Industrial Age',
    color: '#808898',
    essenceThreshold: 120000,
    knowledgeThreshold: 12000,
    tribeMaxPop: 200000,
    tribeMaxTech: 80,
    tribeMilitaryScale: 100,
    yearStart: 20001,
    yearEnd: 50000,
    description: 'Steam and steel. Mass production. Total war.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','manipulate_weather','kidnap_scientist','forge_evidence','corrupt_general','plague_release','economic_sabotage','spy_network','gunpowder_accident','religious_schism','factory_sabotage','propaganda','arms_deal'],
  },
  {
    id: 'atomic',
    name: 'Atomic Age',
    color: '#60c870',
    essenceThreshold: 500000,
    knowledgeThreshold: 50000,
    tribeMaxPop: 2000000,
    tribeMaxTech: 150,
    tribeMilitaryScale: 500,
    yearStart: 50001,
    yearEnd: 999999,
    description: 'The atom splits. Mutually assured destruction.',
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','manipulate_weather','kidnap_scientist','forge_evidence','corrupt_general','plague_release','economic_sabotage','spy_network','propaganda','arms_deal','nuclear_scare','cyber_disruption','satellite_interference'],
  },
];

function getAgeByYear(year) {
  for (let i = AGES.length - 1; i >= 0; i--) {
    if (year >= AGES[i].yearStart) return AGES[i];
  }
  return AGES[0];
}

function getAgeIndex(ageId) {
  return AGES.findIndex(a => a.id === ageId);
}

function getNextAge(currentAgeId) {
  const idx = getAgeIndex(currentAgeId);
  return idx < AGES.length - 1 ? AGES[idx + 1] : null;
}
