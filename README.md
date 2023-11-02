# knex-helper
Tool for automation of data processing for certain queries in Knex.js

# Config Information
**DB** - Configured instance of Knex

Example:

*In the file exporting knex - dbConfig*
```
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
export default knex(config)
```
*In the file initializing knexHelper*
```
import dbconfig from './database/dbConfig.mjs'

  KnexHelper.createInstance(
    {
      DB: dbconfig,
      ...
    }
  )

```
**DB_CLIENT** - Name of the database client package. Must be the same as the one that is used by exported configured knex instance.
knexHelper currently mainly supports `oracledb` but it also works with `mysql2`

**DB_NAME** - Name of the database / schema you want to query against. Must be the same as the one used by exported configured knex instance.

**DB_USERNAME** (Optional) - It's recommended to provide it since it mitigates the issue of scanning tables with duplicate names that were created by 2 different users in the same database / schema

**BOOLEAN_DATA_TYPE** - Name of the datatype used to store booleans in the database.
For OracleDB the options look as follows:
- VARCHAR2 - If the boolean is stored as 1 byte varchar
- NUMBER - If the value is stored as a number (duh)

**BOOLEAN_TRUE_VALUE & BOOLEAN_FALSE_VALUE** - Since databases don't have an unified format for storing boolean values the user needs to provide information about how booleans are handled in their database. Some of the most popular options include:
| True | False |
| ---- | ----- |
|  'Y' |  'N'  |
|  'T' |  'F'  |
|   1  |   0   |

**AUTO_INSERTS** (Optional) - Takes argument of a Map with key value pairs `<string, any>`. These values are automatically added to the query object on functions where such Map was provided.
Currently only `EDIT_ITEM` is supported.

Use case scenario:

Your database overseer requires that change of any record in any table is supposed to be recorded with `UPDATED_DATE` column being updated with value of exact date and time when and update operation happens.

In such case the KnexHelper would be configured as follows
```
  const insertsMap = new Map()
  insertsMap.set(UPDATED_DATE, new Date().toJSON())
  KnexHelper.createInstance(
    {
      ...
      AUTO_INSERTS: {
        EDIT_ITEM: insertsMap
      }
    }
  )

```

**TIMESTAMP_FORMATTER_FUNCTION** (Optional) - User can provide his own function that will be used to format the dates with time before they reach database for query execution. Knex Helper has it's own built in timestamp formatter function but it's currently skewed in favour of oracledb. When a function is provided in the config it will replace the one that is built in.

**DEBUG** (Optional) - KnexHelper will print additional info to the console when set to `true`
