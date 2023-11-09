import knex from 'knex'
const db: dbCredentials = {}

// try {
//   // Replace libDir path with OracleDB install path
//   oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_DIR })
// } catch (err) {
//   console.error(err)
//   process.exit(1)
// }

db.DB_HOST = 'localhost'
db.DB_PORT = 1521
db.DB_USERNAME = 'hr'
db.DB_PASSWORD = 'oracle'
db.DB_NAME = 'ORCL'

const config = {
  client: 'oracledb',
  connection: {
    host: db.DB_HOST,
    port: db.DB_PORT,
    user: db.DB_USERNAME,
    password: db.DB_PASSWORD,
    database: db.DB_NAME
  }
}
// This file exports our database configuration
// Files that import this configuration don't need to import knex again
// because it is already included in this export

export default knex(config)

// Not used anywhere else thus no need to have it in shared interfaces file
interface dbCredentials {
  DB_HOST?: string
  DB_NAME?: string
  DB_PORT?: number
  DB_USERNAME?: string
  DB_PASSWORD?: string
}
