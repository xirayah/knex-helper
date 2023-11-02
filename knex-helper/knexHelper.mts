import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { Knex } from 'knex'
import { dbClients, genericObj } from './lib/types.mjs'
import { columnsInfo, helperConfig, idType, tableInfo, tableName, tablesConfig } from './lib/interfaces.mjs'
import { ERR_CANNOT_ADD_ITEM, ERR_CANNOT_DELETE_ITEM, ERR_CANNOT_EDIT_ITEM, ERR_CANNOT_GET_ITEM, ERR_CANNOT_GET_LIST, MYSQL_BUFFER_TYPE, MYSQL_DATETIME_TYPE, MYSQL_NUMBER_TYPE, NUMBER, ORACLE_BUFFER_TYPE, ORACLE_NUMBER_TYPE, ORACLE_TIMESTAMP_TYPE, STRING, allowedClients, monthsMap, timestampFormatterConfig } from './lib/constants.mjs'
import { customQueryBuilder, requestUrlToQueryBody } from './customQuery.mjs'

export class KnexHelper {
  private static instance: KnexHelper
  private static folderPath: string = 'src/database/'
  private static configFilename: string = 'tablesConfig'
  private static configFilePath = this.folderPath + this.configFilename + '.json'
  private static db: Knex
  private static dbName: string
  private static dbClient: dbClients
  private static dbUsername: string
  private static timestampDataType: string
  private static numberDataType: string
  private static bufferDataType: string
  private static booleanDataType: string
  private static booleanTrue: string
  private static booleanFalse: string
  private static editInserts?: Map<string, () => any>
  private static timestampFormatterFunction: (date: string) => string
  private static DEBUG: boolean = true

  private constructor(cfg: helperConfig) {
    if (cfg.CONFIG_FOLDER_PATH !== undefined) {
      KnexHelper.folderPath = cfg.CONFIG_FOLDER_PATH
    }
    // Create config folder
    if (!existsSync(KnexHelper.folderPath)) {
      mkdirSync(KnexHelper.folderPath)
    }
    KnexHelper.db = cfg.DB
    KnexHelper.dbName = cfg.DB_NAME
    KnexHelper.dbClient = cfg.DB_CLIENT
    if (cfg.DB_USERNAME !== undefined) {
      KnexHelper.dbUsername = cfg.DB_USERNAME
    }
    switch (KnexHelper.dbClient) {
      case 'oracledb':
        KnexHelper.numberDataType = ORACLE_NUMBER_TYPE
        KnexHelper.bufferDataType = ORACLE_BUFFER_TYPE
        KnexHelper.timestampDataType = ORACLE_TIMESTAMP_TYPE
        break
      case 'mysql2':
        KnexHelper.numberDataType = MYSQL_NUMBER_TYPE
        KnexHelper.bufferDataType = MYSQL_BUFFER_TYPE
        KnexHelper.timestampDataType = MYSQL_DATETIME_TYPE
        break
    }
    // Automatically inserting values on certain commands
    if (cfg.AUTO_INSERTS !== undefined) {
      KnexHelper.editInserts = cfg.AUTO_INSERTS.EDIT_ITEM
    }
    KnexHelper.booleanDataType = cfg.BOOLEAN_DATA_TYPE
    KnexHelper.booleanTrue = cfg.BOOLEAN_TRUE_VALUE
    KnexHelper.booleanFalse = cfg.BOOLEAN_FALSE_VALUE
    if (cfg.TIMESTAMP_FORMATTER_FUNCTION !== undefined) {
      KnexHelper.timestampFormatterFunction = cfg.TIMESTAMP_FORMATTER_FUNCTION
    }
    if (cfg.DEBUG !== undefined) {
      KnexHelper.DEBUG = cfg.DEBUG
    }
  }

  static createInstance(cfg: helperConfig) {
    if (!allowedClients.includes(cfg.DB_CLIENT)) {
      throw new Error(`Cannot initialize KnexHelper. Incorrect DB_CLIENT ${cfg.DB_CLIENT}. Allowed values are: ${allowedClients}`)
    }
    if (!KnexHelper.instance) {
      if (this.DEBUG) { console.log('KnexCrud initialized') }
      KnexHelper.instance = new KnexHelper(cfg)
    }
    return KnexHelper.instance
  }

