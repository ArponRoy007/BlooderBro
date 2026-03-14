const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);

router.get("/register", authController.getRegister);
router.post("/register", authController.postRegister);

// The new popup dashboard route!
router.post("/forgot-password", authController.postForgotPassword);

router.get("/logout", authController.logout);

module.exports = router;