"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   * data should be {  title, salary, equity, company_handle }
   * Returns { id, title, salary, equity, company_handle }
   * Throws BadRequestError if job already in database.
   * CREATE TABLE jobs (
   * id SERIAL PRIMARY KEY,
   * title TEXT NOT NULL,
   * salary INTEGER CHECK (salary >= 0),
   * equity NUMERIC CHECK (equity <= 1.0),
   * company_handle VARCHAR(25) NOT NULL
   *   REFERENCES companies ON DELETE CASCADE
   * );
   * */

  static async create({ title, salary, equity, company_handle }) {
    const duplicateCheck = await db.query(
      `SELECT title
           FROM jobs
           WHERE title = $1`,
      [title]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}`);

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id,title, salary, equity, company_handle`,
      [title, salary, equity, company_handle]
    );
    const job = result.rows[0];

    return job;
  }
  //GET/ route class method to filter jobs by title, minSalary, hasEquity.

  /** Find all jobs. Allows filter in query string for job title,
   *  minSalary, hasEquity
   * /jobs?title=accountant&minSalary=200&hasEquity=false
   *
   * Returns [{ id,title, salary, equity, company_handle}, ...]
   * */

  static async findAll(reqquery) {
    //create SQL query string beginning. Will add to string if
    //filters are present in query string
    let qSql = `SELECT id, title,
        salary,
        equity,
        company_handle as companyHandle
        FROM jobs`;
    //create closing of SQL query string
    const qEnd = ` ORDER BY title`;
    //get number of queries
    const numFilters = Object.keys(reqquery).length;
    //if any queries, add SQL WHERE clause to begin SQL filter statements
    if (numFilters !== 0) qSql += ` WHERE `;
    //iterate through filters, get index, key and value of filter
    for (let [index, [key, value]] of Object.entries(
      Object.entries(reqquery)
    )) {
      //if filter name present add to SQL statement
      // use ILIKE to match any part of compnay name to filter value
      if (key === "title") qSql += `title ILIKE '%${value}%'`;
      if (key === "minSalary") qSql += `salary>=${value}`;
      if (key === "hasEquity") qSql += `equity=${value}`;
      //add 'and' to end of WHERE clause if not last filter in query
      if (index < numFilters - 1) qSql += " and ";
    }
    //close SQL query
    qSql += qEnd;
    console.log(qSql);
    const jobsRes = await db.query(qSql);
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns
   *   where job is { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    id = +id;
    const jobRes = await db.query(
      `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle as companyHandle
           FROM jobs
           WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    // data is key / value of changed field(s)
    const { setCols, values } = sqlForPartialUpdate(data, {
      companyHandle: "company_handle",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
