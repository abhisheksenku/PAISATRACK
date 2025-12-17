const express = require("express");
const router = express.Router();
const userAuthenticate =  require('../middleware/auth');
const userController = require("../controllers/userController");
router.get("/fetch",userAuthenticate.authenticate,userController.getProfile );
router.post("/update-password", userAuthenticate.authenticate, userController.updatePassword);
router.post("/update-details", userAuthenticate.authenticate, userController.updateDetails);
router.post("/delete-account", userAuthenticate.authenticate, userController.deleteAccount);
router.post("/set-threshold", userAuthenticate.authenticate, userController.setThreshold);
router.post("/logout", userController.logout);

module.exports = router;