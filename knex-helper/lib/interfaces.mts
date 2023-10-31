import { Knex } from 'knex'
import { dbClients } from './types.mjs'

export interface timestampFormat {
  PARSE_MONTH: boolean
  YEAR_START_INDEX: number
  YEAR_END_INDEX: number
  MONTH_START_INDEX: number
  MONTH_END_INDEX: number
  DAY_START_INDEX: number
  DAY_END_INDEX: number
  HOUR_START_INDEX: number
  HOUR_END_INDEX: number
  MINUTES_START_INDEX: number
  MINUTES_END_INDEX: number
  SECONDS_START_INDEX: number
  SECONDS_END_INDEX: number
}

export interface whereBody {
  COLUMN: string
  VALUE: any
  COMPARATOR: string
}

export interface whereInBody {
  COLUMN: string
  VALUES: string[] | number[]
}

export interface whereBetween {
  COLUMN: string
  VALUES: number[]
}

type ascDesc = 'asc' | 'desc'

export interface orderBody {
  column: string
  order: ascDesc
}

// All keywords must be optional parameters
export interface customQueryObject {
  SELECT?: string[]
  WHERE?: whereBody
  WHERE_IN?: whereInBody
  WHERE_NOT?: whereBody
  WHERE_NOT_IN?: whereInBody
  WHERE_BETWEEN?: whereBetween
  WHERE_NOT_BETWEEN?: whereBetween
  WHERE_LIKE?: whereBody
  OR_WHERE?: whereBody[]
  AND_WHERE?: whereBody[]
  OR_WHERE_IN?: whereInBody[]
  MIN?: string
  MAX?: string
  LIMIT?: number
  ORDER?: orderBody[]
}

export interface tableInfo {
  NAME: string
  ID_COLUMN?: string
  ID_TYPE?: idType,
  BOOLEAN_COLUMNS: string[]
  BUFFER_COLUMNS: string[]
  TIMESTAMP_COLUMNS: string[]
  NUMBER_COLUMNS: string[]
  STRING_COLUMNS: string[]
}

export type idType = 'string' | 'number'

export interface tablesConfig {
  TABLES: string[]
  TABLE_INFO: tableInfo[]
}

export interface helperConfig {
  DB: Knex
  DB_CLIENT: dbClients
  DB_NAME: string
  DB_USERNAME?: string
  BOOLEAN_DATA_TYPE: string
  BOOLEAN_TRUE_VALUE: string
  BOOLEAN_FALSE_VALUE: string
  CONFIG_FOLDER_PATH?: string
  AUTO_INSERTS?: {
    EDIT_ITEM?: Map<string, any>
  }
  DEBUG?: boolean
}

export interface columnsInfo {
  COLUMN_NAME: string
  DATA_TYPE: string
  DATA_LENGTH: number
}

export interface tableName {
  TABLE_NAME: string
}