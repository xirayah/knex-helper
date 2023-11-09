import { QUESTION_MARK_REGEX } from './lib/regex.mjs'
import { comparatorsMap, comparators } from './lib/comparators.mjs'
import { customQueryObject } from './lib/interfaces.mjs'
import qs from 'qs'
import { dateForComparison } from './lib/util.mjs'
import { ARRAY_KEYS, LIMIT, MAX, MIN, ORDER, SELECT, VALID_QUERY_KEYS, WHERE_BETWEEN, WHERE_IN_KEYS, WHERE_KEYS, WHERE_NOT_BETWEEN } from './lib/query.mjs'
import model from './knexHelper.mjs'
import { tableInfo } from './lib/interfaces.mjs'
import db from './dbConfig.mjs'

const DEBUG = false

/**
 * This function compiles query object into a custom GET database query using knex query builder.
 *
 * NOTE!
 * 1. WHERE_IN cannot be used to make queries with dates.
 * 2. Queries with dates cannot be used to find items on the exact date. They are only working for comparison with GT or LT comparators.
 * 3. Date queries are inclusive of date specified. E.g. if you request all items created after 10th July it also includes items created on 10th July.
 * @param tableName Name of the database table you want to query
 * @param customQuery Custom Query Object
 * @returns Array with query results or an error string
 */
