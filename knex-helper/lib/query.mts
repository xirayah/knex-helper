export const SELECT = 'SELECT'
export const WHERE = 'WHERE'
export const WHERE_IN = 'WHERE_IN'
export const WHERE_NOT = 'WHERE_NOT'
export const WHERE_NOT_IN = 'WHERE_NOT_IN'
export const OR_WHERE = 'OR_WHERE'
export const AND_WHERE = 'AND_WHERE'
export const OR_WHERE_IN = 'OR_WHERE_IN'
export const WHERE_BETWEEN = 'WHERE_BETWEEN'
export const WHERE_NOT_BETWEEN = 'WHERE_NOT_BETWEEN'
export const WHERE_LIKE = 'WHERE_LIKE'
export const MIN = 'MIN'
export const MAX = 'MAX'
export const LIMIT = 'LIMIT'
export const ORDER = 'ORDER'
export const WHERE_KEYS = [WHERE, WHERE_NOT, OR_WHERE, AND_WHERE, WHERE_LIKE]
export const WHERE_IN_KEYS = [WHERE_IN, WHERE_NOT_IN, OR_WHERE_IN]
export const VALID_QUERY_KEYS = [SELECT].concat(WHERE_KEYS, WHERE_IN_KEYS, WHERE_BETWEEN, WHERE_NOT_BETWEEN, MIN, MAX, LIMIT, ORDER)
export const QUERY_STARTERS = [WHERE, WHERE_IN, WHERE_NOT, WHERE_NOT_IN, WHERE_BETWEEN, WHERE_NOT_BETWEEN, WHERE_LIKE, MIN, MAX]
