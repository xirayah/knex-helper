import { timestampFormat } from './interfaces.mjs'

export const ERR_CANNOT_GET_LIST = 'Could not retrieve list from the database. '
export const ERR_CANNOT_GET_ITEM = 'Could not retrieve item from the database. '
export const ERR_CANNOT_DELETE_ITEM = 'Could not delete item in the database. '
export const ERR_CANNOT_ADD_ITEM = 'The insert operation has failed on the database level. '
export const ERR_CANNOT_EDIT_ITEM = 'The update operation has failed on the database level. '

export const ORACLE_NUMBER_TYPE = 'NUMBER'
export const ORACLE_TIMESTAMP_TYPE = 'TIMESTAMP(6)' // The 6 annotation might not be the same between databases
export const ORACLE_BUFFER_TYPE = 'BLOB'

export const MYSQL_NUMBER_TYPE = 'int'
export const MYSQL_DATETIME_TYPE = 'datetime'
export const MYSQL_BUFFER_TYPE = 'blob'

export const NUMBER = 'number'
export const STRING = 'string'

export const monthsMap = new Map()
monthsMap.set('01', 'JAN')
monthsMap.set('02', 'FEB')
monthsMap.set('03', 'MAR')
monthsMap.set('04', 'APR')
monthsMap.set('05', 'MAY')
monthsMap.set('06', 'JUN')
monthsMap.set('07', 'JUL')
monthsMap.set('08', 'AUG')
monthsMap.set('09', 'SEP')
monthsMap.set('10', 'OCT')
monthsMap.set('11', 'NOV')
monthsMap.set('12', 'DEC')

export const QUESTION_MARK_REGEX = /\?/
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/
export const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}.\d{2}:\d{2}:\d{2}/

export const timestampFormatterConfig: timestampFormat = {
  PARSE_MONTH: true,
  YEAR_START_INDEX: 0,
  YEAR_END_INDEX: 4,
  MONTH_START_INDEX: 5,
  MONTH_END_INDEX: 7,
  DAY_START_INDEX: 8,
  DAY_END_INDEX: 10,
  HOUR_START_INDEX: 11,
  HOUR_END_INDEX: 13,
  MINUTES_START_INDEX: 14,
  MINUTES_END_INDEX: 16,
  SECONDS_START_INDEX: 17,
  SECONDS_END_INDEX: 19
}

export const allowedClients = ['oracledb', 'mysql2']