export async function customQueryBuilder(tableName: string, tableConfig: tableInfo, customQuery: customQueryObject): Promise<any[] | string> {
  if (DEBUG) {
    console.log('customQueryObject')
    console.log(customQuery)
  }
  // Validating query before initializing query builder
  const validatedQuery = queryValidator(customQuery)
  if (typeof validatedQuery === 'string') {
    return validatedQuery
  }
  let queryObj = db(tableName)
  // Detecting date fields to format them properly
  const query = dateDetector(validatedQuery, tableConfig)
  // Special statements which don't chain with any others
  if (query.MAX !== undefined) {
    queryObj = queryObj.max(query.MAX)
  } else if (query.MIN !== undefined) {
    queryObj = queryObj.min(query.MIN)
  }
  // Single block for execution of non-chainable queries
  if (query.MAX !== undefined || query.MIN !== undefined) {
    if (DEBUG) { console.log('Executing query with MIX / MAX statements') }
    return queryObj.then(async (items) => {
      const keys = Object.keys(items[0])
      const idValue = items[0][keys[0]]
      let idColumn: string = ''
      if (query.MAX !== undefined) {
        idColumn = query.MAX
      }
      if (query.MIN !== undefined) {
        idColumn = query.MIN
      }
      const item = await model().getItem(tableName, idColumn, idValue)
      return item
    },
      (error) => {
        return error
      })
  }
  // 0. SELECT for returning only specified columns
  if (query.SELECT !== undefined) {
    queryObj = queryObj.select(query.SELECT)
  }
  // 1. WHERE or WHERE IN or WHERE NOT or WHERE NOT IN. These are "chain starter" queries and only 1 can be used at a time.
  if (
    query.WHERE !== undefined
  ) {
    if (DEBUG) { console.log('Starting query chain with WHERE') }
    queryObj = queryObj.where(query.WHERE.COLUMN, getComparator(query.WHERE.COMPARATOR), query.WHERE.VALUE)
  } else if (
    query.WHERE_IN !== undefined
  ) {
    if (DEBUG) { console.log('Starting query chain with WHERE IN') }
    queryObj = queryObj.whereIn(query.WHERE_IN.COLUMN, query.WHERE_IN.VALUES)
  } else if (
    query.WHERE_NOT !== undefined
  ) {
    if (DEBUG) { console.log('Starting query chain with WHERE NOT') }
    queryObj = queryObj.whereNot(query.WHERE_NOT.COLUMN, getComparator(query.WHERE_NOT.COMPARATOR), query.WHERE_NOT.VALUE)
  } else if (
    query.WHERE_NOT_IN !== undefined
  ) {
    if (DEBUG) { console.log('Starting query chain with WHERE NOT IN') }
    queryObj = queryObj.whereNotIn(query.WHERE_NOT_IN.COLUMN, query.WHERE_NOT_IN.VALUES)
  } else if (
    query.WHERE_BETWEEN !== undefined
  ) {
    // This required me to change the source code of knex typings to allow number[] as valid type
    // Nevermind the above line I can't do that because the code won't compile on Docker instance
    // I had to come up with this retarded workaround
    const values: readonly [number, number] = [query.WHERE_BETWEEN.VALUES[0], query.WHERE_BETWEEN.VALUES[1]]
    queryObj = queryObj.whereBetween(query.WHERE_BETWEEN.COLUMN, values)
  } else if (
    query.WHERE_NOT_BETWEEN !== undefined
  ) {
    const values: readonly [number, number] = [query.WHERE_NOT_BETWEEN.VALUES[0], query.WHERE_NOT_BETWEEN.VALUES[1]]
    queryObj = queryObj.whereNotBetween(query.WHERE_NOT_BETWEEN.COLUMN, values)
  } else if (
    query.WHERE_LIKE !== undefined
  ) {
    queryObj = queryObj.whereLike(query.WHERE_LIKE.COLUMN, query.WHERE_LIKE.VALUE)
  }
  // 2. AND WHERE
  if (query.AND_WHERE !== undefined) {
    for (let i = 0; i < query.AND_WHERE.length; i++) {
      if (DEBUG) { console.log('Adding AND WHERE to query chain') }
      queryObj = queryObj.andWhere(
        query.AND_WHERE[i].COLUMN,
        getComparator(query.AND_WHERE[i].COMPARATOR),
        query.AND_WHERE[i].VALUE
      )
    }
  }
  // 3. OR WHERE
  if (query.OR_WHERE !== undefined) {
    for (let i = 0; i < query.OR_WHERE.length; i++) {
      if (DEBUG) { console.log('Adding OR WHERE to query chain')}
      queryObj = queryObj.orWhere(
        query.OR_WHERE[i].COLUMN,
        getComparator(query.OR_WHERE[i].COMPARATOR),
        query.OR_WHERE[i].VALUE
      )
    }
  }
  // 4. OR WHERE IN
  if (query.OR_WHERE_IN !== undefined) {
    for (let i = 0; i < query.OR_WHERE_IN.length; i++) {
      if (DEBUG) { console.log('Adding OR WHERE IN to query chain') }
      queryObj = queryObj.orWhereIn(
        query.OR_WHERE_IN[i].COLUMN,
        query.OR_WHERE_IN[i].VALUES
      )
    }
  }
  // 5. LIMIT
  if (query.LIMIT !== undefined) {
    queryObj = queryObj.limit(query.LIMIT)
  }
  // 6. ORDER BY
  if (query.ORDER !== undefined) {
    queryObj = queryObj.orderBy(query.ORDER)
  }
  return queryObj.then((items) => {
    return items
  },
    (error) => {
      return error
    }
  )
}

/**
 * This function validates the query object to see if all properties and values are defined properly
 * @param queryBody
 * @returns Valid customGetQuery or an error string
 */