  static getInstance = () => {
    return KnexHelper.instance
  }

  public knex = () => {
    return KnexHelper.db
  }

  public debug = () => {
    return KnexHelper.DEBUG
  }

  // == Exported Query Functions == //

  /**
   * Return list of items for the specified table or compiles a custom GET query if request URL contains one.
   * @param tableName
   * @returns
   */
  public async getList(tableName: string, requestUrl?: string): Promise<any[]> {
    const tableConfig = await this.getTableInfo(tableName)
    let list: string | genericObj[] = []
    const queryBody = requestUrlToQueryBody(requestUrl)
    if (queryBody !== undefined) {
      list = await customQueryBuilder(tableName, tableConfig, queryBody)
    } else {
      list = await this.getListQuery(tableName)
    }
    if (typeof list === 'string') {
      throw new Error(ERR_CANNOT_GET_LIST+ list)
    }
    // Converting boolean values
    if (tableConfig.BOOLEAN_COLUMNS.length > 0) {
      const newList: genericObj[] = []
      for (let i = 0; i < list.length; i++) {
        newList.push(this.convertBooleansForServer(list[i], tableConfig.BOOLEAN_COLUMNS))
      }
      return newList
    }
    return list
  }

  /**
   * Return item or items for specified values
   * @param tableName Name of the table you want to query
   * @param idColumn Name of the column used for identification
   * @param idValue Identificator value
   * @returns
   */
  async getItem(tableName: string, idColumn: string, idValue: any, select: any[] = []): Promise<any> {
    const item = await this.getItemQuery(tableName, idColumn, idValue, select)
    if (typeof item === 'string') {
      throw new Error(ERR_CANNOT_GET_ITEM + item)
    }
    const tableConfig = await this.getTableInfo(tableName)
    // Converting boolean columns
    if (tableConfig.BOOLEAN_COLUMNS.length > 0) {
      const newList: genericObj[] = []
      for (let i = 0; i < item.length; i++) {
        newList.push(this.convertBooleansForServer(item[i], tableConfig.BOOLEAN_COLUMNS))
      }
      return newList
    }
    return item
  }

  /**
   * Deletes item from specified table
   * @param tableName Name of the table you want to query
   * @param idColumn Name of the column used for identification
   * @param idValue Identificator value
   * @returns
   */
  async deleteItem(tableName: string, idColumn: string, idValue: any): Promise<number> {
    const result = await this.deleteItemQuery(tableName, idColumn, idValue)
    if (typeof result === 'string') {
      throw new Error(ERR_CANNOT_DELETE_ITEM + result)
    }
    return result
  }

  /**
   * Adds item to specified table
   * @param tableName Name of the table you want to query
   * @param requestBody Item data (usually request.body)
   * @returns
   */
  async addItem(tableName: string, requestBody: any): Promise<number> {
    const tableConfig = await this.getTableInfo(tableName)
    let item = requestBody
    // Processing booleans for db
    if (tableConfig.BOOLEAN_COLUMNS.length !== 0) {
      item = this.convertBooleansForDB(item, tableConfig.BOOLEAN_COLUMNS)
    }
    // Processing dates (Some tables have date columns which are not CREATED_DATE or UPDATED_DATE)
    if (tableConfig.TIMESTAMP_COLUMNS.length !== 0) {
      item = this.convertDatesForDB(item, tableConfig.TIMESTAMP_COLUMNS)
    }
    // Processing buffer values
    if (tableConfig.BUFFER_COLUMNS.length !== 0) {
      item = this.bufferExtractor(item, tableConfig.BUFFER_COLUMNS)
    }
    const result = await this.addItemQuery(tableName, item)
    if (typeof result === 'string') {
      throw new Error(ERR_CANNOT_ADD_ITEM + result)
    }
    return result
  }

