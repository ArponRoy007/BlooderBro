const request = require("supertest");
const { expect } = require("chai");
const mongoose = require("mongoose");
const app = require("../server"); 
const BloodRequest = require("../models/BloodRequest");
const Review = require("../models/Review"); // ✅ Added Review model to check the database

describe("BlooderBro Application Tests", function() {
  this.timeout(10000); // Increased timeout slightly because emails take a second to send

  after(async () => {
    await mongoose.connection.close();
  });

  // --- 1. PUBLIC ROUTES ---
  describe("Public Routes", () => {
    it("Should load the Home Page successfully (GET /)", async () => {
      const res = await request(app).get("/");
      expect(res.status).to.equal(200);
      expect(res.text).to.include("Donate Blood. Save Lives.");
    });

    it("Should load the Registration Page (GET /register)", async () => {
      const res = await request(app).get("/register");
      expect(res.status).to.equal(200);
    });

    it("Should load the Login Page (GET /login)", async () => {
        const res = await request(app).get("/login");
        expect(res.status).to.equal(200);
    });
  });

  // --- 2. DATABASE MODEL TESTS ---
  describe("Database Models", () => {
    it("BloodRequest Model should be invalid if required fields are empty", () => {
      const reqDoc = new BloodRequest({}); 
      const err = reqDoc.validateSync(); 
      expect(err.errors.fullName).to.exist;
      expect(err.errors.bloodGroup).to.exist;
      expect(err.errors.pincode).to.exist;
    });
  });

  // --- 3. AUTHENTICATION LOGIC ---
  describe("Authentication Routes", () => {
    it("Should reject login with non-existent user (POST /login)", async () => {
      const res = await request(app)
        .post("/login")
        .send({ email: "fakeuser@example.com", password: "wrongpassword" });
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/login");
    });

    it("Should reject registration if missing required fields (POST /register)", async () => {
        const res = await request(app)
          .post("/register")
          .send({ name: "Incomplete User" }); 
        expect(res.status).to.equal(302);
        expect(res.header.location).to.equal("/register");
      });
  });

  // --- 4. THE BOSS LEVEL: AUTHENTICATED USER FLOW ---
  describe("Authenticated User Flow & Advanced Actions", () => {
    const agent = request.agent(app); 
    
    const testUser = {
      name: "Unit Test Hero",
      email: "test" + Date.now() + "@example.com", 
      password: "password123",
      confirmPassword: "password123", 
      phone: "9998887776",
      age: 25,
      gender: "Male",
      bloodGroup: "O+",
      address: "Test City",
      pincode: "700001",
      facebookLink: "http://facebook.com/test"
    };

    it("Should register a new user successfully", async () => {
      const res = await agent.post("/register").send(testUser);
      expect(res.status).to.equal(302); 
      expect(res.header.location).to.equal("/login");
    });

    it("Should login successfully", async () => {
      const res = await agent.post("/login").send({
        email: testUser.email,
        password: testUser.password
      });
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/"); 
    });

    it("Should allow logged-in user to view their Profile", async () => {
      const res = await agent.get("/profile");
      expect(res.status).to.equal(200);
      expect(res.text).to.include(testUser.name); 
    });

    it("Should update the user profile (POST /profile/update)", async () => {
      const res = await agent.post("/profile/update").send({
        email: testUser.email,
        phone: "1112223333", // Updated Phone
        address: "Updated City",
        pincode: "700002"
      });
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/profile");
    });

    let savedRequestId; // We will save the database ID here to use in the next tests

    it("Should submit a new Blood Request (POST /request)", async () => {
      const res = await agent.post("/request").send({
        fullName: "Test Patient Emergency",
        phone: "9999999999",
        email: "patient@example.com",
        bloodGroup: "O+",
        pincode: "700002",
        message: "Need blood fast",
        urgencyLevel: "emergency",
        hospitalName: "Test Hospital",
        hospitalAddress: "123 Test St"
      });
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/");

      // Let's find the request we just made in the database so we have its ID
      const reqDoc = await BloodRequest.findOne({ fullName: "Test Patient Emergency" });
      expect(reqDoc).to.not.be.null;
      savedRequestId = reqDoc._id;
    });

    it("Should log a donation for the specific request (POST /profile/log-donation/:reqId)", async () => {
      const res = await agent.post(`/profile/log-donation/${savedRequestId}`);
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/profile");
    });

    it("Should mark the request as fulfilled (POST /request/fulfill/:id)", async () => {
      const res = await agent.post(`/request/fulfill/${savedRequestId}`);
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/profile");
    });

    let savedReviewId;

    it("Should post a new review (POST /review)", async () => {
      const res = await agent.post("/review").send({
        rating: "5",
        text: "Unit testing is amazing!"
      });
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/");

      const revDoc = await Review.findOne({ text: "Unit testing is amazing!" });
      expect(revDoc).to.not.be.null;
      savedReviewId = revDoc._id;
    });

    it("Should delete the review (POST /review/delete/:id)", async () => {
      const res = await agent.post(`/review/delete/${savedReviewId}`);
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/");
    });

    it("Should delete the user account entirely (POST /profile/delete)", async () => {
      const res = await agent.post("/profile/delete");
      expect(res.status).to.equal(302);
      // Because account deletion logs you out, it redirects to /register
      expect(res.header.location).to.equal("/register");
    });

    it("Should block access to Profile page after account deletion (GET /profile)", async () => {
       const res = await agent.get("/profile");
       expect(res.status).to.equal(302); 
       expect(res.header.location).to.equal("/login");
    });
  });
});