"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u1TokenAdmin,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);
/********************* helper functions *************** */

const getMockId = async function () {
  //returns id of job in jobs table of db
  const result = await db.query(
    `SELECT id 
  FROM jobs 
  WHERE title = 'j3'`
  );
  return result.rows[0].id;
};

/****************************************************** */

/********************* POST /jobs **************** */
/****************************************************** */
describe("POST /jobs", function () {
  const newJob = {
    title: "New",
    salary: 123456,
    equity: 0.5,
    company_handle: "c3",
  };
  //--------------------------------------------------------
  test("fail create job: not admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });
  //--------------------------------------------------------
  test("ok create job: admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    delete resp.body.job.id;
    resp.body.job.equity = Number(resp.body.job.equity);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });
  //--------------------------------------------------------

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "newnewjob",
        salary: 111111,
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
  //--------------------------------------------------------

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        salary: "not-a-url",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/******************* GET /jobs ****************** */
/***************************************************** */
describe("GET /jobs", function () {
  //--------------------------------------------------------
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });
  //--------------------------------------------------------

  test("works for filters", async function () {
    const resp = await request(app).get("/jobs?title=3");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.anything(),
          title: "j3",
          salary: 50000,
          equity: "0.3",
          companyhandle: "c3",
        },
      ],
    });
  });
  test("fails for bad filters", async function () {
    const resp = await request(app).get("/jobs?color:blue");
    expect(resp.statusCode).toEqual(400);
  });
  //--------------------------------------------------------

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/******************* GET /companies/:handle ********************/
/************************************************************* */
describe("GET /jobs/:id", function () {
  //--------------------------------------------------------

  test("works for anon", async function () {
    const id = await getMockId();
    const resp = await request(app).get(`/jobs/${id}`);
    expect(resp.body).toEqual({
      job: {
        id: id,
        title: "j3",
        salary: 50000,
        equity: "0.3",
        companyhandle: "c3",
      },
    });
  });
  //--------------------------------------------------------

  //--------------------------------------------------------

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/99999`);
    expect(resp.statusCode).toEqual(404);
  });
});

/****************** PATCH /companies/:handle ******************** */

describe("PATCH /jobs/:id", function () {
  //--------------------------------------------------------

  test("works for jobs", async function () {
    const id = await getMockId();
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({
        salary: 66666,
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.body).toEqual({
      job: {
        id: id,
        title: "j3",
        salary: 66666,
        equity: "0.3",
        companyHandle: "c3",
      },
    });
  });
  //--------------------------------------------------------

  test("unauth for anon", async function () {
    const id = await getMockId();
    const resp = await request(app).patch(`/jobs/${id}`).send({
      salary: 777777,
    });
    expect(resp.statusCode).toEqual(401);
  });
  //-----------------------------------------------------------
  test("not found on no such jobs", async function () {
    const resp = await request(app)
      .patch(`/jobs/99999`)
      .send({
        title: "new title",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });
  //--------------------------------------------------------

  test("bad request on id change attempt", async function () {
    const id = await getMockId();
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({
        id: 12345,
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
  //--------------------------------------------------------

  test("bad request on invalid data", async function () {
    const id = await getMockId();
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({
        salary: "not a number",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/********************* DELETE /companies/:handle ******************/
/**************************************************************** */
describe("DELETE /jobs/:id", function () {
  //--------------------------------------------------------

  test("works for users", async function () {
    const id = await getMockId();
    const resp = await request(app)
      .delete(`/jobs/${id}`)
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.body).toEqual({ deleted: `${id}` });
  });
  //--------------------------------------------------------

  test("unauth for anon", async function () {
    const id = await getMockId();
    const resp = await request(app).delete(`/jobs/${id}`);
    expect(resp.statusCode).toEqual(401);
  });
  //--------------------------------------------------------

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/123456`)
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });
});
/*********************END OF TESTS******************** */