  /**
   * Edits item with new data in specified table.
   * @param tableName Name of the table you want to query
   * @param idColumn Name of the column used for identification
   * @param idValue Identificator value
   * @param requestBody Item data (usually request.body)
   * @returns 1 on success or 0 when no item has been found
   */
  async editItem(tableName: string, idColumn: string, idValue: any, requestBody: any): Promise<number> {
    const tableConfig = await this.getTableInfo(tableName)
    let item = requestBody
    // Inserting values automatically as specified in config
    if (KnexHelper.editInserts !== undefined) {
      KnexHelper.editInserts.forEach((value: any, key: string, map: Map<string, any>) => {
        item[key] = value
      })
    }
    // Converting booleans
    if (tableConfig.BOOLEAN_COLUMNS.length !== 0) {
      item = this.convertBooleansForDB(item, tableConfig.BOOLEAN_COLUMNS)
    }
    // Converting dates
    if (tableConfig.TIMESTAMP_COLUMNS.length !== 0) {
      item = this.convertDatesForDB(item, tableConfig.TIMESTAMP_COLUMNS)
    }
    // Processing buffer values
    if (tableConfig.BUFFER_COLUMNS.length !== 0) {
      item = this.bufferExtractor(item, tableConfig.BUFFER_COLUMNS)
    }
    if (KnexHelper.DEBUG) {
      console.log('Item just before calling editItemQuery')
      console.log(item)
    }
    const result = await this.editItemQuery(tableName, idColumn, idValue, item)
    if (typeof result === 'string') {
      throw new Error(ERR_CANNOT_EDIT_ITEM + result)
    }
    return result
  }

  /**
   * Returns the first item from the specified table.
   * @param tableName 
   * @returns 
   */
  async getFirstItem(tableName: string): Promise<any[]> {
    const item = await this.getFirstItemQuery(tableName)
    if (typeof item === 'string') {
      throw new Error(ERR_CANNOT_GET_ITEM + item)
    }
    const tableConfig = await this.getTableInfo(tableName)
    // Converting boolean columns
    if (tableConfig.BOOLEAN_COLUMNS.length > 0) {
      const newList: genericObj[] = []
      for (let i = 0; i < item.length; i++) {
        newList.push(this.convertBooleansForServer(item[i], tableConfig.BOOLEAN_COLUMNS))
      }
      return newList
    }
    return item
  }

  /**
   * Deletes all items from specified table
   * @param tableName Name of the table you want to query
   * @returns number of records deleted
   */
    async deleteAll(tableName: string): Promise<number> {
      const result = await this.deleteAllQuery(tableName)
      if (typeof result === 'string') {
        throw new Error(ERR_CANNOT_DELETE_ITEM + result)
      }
      return result
    }

  // == Direct Queries == //

  private async getListQuery(tableName: string): Promise<genericObj[] | string> {
    return await KnexHelper.db(tableName)
      .catch(function(error) {
        return String(error)
      })
  }

  private async getItemQuery(tableName: string, idColumn: string, idValue: any, select: string[]): Promise<genericObj[] | string> {
    return await KnexHelper.db(tableName)
      .select(select)
      .where(idColumn, idValue)
      .catch(function(error) {
        return String(error)
      })
  }

  private async deleteItemQuery(tableName: string, idColumn: string, idValue: any): Promise<number | string> {
    return KnexHelper.db(tableName)
      .where(idColumn, idValue)
      .del()
      .catch(function(error) {
        return String(error)
      })
  }

  private async addItemQuery(tableName: string, item: any): Promise<number | string> {
    return KnexHelper.db(tableName)
      .insert<number>(item)
      .catch(function(error) {
        return String(error)
      })
  }

  private async editItemQuery(tableName: string, idColumn: string, idValue: any, item: any): Promise<number | string> {
    return KnexHelper.db(tableName)
      .update(item)
      .where(idColumn, idValue)
      .catch(function(error) {
        return String(error)
      })
  }

  private async getFirstItemQuery(tableName: string): Promise<any[] | string> {
    return KnexHelper.db(tableName)
      .limit(1)
      .catch(function(error) {
        return String(error)
      })
  }