export function queryValidator(queryBody: customQueryObject): string | customQueryObject {
  const query = queryBody
  for (const [key, value] of Object.entries(query)) {
    // Checking if keywords adhere to allowed values
    if (!VALID_QUERY_KEYS.includes(key)) {
      return `Unsupported key detected in query string. Key: ${key}`
    }
    if (DEBUG) { 
    console.log(`Key: ${key}`)
    console.log(value)
    console.log(value.length)
    }
    if (key === SELECT || key === MIN || key === MAX) {
      continue
    }
    if (Array.isArray(value.COLUMN)) {
      return `Invalid array structure detected for keyword ${key}. Make sure to position the array index [i] immiediately after the keyword. Eg. OR_WHERE[0][COLUMN] not OR_WHERE[COLUMN][0]`
    }
    if (ARRAY_KEYS.includes(key) && !Array.isArray(value)) {
      return `Invalid array structure detected for keyword ${key}. Make sure to add array index [i] between keywords. Eg. ${key}[0][COLUMN]=...&${key}[0][VALUE]=...`
    }
    if (WHERE_KEYS.includes(key)) {
      if (value.length !== undefined) {
        // Iterating through array queries
        for (let i = 0; i < value.length; i++) {
          const validatedWhere = validWhereBody(value[i])
          if (typeof validatedWhere === 'string') {
            return `Incorrect Where Body detected. Please review this key: ${key} and value: ${JSON.stringify(value)}. Error: ${validatedWhere}`
          }
        }
      } else {
        // Single object queries
        const validatedWhere = validWhereBody(value)
        if (typeof validatedWhere === 'string') {
          return `Incorrect Where Body detected. Please review this key: ${key} and value: ${JSON.stringify(value)}. Error: ${validatedWhere}`
        }
      }
    }
    if (WHERE_IN_KEYS.includes(key)) {
      if (value.length !== undefined) {
        // Iterating through array queries
        for (let i = 0; i < value.length; i++) {
          const validatedWhere = validWhereInBody(value[i])
          if (typeof validatedWhere === 'string') {
            return `Incorrect Where In Body detected. Please review this key: ${key} and value: ${JSON.stringify(value)}. Error: ${validatedWhere}`
          }
        }
      } else {
        // Single object queries
        const validatedWhere = validWhereInBody(value)
        if (typeof validatedWhere === 'string') {
          return `Incorrect Where In Body detected. Please review this key: ${key} and value: ${JSON.stringify(value)}. Error: ${validatedWhere}`
        }
      }
    }
    if (key === WHERE_BETWEEN || key === WHERE_NOT_BETWEEN) {
      const validated = validWhereBetween(value)
      if (typeof validated === 'string') {
        return `Incorrect Where Between Body detected. Error: ${validated}`
      }
    }
    if (key === LIMIT) {
      if (typeof value === 'string') {
        const parsed = parseInt(value)
        if (isNaN(parsed)) {
          return 'LIMIT must be a number'
        }
        query.LIMIT = parsed
      } else if (typeof value !== 'number') {
        return 'LIMIT must be a number'
      }
    }
    if (key === ORDER) {
      for (let i = 0; i < value.length; i++) {
        const validated = validOrder(value[i])
        if (typeof validated === 'string') {
          return `Incorrect ORDER body detected. Error: ${validated}`
        }
      }
    }
  }
  return query
}

function validOrder(object: any): string | any {
  const order = object
  if (order.column === undefined) {
    return 'column is undefined'
  }
  if (order.order === undefined) {
    return 'order is undefined'
  }
  if (order.order !== 'asc' && order.order !== 'desc') {
    return 'order value shoud be asc or desc'
  }
  return order
}

function validWhereBetween(object: any): string | any {
  const whereBetween = object
  if (whereBetween.COLUMN === undefined || whereBetween.COLUMN.length === 0) {
    return 'COLUMN is undefined'
  }
  if (object.VALUES === undefined || object.VALUES.length === 0) {
    return 'VALUES is undefined'
  }
  if (object.VALUES.length > 2) {
    return 'WHERE BETWEEN can only have 2 values in the array'
  }
  return whereBetween
}

/**
 * Validates if whereBody object is valid and converts query string comparators to values used by db.
 * Return value set to any on purpose since TypeScript complains I can't assign whereBody when object key is not specified.
 * @param object
 * @returns Valid object instance of whereBody or an error string
 */
