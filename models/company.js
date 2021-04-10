"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies. Allows filter in query string for company name,
   *  minEmployees, maxEmployees
   * /companies?name=cdw&minEmployees=2&maxEmployees=11
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(req) {
    //create SQL query string beginning. Will add to string if
    //filters are present in query string
    let qSql = `SELECT handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
        FROM companies`;
    //create closing of SQL query string
    const qEnd = ` ORDER BY name`;
    //get number of queries
    const numFilters = Object.keys(req.query).length;
    //if any queries, add SQL WHERE clause to begin SQL filter statements
    if (numFilters !== 0) qSql += ` WHERE `;
    //iterate through filters, get index, key and value of filter
    for (let [index, [key, value]] of Object.entries(
      Object.entries(req.query)
    )) {
      //if filter name present add to SQL statement
      // use ILIKE to match any part of compnay name to filter value
      if (key === "name") qSql += `name ILIKE '%${value}%'`;
      if (key === "minEmployees") qSql += `num_employees>=${value}`;
      if (key === "maxEmployees") qSql += `num_employees<=${value}`;
      //add 'and' to end of WHERE clause if not last filter in query
      if (index < numFilters - 1) qSql += " and ";
    }
    //close SQL query
    qSql += qEnd;
    console.log(qSql);
    const companiesRes = await db.query(qSql);
    // const companiesRes = await db.query(
    //   `SELECT handle,
    //               name,
    //               description,
    //               num_employees AS "numEmployees",
    //               logo_url AS "logoUrl"
    //        FROM companies
    //        ORDER BY name`
    // );
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    // data is key / value of changed field(s)
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
