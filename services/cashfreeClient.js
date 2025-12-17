// services/cashfreeClient.js
const { Cashfree, CFEnvironment } = require("cashfree-pg");
require("dotenv").config();

// Create and export a single Cashfree instance
const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,        // Change to PRODUCTION later
  process.env.CF_APP_ID,
  process.env.CF_SECRET_KEY
);

module.exports = cashfree;