  private async deleteAllQuery(tableName: string): Promise<number | string> {
    return KnexHelper.db(tableName)
      .del()
      .catch(function(error) {
        return String(error)
      })
  }

// == Table Config Functions == //

  /**
   * Return tableInfo object for the specified table.
   * Reads cached info from tablesConfig file or creates a new entry.
   * Overwrites existing config when ```overwrite``` = ```true```.
   * @param tableName 
   * @returns tableInfo
   */
  async getTableInfo(tableName: string, overwrite: boolean = false): Promise<tableInfo> {
    const configData: tablesConfig = await this.getTablesConfig() // Reading config file
    if (configData.TABLES.includes(tableName)) {
      const tableInfo = configData.TABLE_INFO.find(o => o.NAME === tableName)! // Never returns undefined
      if (overwrite) {
        const newTableInfo = await this.createTableInfo(tableName)
        const index = configData.TABLE_INFO.indexOf(tableInfo)
        configData.TABLE_INFO[index] = newTableInfo // Replacing the previous tableInfo
        writeFileSync(KnexHelper.configFilePath, JSON.stringify(configData, null, 2)) // Saving changes to file
        return newTableInfo
      }
      return tableInfo
    }
    // Create config for new table
    const tableInfo = await this.createTableInfo(tableName)
    configData.TABLES.push(tableName)
    configData.TABLE_INFO.push(tableInfo)
    writeFileSync(KnexHelper.configFilePath, JSON.stringify(configData, null, 2))
    return tableInfo
  }

  /**
   * Returns tablesConfig containing tableInfo for all saved tables.
   * Overwrites existing config when ```overwrite``` = ```true```.
   * @returns tablesConfig
   */
  async getTablesConfig(overwrite: boolean = false): Promise<tablesConfig> {
    // Create config file
    if (!existsSync(KnexHelper.configFilePath) || overwrite) {
      const tablesConfig = await this.createTablesConfig()
      writeFileSync(KnexHelper.configFilePath, JSON.stringify(tablesConfig, null, 2))
      return tablesConfig
    }
    // Read config file
    const tablesConfig: tablesConfig = JSON.parse(readFileSync(KnexHelper.configFilePath, 'utf-8'))
    return tablesConfig
  }

  /**
   * Creates tableInfo object for the specified table.
   * @param tableName 
   * @returns 
   */
  async createTableInfo(tableName: string): Promise<tableInfo> {
    // NOTE
    // "Something is faulty within this function and causes duplicate columns to be appended" - SOLVED
    // The issue was caused by 2 tables being named identically in the local database that were created by 2 different owners
    // But it leaves a concern for the future
    // As creating a config for large databases could result in duplicate table information
    const columnsInfo = await this.getColumnsInfoFromDB(tableName, KnexHelper.dbUsername)
    const sampleData = await this.getSampleDataFromDB(tableName)
    if (KnexHelper.DEBUG) {
      console.log(`creating Table Info for ${tableName}`)
      console.log('columnsInfo')
      console.log(columnsInfo)
      console.log('sampleData')
      console.log(sampleData)
    }
    const idColumnInfo: columnsInfo[] = await this.getIdColumn(tableName)
    let idColumn: string | undefined = undefined
    let idType: idType | undefined = undefined
    if (idColumnInfo.length !== 0) {
      idColumn = idColumnInfo[0].COLUMN_NAME
      idType = this.getDataTypeForInterface(idColumnInfo[0].DATA_TYPE)
    }
    if (KnexHelper.DEBUG) {
      console.log('idColumn')
      console.dir(idColumn)
    }
    const tableShape: tableInfo = {
      NAME: tableName,
      ID_COLUMN: idColumn,
      ID_TYPE: idType,
      BOOLEAN_COLUMNS: [],
      BUFFER_COLUMNS: [],
      TIMESTAMP_COLUMNS: [],
      NUMBER_COLUMNS: [],
      STRING_COLUMNS: []
    }
    for (let i = 0; i < columnsInfo.length; i++) {
      const dataType = columnsInfo[i].DATA_TYPE
      // NUMBER
      if (dataType === KnexHelper.numberDataType) {
        tableShape.NUMBER_COLUMNS.push(columnsInfo[i].COLUMN_NAME)
        continue
      }
      // BUFFER
      if (dataType === KnexHelper.bufferDataType) {
        tableShape.BUFFER_COLUMNS.push(columnsInfo[i].COLUMN_NAME)
        continue
      }
      // TIMESTAMP
      if (dataType === KnexHelper.timestampDataType) {
        tableShape.TIMESTAMP_COLUMNS.push(columnsInfo[i].COLUMN_NAME)
        continue
      }
      // BOOLEAN
      if (sampleData.length === 0 && dataType === KnexHelper.booleanDataType && columnsInfo[i].DATA_LENGTH === 1) {
        // Making a generous assumption the column is of boolean type if sample data is missing
        // Even if the assumption is wrong it won't affect data processing negatively due to how booleanForServer() works
        tableShape.BOOLEAN_COLUMNS.push(columnsInfo[i].COLUMN_NAME)
        continue
      } else if (dataType === KnexHelper.booleanDataType && columnsInfo[i].DATA_LENGTH === 1 &&
        (sampleData[0][columnsInfo[i].COLUMN_NAME] === KnexHelper.booleanTrue ||
        sampleData[0][columnsInfo[i].COLUMN_NAME] === KnexHelper.booleanFalse)) {
        tableShape.BOOLEAN_COLUMNS.push(columnsInfo[i].COLUMN_NAME)
        continue
      }
      // Assume everything else is a string
      tableShape.STRING_COLUMNS.push(columnsInfo[i].COLUMN_NAME)
    }
    return tableShape
  }

