import { genericObj } from './lib/types.mjs'
import { comparators } from './lib/comparators.mjs'
import { customQueryObject, orderBody, whereBody, filterQueryObject, whereInBody } from './lib/interfaces.mjs'
import { AND, BASIC_OPERATORS, BETWEEN, INQ, NIN, OPERATORS, OR } from './lib/constants.mjs'

const REGEX_FILTER = /\?filter=/
export function extractFilterFromURL(url?: string): filterQueryObject | undefined {
  if (url === undefined) {
    return undefined
  }
  const queryArray = url.split(REGEX_FILTER)
  if (queryArray.length <= 1) {
    return undefined
  }
  // queryArray[0] is just the URL declared in route
  const filterQuery = queryArray[1] // [1] contains the query string
  console.log('BEFORE')
  console.log(filterQuery)
  // Placing quotation marks
  const queryWithQuotes = filterQuery.replace(/%22/g, `\"`)
  // Placing spaces
  const queryWithSpaces = queryWithQuotes.replace(/%20/g, ' ')
  // Placing =
  const queryWithEq = queryWithSpaces.replace(/%3D/g, '=')
  // Placing {
  const queryWithOCB = queryWithEq.replace(/%7B/g, '{')
  // Placing :
  const queryWithColons = queryWithOCB.replace(/%3A/g, ':')
  // Placing }
  const queryWithCCB = queryWithColons.replace(/%7D/g, '}')
  console.log('AFTER')
  console.log(queryWithCCB)
  // Replacing all special symbols leaves us with a stringified JSON
  return JSON.parse(queryWithCCB)
}

export function convertFilterToCustomQuery(query: filterQueryObject): customQueryObject {
  let customQuery: customQueryObject = {}
  // fields to SELECT ✅
  if (query.fields !== undefined) {
    const SELECT: string[] = []
    for (const [key, value] of Object.entries(query.fields)) {
      if (value === true || value === 'true') {
        SELECT.push(key)
      }
    }
    if (SELECT.length !== 0) {
      customQuery.SELECT = SELECT
    }
  }
  // where to WHERE
  if (query.where !== undefined) {
    customQuery = Object.assign(customQuery, whereFilterParser(query))
  }
  // limit to LIMIT ✅
  if (query.limit !== undefined) {
    customQuery.LIMIT = query.limit
  }
  // order to ORDER
  if (query.order !== undefined) {
    customQuery = Object.assign(customQuery, orderFilterParser(query))
  }
  console.log(customQuery)
  return customQuery
}

const REGEX_ASC = /ASC/
const REGEX_DESC = /DESC/
function orderFilterParser(filterQuery: filterQueryObject): customQueryObject {
  const customQuery: customQueryObject = {}
  const orderArray: orderBody[] = []
  const ord = filterQuery.order!
  for (let i = 0; i < ord.length; i++) {
    if(REGEX_ASC.test(ord[i])) {
      const col = ord[i].split(REGEX_ASC)
      const asc: orderBody = {
        column: col[0].trim(),
        order: 'asc'
      }
      orderArray.push(asc)
    } else if (REGEX_DESC.test(ord[i])) {
      const col = ord[i].split(REGEX_DESC)
      const desc: orderBody = {
        column: col[0].trim(),
        order: 'desc'
      }
      orderArray.push(desc)
    } else {
      throw new Error('Incorrect value of order filter')
    }
  }
  if (orderArray.length !== 0) {
    customQuery.ORDER = orderArray
  }
  return customQuery
}

function whereFilterParser(filterQuery: filterQueryObject): customQueryObject {
  const customQuery: customQueryObject = {}
  const where = filterQuery.where
  for (const [key, value] of Object.entries(where!)) {
    // Non-nested
    if ((typeof key === 'string' && !OPERATORS.includes(key)) && (typeof value === 'string' || typeof value === 'number')) {
      // BASIC WHERE
      customQuery.WHERE = {
        COLUMN: key,
        COMPARATOR: comparators.EQ,
        VALUE: value
      }
    }
    // Nested keys
    if ((typeof key === 'string' && !OPERATORS.includes(key)) && typeof value === 'object') {
      const nestedKeys = Object.keys(value)
      const nestedValues = Object.values(value)
      for (let i = 0; i < nestedKeys.length; i++) {
        // WHERE WITH OPERATOR
        if (BASIC_OPERATORS.includes(nestedKeys[i])) {
          customQuery.WHERE = {
            COLUMN: key,
            COMPARATOR: nestedKeys[i].toUpperCase(),
            VALUE: nestedValues[i]
          }
        }
        // BETWEEN
        if (nestedKeys[i] === BETWEEN) {
          customQuery.WHERE_BETWEEN = {
            COLUMN: key,
            VALUES: nestedValues[i] as number[]
          }
        }
        // WHERE_IN
        if (nestedKeys[i] === INQ || nestedKeys[i] === NIN) {
          customQuery.WHERE_IN = {
            COLUMN: key,
            VALUES: nestedValues[i] as any[]
          }
        }
        // WHERE_NOT_IN
        if (nestedKeys[i] === NIN) {
          customQuery.WHERE_NOT_IN = {
            COLUMN: key,
            VALUES: nestedValues[i] as any[]
          }
        }
      }
    }
    // AND WHERE
    if (key === AND) {
      console.log('AND WHERE DETECTED')
      const AND_WHERE: whereBody[] = []
      // value is an array in this case
      console.log(value)
      for (let i = 0; i < value.length; i++) {
        AND_WHERE.push({
          COLUMN: Object.keys(value[i])[0],
          COMPARATOR: comparators.EQ,
          VALUE: Object.values(value[i])[0]
        })
      }
      customQuery.AND_WHERE = AND_WHERE
    }
    // OR WHERE
    if (key === OR) {
      console.log('OR WHERE DETECTED')
      const OR_WHERE: whereBody[] = []
      // value is an array in this case
      console.log(value)
      for (let i = 0; i < value.length; i++) {
        OR_WHERE.push({
          COLUMN: Object.keys(value[i])[0],
          COMPARATOR: comparators.EQ,
          VALUE: Object.values(value[i])[0]
        })
      }
      customQuery.OR_WHERE = OR_WHERE
    }
  }
  return customQuery
}
