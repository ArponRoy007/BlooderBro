const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.get("/login", adminController.getLogin);
router.post("/login", adminController.postLogin);
router.get("/dashboard", adminController.getDashboard);
router.get("/logout", adminController.logout);

module.exports = router;