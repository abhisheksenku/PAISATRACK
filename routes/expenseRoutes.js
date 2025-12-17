// routes/expenseRoutes.js
const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/expenseController");
const userAuthenticate =  require('../middleware/auth');

// ======================================================
//  EXPENSE ROUTES (Protected)
// ======================================================

// Add expense (income/expense)
router.post("/add", userAuthenticate.authenticate, expenseController.addExpense);

// Get paginated expenses
router.get("/list", userAuthenticate.authenticate, expenseController.getExpensesPaginated);

router.get("/all", userAuthenticate.authenticate, expenseController.getAllExpenses);


// Update expense
router.put("/update/:id", userAuthenticate.authenticate, expenseController.updateExpense);

// Delete expense (soft delete)
router.delete("/delete/:id", userAuthenticate.authenticate, expenseController.deleteExpense);

// Get filtered expenses → Reports page
router.get("/filter", userAuthenticate.authenticate, expenseController.getFilteredExpenses);

// Download report (CSV)
router.get("/download", userAuthenticate.authenticate, expenseController.downloadReport);
router.post(
  "/bulk-delete",
  userAuthenticate.authenticate,
  expenseController.bulkDeleteExpenses
);
router.get("/analytics/monthly", userAuthenticate.authenticate, expenseController.monthlyAnalytics);

module.exports = router;
