import { describe } from 'mocha'
import { convertFilterToCustomQuery } from '../filterQueries.mjs'
import { expect } from 'chai'
import { comparators } from '../lib/comparators.mjs'

// FIELDS
const fieldsInput = {
  fields: {
    id: true,
    make: true,
    model: true
  }
}
const fieldsOutput = {
  SELECT: ['id', 'make', 'model']
}

// LIMIT
const limitInput = {
  limit: 5
}
const limitOutput = {
  LIMIT: 5
}

// ORDER
const orderInput = {
  order: ['bread ASC', 'sugar DESC']
}
const orderOutput = {
  ORDER: [
    { column: 'bread', order: 'asc' },
    { column: 'sugar', order: 'desc' }
  ]
}

// WHERE BASIC
const whereBasicInput = {
  where: {
    'NAME': 'Filip'
  }
}
const whereBasicOutput = {
  WHERE: {
    COLUMN: 'NAME',
    COMPARATOR: comparators.EQ,
    VALUE: 'Filip'
  }
}

// 2 WHERE WITH OPERATOR
const whereWithOperatorInput = {
  where: {
    'AGE': {
      gt: 18
    }
  }
}
const whereWithOperatorOutput = {
  WHERE: {
    COLUMN: 'AGE',
    COMPARATOR: comparators.GT,
    VALUE: 18
  }
}

// 3 BETWEEN
const whereBetweenInput = {
  where: {
    'SIZE': {
      'between': [0, 7]
    }
  }
}
const whereBetweenOutput = {
  WHERE_BETWEEN: {
    COLUMN: 'SIZE',
    VALUES: [0, 7]
  }
}

// WHERE_IN
const whereInInput = {
  where: {
    'BREAD': {
      inq: ['healthy', 'sourdough']
    }
  }
}
const whereInOutput = {
  WHERE_IN: {
    COLUMN: 'BREAD',
    VALUES: ['healthy', 'sourdough']
  }
}

// WHERE_NOT_IN
const whereNotInInput = {
  where: {
    'BREAD': {
      nin: ['healthy', 'sourdough']
    }
  }
}
const whereNotInOutput = {
  WHERE_NOT_IN: {
    COLUMN: 'BREAD',
    VALUES: ['healthy', 'sourdough']
  }
}

// 4 AND WHERE
const andWhere = {
  "where":{
    "and":[
      {"ID":2},
      {"IS_COOL":"N"}
    ]
  }
}
// 5 OR WHERE
const orWhere = {
  "where":{
    "or":[
      {"NAME":"Filip"},
      {"IS_COOL": "Y"}
    ]
  }
}

describe('Filter Queries conversion tests', async () => {

  it('Fields', () => {
    const res = convertFilterToCustomQuery(fieldsInput)
    expect(res).to.eql(fieldsOutput)
  })

  it('Limit', () => {
    const res = convertFilterToCustomQuery(limitInput)
    expect(res).to.eql(limitOutput)
  })

  it('Order', () => {
    const res = convertFilterToCustomQuery(orderInput)
    expect(res).to.eql(orderOutput)
  })

  it('Where BASIC', () => {
    const res = convertFilterToCustomQuery(whereBasicInput)
    expect(res).to.eql(whereBasicOutput)
  })

  it('Where with operator', () => {
    const res = convertFilterToCustomQuery(whereWithOperatorInput)
    expect(res).to.eql(whereWithOperatorOutput)
  })

  it('Where between', () => {
    const res = convertFilterToCustomQuery(whereBetweenInput)
    expect(res).to.eql(whereBetweenOutput)
  })

  it('Where In', () => {
    const res = convertFilterToCustomQuery(whereInInput)
    expect(res).to.eql(whereInOutput)
  })

  it('Where Not In', () => {
    const res = convertFilterToCustomQuery(whereInInput)
    expect(res).to.eql(whereInOutput)
  })
  
})
