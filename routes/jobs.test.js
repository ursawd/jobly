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
  test("ok create company: admin", async function () {
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
    const resp = await request(app).get(`/jobs/id`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });
  //--------------------------------------------------------

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    });
  });
  //--------------------------------------------------------

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/****************** PATCH /companies/:handle ******************** */

describe("PATCH /companies/:handle", function () {
  //--------------------------------------------------------

  test("works for users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });
  //--------------------------------------------------------

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/companies/c1`).send({
      name: "C1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });
  //-----------------------------------------------------------
  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });
  //--------------------------------------------------------

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
  //--------------------------------------------------------

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/********************* DELETE /companies/:handle ******************/
/**************************************************************** */
describe("DELETE /companies/:handle", function () {
  //--------------------------------------------------------

  test("works for users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });
  //--------------------------------------------------------

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });
  //--------------------------------------------------------

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u1TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });
});
/*********************END OF TESTS******************** */
