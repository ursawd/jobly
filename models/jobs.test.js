"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./jobs.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 50000,
    equity: 0.2,
    company_handle: "c3",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    delete job.id;
    job.equity = Number(job.equity);
    expect(job).toEqual(newJob);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let mockReqQuery = {};
    let jobs = await Job.findAll(mockReqQuery);
    expect(jobs).toEqual([
      {
        id: expect.anything(),
        title: "j1",
        salary: 30000,
        equity: "0.1",
        companyhandle: "c1",
      },
      {
        id: expect.anything(),
        title: "j2",
        salary: 40000,
        equity: "0.2",
        companyhandle: "c2",
      },
      {
        id: expect.anything(),
        title: "j3",
        salary: 50000,
        equity: "0.3",
        companyhandle: "c3",
      },
    ]);
  });
  test("works: with filters", async function () {
    let mockReqQuery = { title: "3", minSalary: 50000 };
    let jobs = await Job.findAll(mockReqQuery);
    expect(jobs).toEqual([
      {
        id: expect.anything(),
        title: "j3",
        salary: 50000,
        equity: "0.3",
        companyhandle: "c3",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const result = await db.query(
      `SElECT id 
    FROM jobs 
    WHERE title = $1`,
      ["j3"]
    );
    const jobid = result.rows[0].id;
    let job = await Job.get(jobid);
    expect(job).toEqual({
      id: jobid,
      title: "j3",
      salary: 50000,
      equity: "0.3",
      companyhandle: "c3",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(9999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "j4",
    salary: 60000,
    equity: "0.9",
  };

  test("works", async function () {
    const result = await db.query(
      `SElECT id 
    FROM jobs 
    WHERE title = $1`,
      ["j3"]
    );
    const jobid = result.rows[0].id;

    let job = await Job.update(jobid, updateData);
    expect(job).toEqual({
      id: jobid,
      companyHandle: "c3",
      ...updateData,
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(9999, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      const result = await db.query(
        `SElECT id 
      FROM jobs 
      WHERE title = $1`,
        ["j3"]
      );
      const jobid = result.rows[0].id;

      await Job.update(jobid, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const result = await db.query(
      `SElECT id 
    FROM jobs 
    WHERE title = $1`,
      ["j3"]
    );
    const jobid = result.rows[0].id;

    await Job.remove(jobid);
    const res = await db.query(`SELECT title FROM jobs WHERE id=${jobid}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove(99999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
