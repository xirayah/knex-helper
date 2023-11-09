import { describe } from 'mocha'
import { expect } from 'chai'
import { customQueryBuilder } from '../customQuery.mjs'
import { KnexHelper } from '../knexHelper.mjs'
import dbConfig from '../dbConfig.mjs'
import { AND_WHERE, LIMIT, MAX, MIN, ORDER, OR_WHERE, OR_WHERE_IN, SELECT, WHERE, WHERE_BETWEEN, WHERE_IN, WHERE_LIKE, WHERE_NOT, WHERE_NOT_BETWEEN, WHERE_NOT_IN } from '../lib/query.mjs'

describe('Custom Query Tests', async () => {
  // This needs to be less specific to a database
  const db = dbConfig
  // I should use knex table building methods to prevent data from being hardcoded in tests
  const TEST_TABLE = 'CQ_TEST_TABLE'
  const ID = 'ID'
  const NAME = 'NAME'
  const NUMBER = 'NUMBER'
  const LOCATION = 'LOCATION'
  interface testData {
    ID: number
    NAME: string
    NUMBER: number
    LOCATION: string
  }
  const Filip = {
    ID: 1,
    NAME: 'Filip',
    NUMBER: 9,
    LOCATION: 'Bradford'
  }
  const Weedzior = {
    ID: 2,
    NAME: 'Weedzior',
    NUMBER: 7,
    LOCATION: 'Heaven'
  }
  const Estera = {
    ID: 3,
    NAME: 'Estera',
    NUMBER: 9,
    LOCATION: 'Bełchatów'
  }
  const Liqour = {
    ID: 4,
    NAME: 'The Liqour',
    NUMBER: 6,
    LOCATION: 'Hell'
  }

  const url = '/api?'
  let model: KnexHelper

  before(async () => {
    model = KnexHelper.createInstance({
      DB: db,
      DB_CLIENT: 'oracledb',
      DB_NAME: 'orcl',
      BOOLEAN_DATA_TYPE: 'VARCHAR2',
      BOOLEAN_TRUE_VALUE: 'Y',
      BOOLEAN_FALSE_VALUE: 'N',
    })
    await db.schema.createTable(TEST_TABLE, function (table) {
      table.increments(ID)
      table.string(NAME)
      table.integer(NUMBER)
      table.string(LOCATION)
    })
    await db(TEST_TABLE).insert(Filip)
    await db(TEST_TABLE).insert(Weedzior)
    await db(TEST_TABLE).insert(Estera)
    await db(TEST_TABLE).insert(Liqour)
  })

  it('SELECT', async () => {
    const selectUrlString = url +`${SELECT}=${ID}`
    const res = await model.getList(TEST_TABLE, selectUrlString)
    const expected = [
      { ID: Filip.ID },
      { ID: Weedzior.ID },
      { ID: Estera.ID },
      { ID: Liqour.ID }
    ]
    expect(res).to.eql(expected)
  })

  it('WHERE', async () => {
    const whereUrlString = url + `${WHERE}[COLUMN]=${NAME}&${WHERE}[VALUE]=${Filip.NAME}`
    const res = await model.getList(TEST_TABLE, whereUrlString)
    expect(res.length).to.equal(1)
    expect(res[0].NAME).to.equal(Filip.NAME)
  })

  it('WHERE_IN', async () => {
    const whereInString = url + `${WHERE_IN}[COLUMN]=${NAME}&${WHERE_IN}[VALUES]=${Filip.NAME},${Estera.NAME}`
    const res = await model.getList(TEST_TABLE, whereInString)
    expect(res.length).to.equal(2)
  })

  it('WHERE_NOT', async () => {
    const whereNotString = url + `${WHERE_NOT}[COLUMN]=${NAME}&${WHERE_NOT}[VALUE]=${Liqour.NAME}`
    const res = await model.getList(TEST_TABLE, whereNotString)
    expect(res.length).to.equal(3)
  })

  it('WHERE_NOT_IN', async () => {
    const queryString = url + `${WHERE_NOT_IN}[COLUMN]=${NAME}&${WHERE_NOT_IN}[VALUES]=${Liqour.NAME},${Weedzior.NAME}`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(2)
  })

  it('WHERE_BETWEEN', async() => {
    const queryString = url + `${WHERE_BETWEEN}[COLUMN]=${NUMBER}&${WHERE_BETWEEN}[VALUES]=7,9`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(3)
  })

  it('WHERE_NOT_BETWEEN', async() => {
    const queryString = url + `${WHERE_NOT_BETWEEN}[COLUMN]=${NUMBER}&${WHERE_NOT_BETWEEN}[VALUES]=7,9`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(1)
    expect(res[0].NAME).to.equal(Liqour.NAME)
  })

  it('WHERE_LIKE', async() => {
    const queryString = url + `${WHERE_LIKE}[COLUMN]=${NAME}&${WHERE_LIKE}[VALUE]=%${Filip.NAME}%`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(1)
    expect(res[0].NAME).to.equal(Filip.NAME)
  })

  it('WHERE + OR_WHERE', async() => {
    const queryString = url + `${WHERE}[COLUMN]=${NAME}&WHERE[VALUE]=${Filip.NAME}&${OR_WHERE}[0][COLUMN]=${NAME}&${OR_WHERE}[0][VALUE]=${Estera.NAME}`
    const res = await model.getList(TEST_TABLE, queryString)
    console.log(res)
    expect(res.length).to.equal(2)
  })

  it('WHERE + AND_WHERE', async() => {
    const queryString = url + `${WHERE}[COLUMN]=${NUMBER}&WHERE[VALUE]=9&${AND_WHERE}[0][COLUMN]=${NAME}&${AND_WHERE}[0][VALUE]=${Estera.NAME}`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(1)
  })

  it('WHERE + OR_WHERE_IN', async() => {
    const queryString = url + `${WHERE}[COLUMN]=${NAME}&${WHERE}[VALUE]=${Estera.NAME}&${OR_WHERE_IN}[0][COLUMN]=${NAME}&${OR_WHERE_IN}[0][VALUES]=${Filip.NAME}`
    const res = await model.getList(TEST_TABLE, queryString)
    console.log(res)
    expect(res.length).to.equal(2)
  })

  it('MIN', async() => {
    const queryString = url + `${MIN}=ID`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(1)
    expect(res[0].NAME).to.equal(Filip.NAME)
  })

  it('MAX', async() => {
    const queryString = url + `${MAX}=ID`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(1)
    expect(res[0].NAME).to.equal(Liqour.NAME)
  })

  it('LIMIT', async() => {
    const queryString = url + `${LIMIT}=1`
    const res = await model.getList(TEST_TABLE, queryString)
    expect(res.length).to.equal(1)
  })

  it('WHERE + ORDER', async() => {
    const queryString = url + `${WHERE}[COLUMN]=${NUMBER}&${WHERE}[VALUE]=9&${ORDER}[0][column]=${NAME}&${ORDER}[0][order]=asc`
    const res = await model.getList(TEST_TABLE, queryString)
    console.log(res)
    expect(res.length).to.equal(2)
    expect(res[0].NAME).to.equal(Estera.NAME)
  })

  after(async () => {
    await db.schema.dropTable(TEST_TABLE)
    setTimeout(() => {
      process.exit()
    }, 3000);
  })

})
