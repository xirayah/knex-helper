import { monthsMap, timestampFormatterConfig } from './constants.mjs'
import { dbClients } from './types.mjs'

/**
 * This function converts dates into a format accepted by Oracle DB
 * Use it when making queries that compare dates
 * Such as queries which return all records newer than YYYY-MM-DD
 * @param date formatted as YYYY-MM-DD
 * @returns Correctly formatted date for the database
 */
export function dateForComparison(date: string): string {
  const year = date.slice(0, 4)
  let month = date.slice(5, 7)
  month = monthsMap.get(month)
  const day = date.slice(8, 10)
  const formattedDate = day + '-' + month + '-' + year
  const toDatePrefix = "to_date('"
  const toDateSuffix = "','DD-MON-RR')"
  const fullDate = toDatePrefix + formattedDate + toDateSuffix
  return fullDate
}

  /**
 * This function converts dates to a timestamp format
 * that can be used by the oracle database.
 * Months are currently converted from numeric to 3 letter representation.
 * REMEMBER to wrap any timestamp inserts with db.raw(dateHere)
 * @param date In format of a new Date().toJSON() (YYYY-MM-DDTHH:MM:SS.SSSZ)
 * @returns Correctly formatted date for the database
 */
  export function timestampFormatter(date: string, client?: dbClients): string {
    const { PARSE_MONTH, YEAR_START_INDEX, YEAR_END_INDEX, MONTH_START_INDEX, MONTH_END_INDEX, DAY_START_INDEX, DAY_END_INDEX, HOUR_START_INDEX, HOUR_END_INDEX, MINUTES_START_INDEX, MINUTES_END_INDEX, SECONDS_START_INDEX, SECONDS_END_INDEX } = timestampFormatterConfig
    const year = date.slice(YEAR_START_INDEX, YEAR_END_INDEX)
    let month = date.slice(MONTH_START_INDEX, MONTH_END_INDEX)
    if (PARSE_MONTH === true) {
      month = monthsMap.get(month)
    }
    const day = date.slice(DAY_START_INDEX, DAY_END_INDEX)
    const hour = date.slice(HOUR_START_INDEX, HOUR_END_INDEX)
    const minutes = date.slice(MINUTES_START_INDEX, MINUTES_END_INDEX)
    const seconds = date.slice(SECONDS_START_INDEX, SECONDS_END_INDEX)
    const formattedDate = day + '-' + month + '-' + year + ' ' + hour + ':' + minutes + ':' + seconds
    if (client === 'oracledb') {
      const timestampPrefix = "to_timestamp('"
      const timestampSuffix = "','DD-MON-RR HH24.MI.SSXFF')"
      const readyForInsertDate = timestampPrefix + formattedDate + timestampSuffix
      return readyForInsertDate
    }
    return formattedDate
  }