  /**
   * Creates tablesConfig object based on all tables available in the database/schema for the logged in user.
   * @returns 
   */
  private async createTablesConfig(): Promise<tablesConfig> {
    const tData: tablesConfig = {
      TABLES: [],
      TABLE_INFO: []
    }
    const allTableNames = await this.getAllTableNames()
    const tableNamesSet = new Set() // To avoid duplicate tables
    let tableNamesSetSize = 0
    for (let i = 0; i < allTableNames.length; i++) {
      tableNamesSet.add(allTableNames[i].TABLE_NAME)
      if (tableNamesSet.size > tableNamesSetSize) {
        tData.TABLES.push(allTableNames[i].TABLE_NAME)
        const tableInfo = await this.createTableInfo(allTableNames[i].TABLE_NAME)
        tData.TABLE_INFO.push(tableInfo)
        tableNamesSetSize += 1
      }
    }
    if (KnexHelper.dbClient === 'mysql2') {
      return tData
    }
    const allViewNames: tableName[] = await this.getAllViewNames()
    console.log('How many views?')
    console.log(allViewNames.length)
    console.warn('CREATING TABLE INFO FOR VIEWS TEMPORARILY DISABLED')
    for (let i = 0; i < allViewNames.length; i++) {
      tData.TABLES.push(allViewNames[i].TABLE_NAME)
      const tableInfo = await this.createTableInfo(allViewNames[i].TABLE_NAME)
      if (typeof tableInfo === 'string') {
        throw new Error(`There was an error while creating table configuration for ${allViewNames[i].TABLE_NAME}. ${tableInfo}`)
      }
      tData.TABLE_INFO.push(tableInfo)
    }
    return tData
  }

  /**
   * Returns identity column of selected table
   * @param tableName 
   * @returns 
   */
  private async getIdColumn(tableName: string): Promise<columnsInfo[]> {
    // TODO
    // add switch for db client 
    return KnexHelper.db.raw(
      `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM SYS.ALL_TAB_COLUMNS
      WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = (
      SELECT cols.column_name
      FROM all_constraints cons, all_cons_columns cols
      WHERE cols.table_name = '${tableName}'
      AND cons.constraint_type = 'P'
      AND cons.constraint_name = cols.constraint_name
      AND cons.owner = cols.owner
      AND ROWNUM = 1
      )
      AND ROWNUM = 1
      `
    )
      .catch(function (error) {
        throw new Error(error)
      })
  }

