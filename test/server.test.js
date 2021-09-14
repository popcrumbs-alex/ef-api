const chai = require("chai");
const api = require("../server");
const chaiHttp = require("chai-http");
const { expect } = require("chai");

chai.use(chaiHttp);

describe("Task API routes", function () {
  describe("Test server status", function () {
    it("Should send a string of CF-EF-BRIDGE API IS RUNNING", function (done) {
      chai
        .request(api)
        .get("/")
        .end((err, res) => {
          if (err) done(err);
          expect(res).to.be.an("object");
          done();
        });
    });
  });

  describe("Test POST route for /api/cf-data", function () {
    it("Should post cf data to everflow", function (done) {
      chai
        .request(api)
        .post("/api/cf-data/")
        .end((err, res) => {
          if (err) done(err);
          console.log("test result", res.body);
          expect(res).to.have.status(200);
          expect(res).to.be.an("object");
          done();
        });
    });
  });
});
