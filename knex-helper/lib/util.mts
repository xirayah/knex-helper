import { monthsMap } from './constants.mjs'

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
