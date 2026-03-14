const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { isLoggedIn } = require("../middleware/auth");

router.get("/", isLoggedIn, profileController.getProfile);
router.post("/update", isLoggedIn, profileController.updateProfile);
router.post("/delete", isLoggedIn, profileController.deleteProfile);
router.post("/log-donation/:reqId", isLoggedIn, profileController.logDonation);

// ✅ THIS IS THE MISSING ROUTE FOR THE "CAN'T" BUTTON!
router.post("/ignore/:reqId", isLoggedIn, profileController.ignoreRequest);

module.exports = router;