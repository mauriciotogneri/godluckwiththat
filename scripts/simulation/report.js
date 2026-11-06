// Report for the balance simulation: aggregates the run results per bot and formats them as text.

import {HEADER_RESOURCES, HQ_TYPES} from '@/js/engine/constants.js'
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

// Done criteria checked with SIM_ASSERT. Phase 0 only has the bot sanity check; the challenge criteria come with the rebalancing.
export const DONE_CRITERIA = [
  {
    description: 'HQ tier, research and production at 30/60/90 min order the bots weak < average < strong',
    check: report => report.sanity.every(row => row.ordered !== false),
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
 * completions, median time from countdown start to requirements met, and median spare share.
 * @param {Object[]} runs - Run results
 * @returns {Object[]} One row per challenge index reached by any run
 */
function challengeRows(runs) {
  const indexes = [...new Set(runs.flatMap(run => run.attempts.map(attempt => attempt.index)))].sort((first, second) => first - second)
  return indexes.map(index => {
    const attempts = runs.flatMap(run => run.attempts.filter(attempt => attempt.index === index))
    const resolvedFirst = attempts.filter(attempt => attempt.attempt === 1 && attempt.result)
    const met = attempts.filter(attempt => attempt.firstMetSeconds !== null)
    return {
      index: index,
      runsReached: runs.filter(run => run.attempts.some(attempt => attempt.index === index)).length,
      attempts: attempts.filter(attempt => attempt.result).length,
      firstTrySuccessRate: resolvedFirst.length === 0 ? null : resolvedFirst.filter(attempt => attempt.result === RESULT_SUCCESS).length / resolvedFirst.length,
      completedRuns: runs.filter(run => run.attempts.some(attempt => attempt.index === index && attempt.result === RESULT_SUCCESS)).length,
      medianTimeToMeet: median(met.map(attempt => attempt.firstMetSeconds)),
      // An attempt cut off by the time cap has a met time but no spare share yet
      medianSpareShare: median(met.filter(attempt => attempt.spareShare !== null).map(attempt => attempt.spareShare)),
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
  return {
    options: options,
    bots: bots,
    sanity: sanityRows(bots),
    reference: runsByBot[REFERENCE_BOT] ? referenceRows(runsByBot[REFERENCE_BOT]) : [],
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
    options, bots, sanity, reference,
  } = report
  const names = Object.keys(bots)
  const sections = []
  sections.push(`Simulation: bots ${names.join(', ')} · ${options.runs} runs each · seed ${options.seed} · cap ${options.maxHours} h · step ${options.step} s`)

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
    ], bots[name].challenges.map(row => [
      String(row.index),
      String(row.runsReached),
      String(row.attempts),
      formatPercent(row.firstTrySuccessRate),
      String(row.completedRuns),
      row.medianTimeToMeet === null ? '-' : formatValue(row.medianTimeToMeet) + 's',
      formatPercent(row.medianSpareShare),
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

  if (reference.length > 0) {
    sections.push(referenceSnippet(reference, options.runs))
  }
  return sections.join('\n\n')
}
