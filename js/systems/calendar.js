// Calendar helper — converts raw tick count into a structured calendar object.
// Accessed globally as `getCalendar(ticks)`.
/**
 * One-line summary.
 *
 * @description MANDATORY detailed explanation (2-5 sentences).
 *
 * @workflow
 * 1. Specific numbered steps
 * 2. Include conditionals and loops
 *
 * @param {Type} name - Description
 * @returns {Type} Description
 *
 * @dependencies stateManager.get(), etc.
 * @modifies What state/DOM changes
 * @triggers When/how called
 * @performance O(n) complexity notes
 */
function getCalendar(ticks) {
  const TPD = CONFIG.TICKS_PER_DAY;
  const DPM = CONFIG.DAYS_PER_MONTH;
  const MPY = CONFIG.MONTHS_PER_YEAR;
  const DPY = CONFIG.DAYS_PER_YEAR;

  const timePeriodIdx = ticks % TPD;
  const totalDays     = Math.floor(ticks / TPD);
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  const dayInMonth    = (totalDays % DPM) + 1;
  const monthIdx      = Math.floor(totalDays / DPM) % MPY;
  const month         = monthIdx + 1;
  const year          = TimeDilation.getYearFromDays(totalDays);

  let season;
  if      (month <= 3)  season = CONFIG.SEASON.SPRING;
  else if (month <= 6)  season = CONFIG.SEASON.SUMMER;
  else if (month <= 9)  season = CONFIG.SEASON.AUTUMN;
  else                  season = CONFIG.SEASON.WINTER;

  return {
    timePeriodIdx,
    timePeriodName: CONFIG.TIME_PERIOD_NAMES[timePeriodIdx],
    day:       totalDays + 1,
    dayInMonth,
    month,
    monthName: CONFIG.MONTH_NAMES[monthIdx],
    year,
    season,
    seasonName: season.charAt(0).toUpperCase() + season.slice(1),
  };
}
