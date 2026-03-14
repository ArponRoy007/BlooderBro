const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const { isLoggedIn } = require("../middleware/auth");

router.get("/", homeController.getIndex);
router.post("/review", isLoggedIn, homeController.postReview);
router.post("/review/delete/:id", isLoggedIn, homeController.deleteReview);

module.exports = router;