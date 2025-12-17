// routes/premiumRoutes.js
const express = require("express");
const router = express.Router();
const premiumController = require("../controllers/premiumController");
const userAuthenticate =  require('../middleware/auth');

// Buy Premium → create payment order
router.post(
  "/create-order",
  userAuthenticate.authenticate,
  premiumController.createPremiumOrder
);

// Verify Payment status
router.get(
  "/payment-status/:orderId",
  userAuthenticate.authenticate,
  premiumController.verifyPremiumPayment
);
router.post(
  "/verify-payment",
  userAuthenticate.authenticate,
  premiumController.verifyPaymentUpdateUser
);


// Leaderboard (premium feature)
router.get(
  "/leaderboard",
  userAuthenticate.authenticate,
  premiumController.getLeaderboard
);

module.exports = router;
