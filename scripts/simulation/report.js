// Report for the balance simulation: aggregates the run results per bot and formats them as text.

import {CHALLENGE_DEFINITIONS, CHALLENGE_MOODS, HEADER_RESOURCES, HQ_TYPES} from '@/js/engine/constants.js'
import {calibrateChallenge} from './calibration.js'
import {MILESTONE_SECONDS, RESULT_SUCCESS} from './run_recorder.js'

const SECONDS_PER_MINUTE = 60
const REFERENCE_BOT = 'average' // Bot whose colony stats feed the reference table
const REFERENCE_DECIMALS = 2 // Decimals kept in the reference table

// Colony stats copied into the reference table (numbers, plus the stock and net rate per resource)
const REFERENCE_FIELDS = [
  'elapsed',
  'hqTier',
  'hqLevel',
  'workers',
  'workersCap',
  'storageCap',
  'productionValue',
  'faithRate',
  'armyUnits',
  'researchCount',
  'buildingLevels',
  'altar',
  'temple',
  'monument',
  'territoryFree',
  'constructionMult',
]

// Figures the sanity check compares between the bots
const SANITY_FIELDS = [
  'hqTier',
  'researchCount',
  'productionValue',
]

// Done criteria thresholds (todo/dynamic_challenges.md)
const WEAK_MAX_ATTEMPTS = 2 // Weak bot: attempts per challenge, on every seed
const AVERAGE_RUN_MINUTES = [
  105,
  135,
] // Average bot: median run length range
const AVERAGE_MAX_FAILURES = 2 // Average bot: failures per run allowed on most seeds…
const AVERAGE_FAILURE_SEED_SHARE = 0.9 // …on at least this share of the seeds
const AVERAGE_SPARE_SHARE = [
  0.2,
  0.6,
] // Average bot: median time left on the timer per challenge (successful attempts)
const STRONG_MIN_MET_SHARE = 0.5 // Strong bot: median time to first meet the requirements, as a share of the timer

/**
 * Challenge rows of a bot whose median spare share is outside a range.
 * @param {Object} report - Report from buildReport
 * @param {string} name - Bot name
 * @param {number} min - Lowest median spare share
 * @param {number} max - Highest median spare share
 * @returns {number[]} Challenge indexes outside the range (missing ones included)
 */
function spareShareOutliers(report, name, min, max) {
  return report.bots[name].challenges
    .filter(row => row.medianSpareShare === null || row.medianSpareShare < min || row.medianSpareShare > max)
    .map(row => row.index)
}

// Done criteria checked with SIM_ASSERT; each needs every bot it names in the run (unmet otherwise)
export const DONE_CRITERIA = [
  {
    description: `Weak bot: finishes every seed with at most ${WEAK_MAX_ATTEMPTS} attempts per challenge`,
    check: report => Boolean(report.bots.weak) && report.bots.weak.finished === report.bots.weak.runs && report.bots.weak.maxAttempts <= WEAK_MAX_ATTEMPTS,
  },
  {
    description: `Average bot: median run length ${AVERAGE_RUN_MINUTES[0]}–${AVERAGE_RUN_MINUTES[1]} minutes`,
    check: report => {
      const length = report.bots.average?.runLength.median
      return typeof length === 'number' && length >= AVERAGE_RUN_MINUTES[0] * SECONDS_PER_MINUTE && length <= AVERAGE_RUN_MINUTES[1] * SECONDS_PER_MINUTE
    },
  },
  {
    description: `Average bot: at most ${AVERAGE_MAX_FAILURES} failures on ${AVERAGE_FAILURE_SEED_SHARE * 100}% of the seeds`,
    check: report => {
      const bot = report.bots.average
      if (!bot) {
        return false
      }
      const runs = Object.entries(bot.failureCounts).filter(([failures]) => Number(failures) <= AVERAGE_MAX_FAILURES).reduce((sum, [
        , count,
      ]) => sum + count, 0)
      return runs >= bot.runs * AVERAGE_FAILURE_SEED_SHARE
    },
  },
  {
    description: `Average bot: median time left on the timer ${AVERAGE_SPARE_SHARE[0] * 100}–${AVERAGE_SPARE_SHARE[1] * 100}% on every challenge`,
    check: report => Boolean(report.bots.average) && report.bots.average.challenges.length === CHALLENGE_DEFINITIONS.length
      && spareShareOutliers(report, 'average', ...AVERAGE_SPARE_SHARE).length === 0,
  },
  {
    description: 'Strong bot: finishes every seed without a failure',
    check: report => Boolean(report.bots.strong) && report.bots.strong.finished === report.bots.strong.runs && report.bots.strong.failuresPerRun === 0,
  },
  {
    description: `Strong bot: median time to first meet the requirements at least ${STRONG_MIN_MET_SHARE * 100}% of the timer on every challenge`,
    check: report => Boolean(report.bots.strong) && report.bots.strong.challenges.length === CHALLENGE_DEFINITIONS.length
      && spareShareOutliers(report, 'strong', 0, 1 - STRONG_MIN_MET_SHARE).length === 0,
  },
  {
    description: 'HQ tier, research and production at 30/60/90 min order the bots weak < average < strong',
    check: report => report.sanity.length > 0 && report.sanity.every(row => row.ordered === true),
  },
]