  /**
   * Returns a single record from selected table.
   * Why is this query needed?
   * It's pretty simple - most of database enginges don't have official boolean type.
   * Thus it can't always be inferred from the data type and length itself.
   * Using a single record from the table helps KnexHelper determine boolean values correctly.
   * @param tableName 
   * @returns 
   */
  private async getSampleDataFromDB(tableName: string): Promise<any[] | string> {
    return KnexHelper.db(tableName)
      .limit(1)
      .catch(function (error) {
        throw new Error(error)
      })
  }

  /**
   * Queries the database for all names of tables and returns them as array of TABLE_NAME
   * @returns 
   */
  private async getAllTableNames(): Promise<tableName[]> {
    console.log('getAllTableNames')
    let query: any
    switch (KnexHelper.dbClient) {
      case 'oracledb':
        console.log('oracledb')
        query = await KnexHelper.db
          .raw('SELECT table_name FROM user_tables')
          .catch(function (error) {
            throw new Error(error)
          })
        return query
      case 'mysql2':
        console.log('mysql')
        query = await KnexHelper.db
          .raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${KnexHelper.dbName}'`)
          .catch(function (error) {
            throw new Error(error)
          })
        return query[0]
    }
  }

  /**
   * Queries the database for all names of views and returns them as array of TABLE_NAME
   * @returns 
   */
  private async getAllViewNames(): Promise<tableName[]> {
    console.log('getAllViewNames')
    let query: any
    switch (KnexHelper.dbClient) {
      case 'oracledb':
        console.log('oracledb')
        query = await KnexHelper.db.raw('SELECT VIEW_NAME as TABLE_NAME from user_views')
        return query
      case 'mysql2':
        console.log('mysql')
        query = await KnexHelper.db.raw(`SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_TYPE LIKE 'VIEW' AND TABLE_SCHEMA = '${KnexHelper.dbName}'`)
        return query[0]
    }
  }

  /**
   * Returns following information from specified table as array of columnsInfo objects:
   * COLUMN_NAME,
   * DATA_TYPE,
   * DATA_LENGTH.
   * @param tableName
   * @returns 
   */
  private async getColumnsInfoFromDB(tableName: string, username?: string): Promise<columnsInfo[]> {
    let query: any
    switch (KnexHelper.dbClient) {
      case 'oracledb':
        if (username !== undefined) {
          query = await KnexHelper.db.raw(
            `SELECT
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH
            FROM SYS.ALL_TAB_COLUMNS
            WHERE TABLE_NAME = '${tableName}'
            AND OWNER = '${username}'`
          )
            .catch(function (error) {
              throw new Error(error)
            })
        } else {
          query = await KnexHelper.db.raw(
            `SELECT
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH
            FROM SYS.ALL_TAB_COLUMNS
            WHERE TABLE_NAME = '${tableName}'`
          )
            .catch(function (error) {
              throw new Error(error)
            })
        }
        return query
      case 'mysql2':
        query = await KnexHelper.db.raw(
          `SELECT
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH AS DATA_LENGTH
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'`
        )
          .catch(function (error) {
            console.log('Any errors?')
            console.log(error)
            throw new Error(error)
          })
        return query[0]
    }
  }

  // == Utilities == //

  /**
   * Converts boolean string values of generic object to their boolean equivalent.
   * @param obj generic Object
   * @param booleanKeys array of names of boolean database columns
   * @returns generic Obejct with converted boolean values
   */
  private convertBooleansForServer(obj: genericObj, booleanKeys: string[]): genericObj {
    const newObj: genericObj = {}
    for (let i = 0; i < booleanKeys.length; i++) {
      if (obj[booleanKeys[i]] !== undefined && obj[booleanKeys[i]] !== null) {
        newObj[booleanKeys[i]] = this.booleanForServer(obj[booleanKeys[i]])
      }
    }
    // Concatting objects with new properties
    const finalObj = { ...obj, ...newObj }
    return finalObj
  }