function validWhereBody(object: any): string | any {
  const whereBody = object
  if (whereBody.COLUMN === undefined || whereBody.COLUMN.length === 0) {
    return 'COLUMN is undefined'
  }
  // Setting comparator to defult if it was not provided in query string
  if (object.COMPARATOR === undefined) {
    whereBody.COMPARATOR = comparators.EQ
  }
  if (
    whereBody.COMPARATOR !== comparators.EQ &&
    whereBody.COMPARATOR !== comparators.GT &&
    whereBody.COMPARATOR !== comparators.LT
  ) {
    return `This query block contains incorrect comparator value: ${whereBody.COMPARATOR}, it must be equal to EQ, GT or LT`
  }
  // Converting comparator string value to comparing symbol
  whereBody.COMPARATOR = comparatorsMap.get(whereBody.COMPARATOR)
  if (object.VALUE === undefined || object.VALUE.length === 0) {
    return 'VALUE is undefined'
  }
  return whereBody
}

/**
 * Validates if whereInBody object is valid.
 * Return value set to any on purpose since TypeScript complains I can't assign whereInBody when object key is not specified.
 * @param object
 * @returns Valid object instance of whereInBody or an error string
 */
function validWhereInBody(object: any): string | any {
  if (object.COLUMN === undefined || object.COLUMN.length === 0) {
    return 'COLUMN is undefined'
  }
  if (object.VALUES === undefined || object.VALUES.length === 0) {
    return 'VALUES is undefined'
  }
  return object
}

/**
 * Detects DATE fields in queryBody and converts their values to a format accepted by OracleDB
 * @param queryBody
 * @returns
 */
function dateDetector(queryBody: customQueryObject, tableConfig: tableInfo): customQueryObject {
  const query = queryBody
  if (query.WHERE !== undefined && tableConfig.TIMESTAMP_COLUMNS.includes(query.WHERE.COLUMN)) {
    query.WHERE.VALUE = db.raw(dateForComparison(query.WHERE.VALUE))
  }
  if (query.OR_WHERE !== undefined) {
    for (let i = 0; i < query.OR_WHERE.length; i++) {
      if (tableConfig.TIMESTAMP_COLUMNS.includes(query.OR_WHERE[i].COLUMN)) {
        query.OR_WHERE[i].VALUE = db.raw(dateForComparison)
      }
    }
  }
  if (query.AND_WHERE !== undefined) {
    for (let i = 0; i < query.AND_WHERE.length; i++) {
      if (tableConfig.TIMESTAMP_COLUMNS.includes(query.AND_WHERE[i].COLUMN)) {
        query.AND_WHERE[i].VALUE = db.raw(dateForComparison)
      }
    }
  }
  return query
}

/**
 * This function converts request.url to custom query object
 * @param url Fastify's request.url
 * @returns Custom Query Object or undefined if there is no query string
 */
export function requestUrlToQueryBody(url?: string): customQueryObject | undefined {
  if (url === undefined) {
    return undefined
  }
  const queryArray = url.split(QUESTION_MARK_REGEX)
  if (queryArray.length <= 1) {
    return undefined
  }
  // { comma: true } allows to parse arrays from query string
  // as it treats any values joined by commas as array
  // E.g. SELECT=IPUI,RFPI becomes equal to { "SELECT": ["IPUI", "RFPI"] }
  const parsed: customQueryObject = qs.parse(queryArray[1], { comma: true })
  return parsed
}

/**
 * THIS SHOULD GET DEPRECATED AND BE IMPLEMENTED ON AUTOMATIC SCANNING
 * Return comparator symbol equivalent of it's string representation.
 * Always returns equal symbol on undefined or if comparator is incorrect.
 * NOTE! Whenever adding new options to customQueryBuilder function remember to wrap COMPARATOR values with this function.
 * (Initially queryValidator function was supposed to convert COMPARATOR values automatically but because it relies on generic object parsing, it could not be achieved due to TypeScript complaining about not being able to assign values if the key is not known)
 * @param comparator
 * @returns
 */
function getComparator(comparator: string): string {
  if (comparator === comparators.GT || comparator === '>') {
    return '>'
  }
  if (comparator === comparators.LT || comparator === '<') {
    return '<'
  }
  return '='
}