/**
 * Value at a share of the sorted values, interpolating between neighbours.
 * @param {number[]} values - Values (any order)
 * @param {number} share - 0 to 1 (0.5 = median)
 * @returns {number|null} Percentile, or null without values
 */
export function percentile(values, share) {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((first, second) => first - second)
  const position = (sorted.length - 1) * share
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

/**
 * Median of the values.
 * @param {number[]} values - Values
 * @returns {number|null} Median, or null without values
 */
export function median(values) {
  return percentile(values, 0.5)
}

/**
 * Mean of the values.
 * @param {number[]} values - Values
 * @returns {number|null} Mean, or null without values
 */
function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Per-challenge figures for one bot: how many runs reached it, attempts, first-try success,
 * completions, median time from countdown start to requirements met, median spare share of the
 * successful attempts, and how
 * the engine scaled the countdowns: median amount, level and timer scales, attempts per mood and
 * backstopped attempts.
 * @param {Object[]} runs - Run results
 * @returns {Object[]} One row per challenge index reached by any run
 */
function challengeRows(runs) {
  const indexes = [...new Set(runs.flatMap(run => run.attempts.map(attempt => attempt.index)))].sort((first, second) => first - second)
  return indexes.map(index => {
    const attempts = runs.flatMap(run => run.attempts.filter(attempt => attempt.index === index))
    const resolvedFirst = attempts.filter(attempt => attempt.attempt === 1 && attempt.result)
    const met = attempts.filter(attempt => attempt.firstMetSeconds !== null)
    const succeeded = attempts.filter(attempt => attempt.result === RESULT_SUCCESS)
    // Countdowns the engine scaled (challenges without a definition have no scales)
    const scaled = attempts.filter(attempt => attempt.countdownStartTime !== null && attempt.scales)
    const scaleMedian = kind => median(scaled.map(attempt => attempt.scales[kind]).filter(value => value !== null))
    const moods = Object.fromEntries(CHALLENGE_MOODS.map(mood => [
      mood,
      0,
    ]))
    for (const attempt of scaled) {
      moods[attempt.mood] = (moods[attempt.mood] ?? 0) + 1
    }
    return {
      index: index,
      runsReached: runs.filter(run => run.attempts.some(attempt => attempt.index === index)).length,
      attempts: attempts.filter(attempt => attempt.result).length,
      firstTrySuccessRate: resolvedFirst.length === 0 ? null : resolvedFirst.filter(attempt => attempt.result === RESULT_SUCCESS).length / resolvedFirst.length,
      completedRuns: runs.filter(run => run.attempts.some(attempt => attempt.index === index && attempt.result === RESULT_SUCCESS)).length,
      medianTimeToMeet: median(met.map(attempt => attempt.firstMetSeconds)),
      // Successful attempts only: a failed one that met the requirements and lost them again left no time to spare
      medianSpareShare: median(succeeded.map(attempt => attempt.spareShare)),
      medianAmountScale: scaleMedian('amounts'),
      medianLevelScale: scaleMedian('levels'),
      medianTimeoutScale: scaleMedian('timeout'),
      moods: moods,
      backstops: scaled.filter(attempt => attempt.backstop).length,
    }
  })
}

/**
 * Median colony figures at each milestone, over the runs still going at that time.
 * @param {Object[]} runs - Run results
 * @returns {Object<string, Object>} Figures keyed by milestone second
 */
function milestoneRows(runs) {
  const rows = {}
  for (const milestone of MILESTONE_SECONDS) {
    const stats = runs.map(run => run.milestones[milestone]).filter(Boolean)
    rows[milestone] = {
      runs: stats.length,
      hqTier: median(stats.map(entry => entry.hqTier)),
      researchCount: median(stats.map(entry => entry.researchCount)),
      productionValue: median(stats.map(entry => entry.productionValue)),
      workers: median(stats.map(entry => entry.workers)),
      buildingLevels: median(stats.map(entry => entry.buildingLevels)),
    }
  }
  return rows
}

/**
 * Runs per failure count.
 * @param {Object[]} runs - Run results
 * @returns {Object<string, number>} Number of runs by failures per run
 */
function failureCounts(runs) {
  const counts = {}
  for (const run of runs) {
    counts[run.failures] = (counts[run.failures] ?? 0) + 1
  }
  return counts
}

/**
 * Aggregates one bot's runs.
 * @param {Object[]} runs - Run results
 * @returns {Object} Bot summary
 */
function summarizeBot(runs) {
  const finished = runs.filter(run => run.finished)
  const lengths = finished.map(run => run.runLength)
  const stuckAt = {}
  for (const run of runs.filter(entry => !entry.finished)) {
    stuckAt[run.stuckAt] = (stuckAt[run.stuckAt] ?? 0) + 1
  }
  return {
    runs: runs.length,
    finished: finished.length,
    didNotFinish: runs.length - finished.length,
    runLength: {
      median: median(lengths),
      p10: percentile(lengths, 0.1),
      p90: percentile(lengths, 0.9),
    },
    failuresPerRun: mean(runs.map(run => run.failures)),
    failureCounts: failureCounts(runs),
    maxAttempts: Math.max(0, ...runs.flatMap(run => run.attempts.map(attempt => attempt.attempt))),
    medianChallengesCompleted: median(runs.map(run => run.challengesCompleted)),
    stuckAt: stuckAt,
    raidsPerRun: {
      won: mean(runs.map(run => run.raids.won)),
      lost: mean(runs.map(run => run.raids.lost)),
      paid: mean(runs.map(run => run.raids.paid)),
      delays: mean(runs.map(run => run.raids.delays)),
    },
    endHqTier: median(runs.map(run => run.endStats.hqTier)),
    shortageShare: median(runs.map(run => run.shortageSeconds / run.endTime)),
    challenges: challengeRows(runs),
    milestones: milestoneRows(runs),
  }
}

/**
 * Median of each reference field (and each resource's stock and net rate) over colony stats snapshots.
 * @param {Object[]} snapshots - colonyStats results
 * @returns {Object} Rounded medians
 */
function medianStats(snapshots) {
  const round = value => (value === null ? null : Number(value.toFixed(REFERENCE_DECIMALS)))
  const result = {}
  for (const field of REFERENCE_FIELDS) {
    result[field] = round(median(snapshots.map(entry => entry[field])))
  }
  for (const group of [
    'stock',
    'netRates',
  ]) {
    result[group] = {}
    for (const resource of HEADER_RESOURCES) {
      result[group][resource] = round(median(snapshots.map(entry => entry[group][resource])))
    }
  }
  return result
}

/**
 * Reference table: per challenge, the median colony stats of the reference bot at the first
 * attempt's activation and countdown start.
 * @param {Object[]} runs - Reference bot's run results
 * @returns {Object[]} One entry per challenge index
 */
function referenceRows(runs) {
  const firstAttempts = runs.flatMap(run => run.attempts.filter(attempt => attempt.attempt === 1))
  const indexes = [...new Set(firstAttempts.map(attempt => attempt.index))].sort((first, second) => first - second)
  return indexes.map(index => {
    const attempts = firstAttempts.filter(attempt => attempt.index === index)
    const started = attempts.filter(attempt => attempt.statsAtCountdownStart)
    return {
      index: index,
      runs: attempts.length,
      activation: medianStats(attempts.map(attempt => attempt.statsAtActivation)),
      countdownStart: started.length > 0 ? medianStats(started.map(attempt => attempt.statsAtCountdownStart)) : null,
    }
  })
}

/**
 * Calibration table: per challenge, the median over the reference bot's first attempts of what its
 * colony could meet in the target share of the base timer when the countdown started (calibration.js).
 * @param {Object[]} runs - Reference bot's run results
 * @returns {Object[]} One entry per challenge the reference bot started a countdown for
 */
function calibrationRows(runs) {
  const firstAttempts = runs.flatMap(run => run.attempts.filter(attempt => attempt.attempt === 1 && attempt.statsAtCountdownStart))
  const rows = []
  for (const definition of CHALLENGE_DEFINITIONS) {
    const attempts = firstAttempts.filter(attempt => attempt.index === definition.index)
    if (attempts.length === 0) {
      continue
    }
    const results = attempts.map(attempt => calibrateChallenge(definition, attempt.statsAtCountdownStart))
    rows.push({
      index: definition.index,
      runs: attempts.length,
      countdownStartTime: median(attempts.map(attempt => attempt.countdownStartTime)),
      share: median(results.map(result => result.share)),
      parts: results[0].parts.map((entry, i) => ({
        part: entry.part,
        base: entry.base,
        alone: median(results.map(result => result.parts[i].alone)),
        together: median(results.map(result => result.parts[i].together)),
      })),
    })
  }
  return rows
}

/**
 * Sanity check: median HQ tier, research count and production value per bot at each milestone, and
 * whether each orders the bots weak ≤ average ≤ strong with weak below strong (production strictly increasing).
 * @param {Object<string, Object>} bots - Bot summaries by name
 * @returns {Object[]} One row per milestone and figure
 */
function sanityRows(bots) {
  const rows = []
  for (const milestone of MILESTONE_SECONDS) {
    for (const field of SANITY_FIELDS) {
      const values = {}
      for (const [
        name,
        summary,
      ] of Object.entries(bots)) {
        values[name] = summary.milestones[milestone][field]
      }
      const {
        weak, average, strong,
      } = values
      const comparable = [
        weak,
        average,
        strong,
      ].every(value => typeof value === 'number')
      const ordered = field === 'productionValue'
        ? weak < average && average < strong
        : weak <= average && average <= strong && weak < strong
      rows.push({
        milestone: milestone,
        field: field,
        values: values,
        ordered: comparable ? ordered : null,
      })
    }
  }
  return rows
}

/**
 * Builds the report from every bot's runs.
 * @param {Object<string, Object[]>} runsByBot - Run results by bot name
 * @param {Object} options - Simulation options (kept in the report)
 * @returns {Object} Report
 */
export function buildReport(runsByBot, options) {
  const bots = {}
  for (const [
    name,
    runs,
  ] of Object.entries(runsByBot)) {
    bots[name] = summarizeBot(runs)
  }
  const referenceRuns = runsByBot[REFERENCE_BOT]
  return {
    options: options,
    bots: bots,
    sanity: sanityRows(bots),
    reference: referenceRuns ? referenceRows(referenceRuns) : [],
    calibration: options.calibrate && referenceRuns ? calibrationRows(referenceRuns) : [],
  }
}

/**
 * Descriptions of the done criteria the report does not meet.
 * @param {Object} report - Report from buildReport
 * @returns {string[]} Unmet criteria
 */
export function unmetCriteria(report) {
  return DONE_CRITERIA.filter(criterion => !criterion.check(report)).map(criterion => criterion.description)
}

/**
 * Formats a number for the text tables.
 * @param {number|null} value - Number
 * @param {number} [decimals=0] - Decimals
 * @returns {string} Formatted number, or '-' when missing
 */
function formatValue(value, decimals = 0) {
  return value === null || value === undefined || Number.isNaN(value) ? '-' : value.toFixed(decimals)
}

/**
 * Formats seconds as minutes with one decimal.
 * @param {number|null} seconds - Seconds
 * @returns {string} Minutes, or '-' when missing
 */
function formatMinutes(seconds) {
  return seconds === null ? '-' : (seconds / SECONDS_PER_MINUTE).toFixed(1) + 'm'
}

/**
 * Formats a share as a whole percentage.
 * @param {number|null} share - 0 to 1
 * @returns {string} Percentage, or '-' when missing
 */
function formatPercent(share) {
  return share === null ? '-' : Math.round(share * 100) + '%'
}

/**
 * Formats attempts per mood compactly, mildest first: each mood's initial and count (e.g. 'M1 L2 W3 S0 D1').
 * @param {Object<string, number>} moods - Attempts by mood
 * @returns {string} Mood counts
 */
function formatMoods(moods) {
  return CHALLENGE_MOODS.map(mood => mood[0].toUpperCase() + moods[mood]).join(' ')
}

/**
 * Lays out rows as a text table with a numbered first column.
 * @param {string[]} headers - Column headers (without the # column)
 * @param {string[][]} rows - Cell texts
 * @returns {string} Table text
 */
function formatTable(headers, rows) {
  const numbered = rows.map((row, index) => [
    String(index + 1),
    ...row,
  ])
  const allRows = [
    [
      '#',
      ...headers,
    ],
    ...numbered,
  ]
  const widths = allRows[0].map((_, column) => Math.max(...allRows.map(row => row[column].length)))
  const line = row => '| ' + row.map((cell, column) => cell.padEnd(widths[column])).join(' | ') + ' |'
  const separator = '|' + widths.map(width => '-'.repeat(width + 2)).join('|') + '|'
  return [
    line(allRows[0]),
    separator,
    ...numbered.map(line),
  ].join('\n')
}

/**
 * Formats the reference table as JavaScript ready to paste into balancing.js.
 * @param {Object[]} reference - Report reference rows
 * @param {number} runs - Runs per bot
 * @returns {string} JavaScript snippet
 */
export function referenceSnippet(reference, runs) {
  const body = JSON.stringify(reference, null, 2)
    .replace(/"([a-zA-Z]+)":/g, '$1:')
    .replace(/\n(\s*)([}\]])/g, ',\n$1$2')
  return `// Median colony stats of the ${REFERENCE_BOT} bot when each challenge first activates and when its countdown starts (${runs} runs)\n`
    + `export const CHALLENGE_REFERENCE_STATS = ${body}\n`
}