  /**
   * This function converts string booleans into actual boolean values.
   * If the value is not an actual boolean it simply returns it without throwing any errors - This is an intended feature.
   * @param value
   * @returns boolean
   */
  private booleanForServer(value: any): boolean {
    if (value === true || value === 'true') {
      return true
    }
    if (value === false || value === 'false') {
      return false
    }
    if (value === KnexHelper.booleanTrue) {
      return true
    }
    if (value === KnexHelper.booleanFalse) {
      return false
    }
    return value
  }

  /**
   * Converts boolean values of generic object to their string equivalent.
   * @param obj generic Object
   * @param booleanKeys array of names of boolean database columns
   * @returns generic Obejct with converted boolean values
   */
  private convertBooleansForDB(obj: genericObj, booleanKeys: string[]): genericObj {
    const newObj: genericObj = {}
    for (let i = 0; i < booleanKeys.length; i++) {
      if (obj[booleanKeys[i]] !== undefined && obj[booleanKeys[i]] !== null) {
        newObj[booleanKeys[i]] = this.booleanForDB(obj[booleanKeys[i]])
      }
    }
    const finalObj = { ...obj, ...newObj }
    return finalObj
  }

  /**
   * This function converts booleans to values accepted by Oracle DB.
   * @param value of boolean or string type
   * @returns 'Y' or 'N'
   */
  private booleanForDB(value: boolean | string): string {
    if (typeof value === 'boolean') {
      if (value) {
        return KnexHelper.booleanTrue
      } else {
        return KnexHelper.booleanFalse
      }
    }
    return value as string
  }

  /**
   * Converts dates automatically to timestamp inserts
   * @param obj
   * @param dateKeys
   * @returns
   */
  private convertDatesForDB(obj: genericObj, dateKeys: string[]): genericObj {
    const newObj: genericObj = {}
    for (let i = 0; i < dateKeys.length; i++) {
      if (obj[dateKeys[i]] !== undefined && obj[dateKeys[i]] !== null) {
        let formattedDate: string = ''
        if (KnexHelper.timestampFormatterFunction !== undefined) {
          formattedDate = KnexHelper.timestampFormatterFunction(obj[dateKeys[i]])
        } else {
          formattedDate = this.timestampFormatter(obj[dateKeys[i]])
        }
        newObj[dateKeys[i]] = KnexHelper.db.raw(formattedDate)
      }
    }
    const finalObj = { ...obj, ...newObj }
    return finalObj
  }

  /**
 * This function converts dates to a timestamp format
 * that can be used by the oracle database.
 * Months are currently converted from numeric to 3 letter representation.
 * REMEMBER to wrap any timestamp inserts with db.raw(dateHere)
 * @param date In format of a new Date().toJSON() (YYYY-MM-DDTHH:MM:SS.SSSZ)
 * @returns Correctly formatted date for the database
 */
  private timestampFormatter(date: string): string {
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
    if (KnexHelper.dbClient !== 'oracledb') {
      return formattedDate
    }
    const timestampPrefix = "to_timestamp('"
    const timestampSuffix = "','DD-MON-RR HH24.MI.SSXFF')"
    const readyForInsertDate = timestampPrefix + formattedDate + timestampSuffix
    return readyForInsertDate
  }

  /**
   * Extracts buffer data from buffer object
   * @param obj
   * @param bufferKeys
   * @returns
   */
  private bufferExtractor(obj: genericObj, bufferKeys: string[]): genericObj {
    const newObj: genericObj = {}
    for (let i = 0; i < bufferKeys.length; i++) {
      if (obj[bufferKeys[i]] !== undefined) {
        newObj[bufferKeys[i]] = obj[bufferKeys[i]][0].data
      }
    }
    const finalObj = { ...obj, ...newObj }
    return finalObj
  }

  /**
   * This function looks a little botched as there are way more data types.
   * BUT it's meant to be specifcally used to convert data type only for identity columns.
   * If your table does not use number or string as ID column then you're whack.
   * @param dataType 
   * @returns 
   */
    private getDataTypeForInterface(dataType: string): idType {
      if (dataType === KnexHelper.numberDataType) {
        return NUMBER
      }
      return STRING
    }

}

export default KnexHelper.getInstance
