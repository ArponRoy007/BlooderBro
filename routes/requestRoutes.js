const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const { isLoggedIn } = require("../middleware/auth");

router.get("/", isLoggedIn, requestController.getRequestForm);
router.post("/", isLoggedIn, requestController.postRequest);
router.post("/fulfill/:id", isLoggedIn, requestController.fulfillRequest);

// NEW ROUTE: For verifying the donor
router.post("/confirm-donor/:reqId/:donorId", isLoggedIn, requestController.confirmDonor);

module.exports = router;