/**
 * Formats the whole report as text.
 * @param {Object} report - Report from buildReport
 * @returns {string} Report text
 */
export function formatReport(report) {
  const {
    options, bots, sanity, reference, calibration,
  } = report
  const names = Object.keys(bots)
  const sections = []
  const scalingOff = options.scaling === false
  const scalingSuffix = scalingOff ? ' · scaling off' : ''
  sections.push(`Simulation: bots ${names.join(', ')} · ${options.runs} runs each · seed ${options.seed} · cap ${options.maxHours} h · step ${options.step} s${scalingSuffix}`)

  sections.push('Runs per bot\n' + formatTable([
    'Bot',
    'Finished',
    'DNF',
    'Length median',
    'p10',
    'p90',
    'Failures/run',
    'Max attempts',
    'Challenges done (median)',
    'End HQ tier',
    'Time in shortage',
    'Stuck at (DNF runs)',
    'Raids won/lost/paid/delays per run',
  ], names.map(name => {
    const bot = bots[name]
    const stuck = Object.entries(bot.stuckAt).map(([
      index,
      count,
    ]) => `#${index}×${count}`).join(' ') || '-'
    const raids = bot.raidsPerRun
    return [
      name,
      String(bot.finished),
      String(bot.didNotFinish),
      formatMinutes(bot.runLength.median),
      formatMinutes(bot.runLength.p10),
      formatMinutes(bot.runLength.p90),
      formatValue(bot.failuresPerRun, 1),
      String(bot.maxAttempts),
      formatValue(bot.medianChallengesCompleted, 1),
      HQ_TYPES[Math.round(bot.endHqTier)] ?? '-',
      formatPercent(bot.shortageShare),
      stuck,
      [
        raids.won,
        raids.lost,
        raids.paid,
        raids.delays,
      ].map(value => formatValue(value, 1)).join('/'),
    ]
  })))

  for (const name of names) {
    sections.push(`Challenges — ${name} bot\n` + formatTable([
      'Challenge',
      'Runs reached',
      'Attempts',
      'First-try success',
      'Runs completed',
      'Median time to meet',
      'Median spare share',
      'Amounts ×',
      'Levels ×',
      'Timer ×',
      'Moods',
      'Backstops',
    ], bots[name].challenges.map(row => [
      String(row.index),
      String(row.runsReached),
      String(row.attempts),
      formatPercent(row.firstTrySuccessRate),
      String(row.completedRuns),
      row.medianTimeToMeet === null ? '-' : formatValue(row.medianTimeToMeet) + 's',
      formatPercent(row.medianSpareShare),
      formatValue(row.medianAmountScale, 2),
      formatValue(row.medianLevelScale, 2),
      formatValue(row.medianTimeoutScale, 2),
      formatMoods(row.moods),
      String(row.backstops),
    ])))
  }

  sections.push('Progress at 30/60/90 min (medians)\n' + formatTable([
    'Bot',
    'Minute',
    'Runs',
    'HQ tier',
    'Research',
    'Production value/s',
    'Workers',
    'Building levels',
  ], names.flatMap(name => MILESTONE_SECONDS.map(milestone => {
    const row = bots[name].milestones[milestone]
    return [
      name,
      String(milestone / SECONDS_PER_MINUTE),
      String(row.runs),
      HQ_TYPES[Math.round(row.hqTier ?? -1)] ?? '-',
      formatValue(row.researchCount),
      formatValue(row.productionValue, 1),
      formatValue(row.workers),
      formatValue(row.buildingLevels),
    ]
  }))))

  sections.push('Sanity check: medians, weak < average < strong\n' + formatTable([
    'Minute',
    'Figure',
    ...names,
    'Ordered',
  ], sanity.map(row => [
    String(row.milestone / SECONDS_PER_MINUTE),
    row.field,
    ...names.map(name => formatValue(row.values[name], row.field === 'productionValue' ? 1 : 0)),
    row.ordered === null ? 'n/a' : (row.ordered ? 'yes' : 'NO'),
  ])))

  sections.push('Done criteria\n' + formatTable([
    'Criterion',
    'Result',
  ], DONE_CRITERIA.map(criterion => [
    criterion.description,
    criterion.check(report) ? 'PASS' : 'FAIL',
  ])))

  if (calibration.length > 0) {
    sections.push(`Calibration — what the ${REFERENCE_BOT} bot's colony could meet in the target share of the base timer at countdown start (medians, first attempts)\n` + formatTable([
      'Challenge',
      'Runs',
      'Countdown start',
      'Share together',
      'Part',
      'Base',
      'Alone',
      'Together',
      'Together ÷ base',
    ], calibration.flatMap(row => row.parts.map(entry => [
      String(row.index),
      String(row.runs),
      formatMinutes(row.countdownStartTime),
      formatPercent(row.share),
      entry.part,
      String(entry.base),
      formatValue(entry.alone, Number.isInteger(entry.alone) ? 0 : 1),
      formatValue(entry.together, Number.isInteger(entry.together) ? 0 : 1),
      formatValue(entry.together / entry.base, 2),
    ]))))
  }

  // The reference table must come from scaled runs: without scaling the colonies face other challenges
  if (reference.length > 0 && !scalingOff) {
    sections.push(referenceSnippet(reference, options.runs))
  }
  return sections.join('\n\n')
}
