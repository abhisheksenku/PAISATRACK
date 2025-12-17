const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
router.post("/signup", authController.signupUser);
router.post("/login", authController.loginUser);
router.post("/forgot-password", authController.requestPasswordReset);
router.post("/reset-password/:token", authController.updatenewPassword);
module.exports = router;