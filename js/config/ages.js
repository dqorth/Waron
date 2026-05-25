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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption'],
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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption','manipulate_weather','kidnap_scientist','forge_evidence','incite_hatred'],
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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption','manipulate_weather','kidnap_scientist','forge_evidence','incite_hatred','poison_wells','corrupt_general','inspire_prophet','broker_peace'],
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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption','manipulate_weather','kidnap_scientist','forge_evidence','incite_hatred','poison_wells','corrupt_general','inspire_prophet','broker_peace','plague_release','economic_sabotage','spy_network','break_treaty'],
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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption','manipulate_weather','kidnap_scientist','forge_evidence','incite_hatred','corrupt_general','broker_peace','plague_release','economic_sabotage','spy_network','break_treaty','gunpowder_accident','navigation_error','religious_schism'],
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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption','manipulate_weather','kidnap_scientist','forge_evidence','incite_hatred','corrupt_general','broker_peace','plague_release','economic_sabotage','spy_network','break_treaty','gunpowder_accident','religious_schism','factory_sabotage','propaganda','arms_deal'],
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
    actions: ['sabotage_food','eliminate_leader','plant_agent','boost_research','cause_disease','gift_weapons','false_treaty','territorial_dispute','incite_riot','trade_disruption','manipulate_weather','kidnap_scientist','forge_evidence','incite_hatred','corrupt_general','broker_peace','plague_release','economic_sabotage','spy_network','break_treaty','propaganda','arms_deal','nuclear_scare','cyber_disruption','satellite_interference'],
  },
];

/**
 * Retrieves the historical age object corresponding to a given year.
 *
 * @description This function iterates through the `AGES` array in reverse order to find the correct historical age. It checks if the provided year falls within or after the `yearStart` of an age. This approach ensures that if a year falls into the range of a later age, that specific age is returned, otherwise it defaults to the earliest age.
 *
 * @workflow
 * 1. Initialize a loop counter `i` to `AGES.length - 1` (the last index of the `AGES` array).
 * 2. Continue the loop as long as `i` is greater than or equal to `0`.
 * 3. In each iteration, check if the input `year` is greater than or equal to `AGES[i].yearStart`.
 * 4. If the condition is true, return the `AGES[i]` object immediately.
 * 5. If the loop completes without finding a matching age (i.e., the year is before the `yearStart` of the first age), return `AGES[0]` (the Stone Age).
 *
 * @param {number} year - The specific year for which to find the corresponding historical age.
 * @returns {object} The age object from the `AGES` array that encompasses the given year, or the first age (`AGES[0]`) if no later age matches.
 *
 * @dependencies AGES (global constant array).
 * @modifies None.
 * @triggers Called when a specific historical age needs to be determined based on a year, likely for displaying game state or applying year-based logic.
 * @performance O(n) where `n` is the number of ages in the `AGES` array, as it iterates through the array in the worst case.
 */
function getAgeByYear(year) {
  for (let i = AGES.length - 1; i >= 0; i--) {
    if (year >= AGES[i].yearStart) return AGES[i];
  }
  return AGES[0];
}

/**
 * Finds the index of an age in the `AGES` array based on its unique ID.
 *
 * @description This utility function searches the `AGES` array for an age object whose `id` property matches the provided `ageId`. It leverages the `findIndex` method for efficient searching. This is useful for internal operations that require an age's position within the ordered list.
 *
 * @workflow
 * 1. Call the `findIndex` method on the global `AGES` array.
 * 2. Pass a callback function `a => a.id === ageId` to `findIndex`.
 * 3. The callback compares the `id` property of each age object (`a`) with the input `ageId`.
 * 4. `findIndex` returns the index of the first element for which the callback returns true, or -1 if no element satisfies the condition.
 *
 * @param {string} ageId - The unique identifier of the age to find (e.g., 'stone', 'bronze').
 * @returns {number} The zero-based index of the age in the `AGES` array, or -1 if the `ageId` is not found.
 *
 * @dependencies AGES (global constant array).
 * @modifies None.
 * @triggers Called internally by other functions (e.g., `getNextAge`) that need to locate an age by its ID to perform subsequent operations.
 * @performance O(n) where `n` is the number of ages in the `AGES` array, as `findIndex` iterates through the array in the worst case.
 */
function getAgeIndex(ageId) {
  return AGES.findIndex(a => a.id === ageId);
}

/**
 * Retrieves the next chronological age object following a given current age.
 *
 * @description This function first determines the index of the `currentAgeId` using `getAgeIndex`. It then checks if there is an age at the subsequent index in the `AGES` array. If the current age is not the last age in the sequence, it returns the next age object; otherwise, it returns `null` to indicate that no further age exists.
 *
 * @workflow
 * 1. Call `getAgeIndex` with `currentAgeId` to get the index of the current age. Store this in `idx`.
 * 2. Check if `idx` is less than `AGES.length - 1`. This condition verifies if the current age is not the last age in the array.
 * 3. If the condition is true, return the age object at `AGES[idx + 1]`.
 * 4. If the condition is false (meaning `idx` is the last index or `currentAgeId` was not found), return `null`.
 *
 * @param {string} currentAgeId - The ID of the current historical age.
 * @returns {object|null} The next chronological age object, or `null` if the current age is the last one in the sequence or the `currentAgeId` is invalid.
 *
 * @dependencies AGES (global constant array), getAgeIndex.
 * @modifies None.
 * @triggers Called when advancing the game's historical epoch or displaying information about the upcoming age.
 * @performance O(n) due to the call to `getAgeIndex`, where `n` is the number of ages in the `AGES` array.
 */
function getNextAge(currentAgeId) {
  const idx = getAgeIndex(currentAgeId);
  return idx < AGES.length - 1 ? AGES[idx + 1] : null;
}
