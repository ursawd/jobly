//Path: /helpers/sql.js

const { BadRequestError } = require("../expressError");

// Used in Company class method 'update' and User class method 'update'

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  //get array of column names (keys) to update
  const keys = Object.keys(dataToUpdate);
  //if array of column names empty (length === 0) throw error
  if (keys.length === 0) throw new BadRequestError("No data");
  //transform update data to sql format for parameter variables as below
  //  {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  //? ??jsToSql
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );
  // returns parameterized column names and arrray of
  // associated values => {setCols: '"description"=$1', values: Array(1)}
  let returnInfo = {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
  return returnInfo;
}
//--------------------------------------------------------------------
module.exports = { sqlForPartialUpdate };
