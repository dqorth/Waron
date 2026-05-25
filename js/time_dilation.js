/**
 * Configuration parameters for the dynamic time dilation system.
 */
const TIME_DILATION_CONFIG = {
  /**
   * Set to false to bypass time dilation and return the simulation to baseline speed
   * (linear calculation of years where 1 year is always 351 days).
   * @type {boolean}
   */
  enabled: true,

  /**
   * Chronologically ordered breakpoints mapping simulation years to custom year lengths (daysPerYear).
   * - yearStart: The calendar year at which this scaling begins.
   * - yearEnd: The calendar year at which this scaling ends (null for the final era).
   * - daysPerYear: The number of simulation days required to advance 1 year in this era.
   * @type {Array<{yearStart: number, yearEnd: number|null, daysPerYear: number}>}
   */
  checkpoints: [
    { yearStart: 1,     yearEnd: 500,   daysPerYear: 12 },  // Stone Age: 1 day = 10 years
    { yearStart: 501,   yearEnd: 1200,  daysPerYear: 16 },  // Bronze Age: 1 day = 5 years
    { yearStart: 1201,  yearEnd: 2500,  daysPerYear: 20 },  // Iron Age: 1 day = 2 years
    { yearStart: 2501,  yearEnd: 5000,  daysPerYear: 40 },  // Classical Age: 1 day = 1 year
    { yearStart: 5001,  yearEnd: 10000, daysPerYear: 80 },  // Medieval Age: 5 days = 1 year
    { yearStart: 10001, yearEnd: 20000, daysPerYear: 160 }, // Renaissance: 20 days = 1 year
    { yearStart: 20001, yearEnd: 50000, daysPerYear: 210 }, // Industrial Age: 50 days = 1 year
    { yearStart: 50001, yearEnd: null,  daysPerYear: 351.0 } // Atomic Age+: standard 351 days = 1 year
  ]
};

/**
 * Handles processing of time dilation checkpoints and mapping simulation days to virtual years.
 */
const TimeDilation = {
  /**
   * Internal pre-calculated day thresholds for fast lookups.
   * @type {Array<object>}
   */
  _processedCheckpoints: [],

  /**
   * Translates the raw checkpoints into processed entries with pre-calculated day ranges.
   * 
   * @description This initialization method iterates over the configured checkpoints and calculates the exact simulation day bounds (`dayStart` and `dayEnd`) for each era. This eliminates the need to recursively recalculate offsets on every single game tick.
   * 
   * @workflow
   * 1. Initialize a day counter `currentDayOffset` to 0.
   * 2. Iterate through the array of configuration checkpoints.
   * 3. For each checkpoint, determine the number of years spanned.
   * 4. Multiply years by `daysPerYear` to find the total simulation days spanned by that era.
   * 5. Store the calculated start day and end day bounds in a new processed checkpoint object.
   * 6. Increment the day counter by the era's day span.
   * 7. Save the processed checkpoints list internally.
   * 
   * @returns {void}
   * 
   * @dependencies TIME_DILATION_CONFIG
   * @modifies this._processedCheckpoints
   * @triggers Automatically called on the first execution of `getYearFromDays`.
   * @performance O(N) where N is the number of era checkpoints. Run once as setup.
   */
  init() {
    let currentDayOffset = 0;
    this._processedCheckpoints = TIME_DILATION_CONFIG.checkpoints.map(cp => {
      const yearSpan = cp.yearEnd ? (cp.yearEnd - cp.yearStart + 1) : Infinity;
      const daySpan = yearSpan === Infinity ? Infinity : yearSpan * cp.daysPerYear;
      
      const processed = {
        yearStart: cp.yearStart,
        yearEnd: cp.yearEnd,
        daysPerYear: cp.daysPerYear,
        dayStart: currentDayOffset,
        dayEnd: currentDayOffset + daySpan
      };
      
      currentDayOffset += daySpan;
      return processed;
    });
  },

  /**
   * Calculates the virtual calendar year based on the total accumulated days of simulation.
   * 
   * @description If time dilation is disabled, it falls back to a standard linear calculation using the configured days per year. If enabled, it identifies the active era checkpoint matching the simulation day, calculates the fractional years elapsed in that era, and adds it to the era's starting year.
   * 
   * @workflow
   * 1. If `TIME_DILATION_CONFIG.enabled` is false, calculate and return `totalDays / CONFIG.DAYS_PER_YEAR + 1`.
   * 2. If `_processedCheckpoints` is empty, call `this.init()`.
   * 3. Loop through each processed checkpoint:
   *    a. If `totalDays` falls within `cp.dayStart` (inclusive) and `cp.dayEnd` (exclusive):
   *       i. Find `daysInCurrentEra` by subtracting `cp.dayStart` from `totalDays`.
   *       ii. Calculate `yearsElapsedInEra` by dividing `daysInCurrentEra` by `cp.daysPerYear` and flooring.
   *       iii. Return the starting year of the era plus the years elapsed.
   * 4. Return 1 as a fallback if no checkpoint matches.
   * 
   * @param {number} totalDays - The total number of days elapsed in the simulation.
   * @returns {number} The current virtual calendar year (1-indexed).
   * 
   * @dependencies TIME_DILATION_CONFIG, CONFIG.DAYS_PER_YEAR, this.init()
   * @modifies None
   * @triggers Called on every game tick to update the calendar display and age-related logic.
   * @performance O(C) where C is the number of era checkpoints (typically very small, ~8).
   */
  getYearFromDays(totalDays) {
    if (!TIME_DILATION_CONFIG.enabled) {
      return Math.floor(totalDays / CONFIG.DAYS_PER_YEAR) + 1;
    }

    if (this._processedCheckpoints.length === 0) {
      this.init();
    }

    for (const cp of this._processedCheckpoints) {
      if (totalDays >= cp.dayStart && totalDays < cp.dayEnd) {
        const daysInCurrentEra = totalDays - cp.dayStart;
        const yearsElapsedInEra = Math.floor(daysInCurrentEra / cp.daysPerYear);
        return cp.yearStart + yearsElapsedInEra;
      }
    }

    return 1;
  }
};
