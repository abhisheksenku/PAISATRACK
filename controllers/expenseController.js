// controllers/expenseController.js
const Expense = require("../models/expense");
const User = require("../models/user");
const mongoose = require("mongoose");
const { sendMail } = require("../services/emailService");

// ======================================================
// ADD EXPENSE (income/expense)
// ======================================================
async function addExpense(req, res) {
  try {
    const userId = req.user.id;
    const { amount, description, category, type, date, note } = req.body;

    const expense = await Expense.create({
      userId,
      amount: Number(amount),
      description,
      category,
      type,
      date,
      note
    });

    // Update User Totals
    if (type === "expense") {
      await User.updateById(userId, { $inc: { totalExpenses: amount } });
    } else {
      await User.updateById(userId, { $inc: { totalIncome: amount } });
    }

    // ----------------------------------------------------
    // Budget Threshold Check (NO SOCKET HERE)
    // ----------------------------------------------------
    const userDoc = await User.findById(userId).lean();
    const threshold = userDoc?.alertThreshold;

    if (threshold && threshold > 0) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const agg = await Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: "expense",
            deletedAt: null,
            date: { $gte: monthStart, $lt: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const totalThisMonth = agg[0]?.total || 0;
      const currentMonthKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;

      if (totalThisMonth >= threshold) {
        if (userDoc.lastBudgetAlertMonth !== currentMonthKey) {
          
          // Async EMAIL ONLY
          if (userDoc.email) {
            sendMail({
              toEmail: userDoc.email,
              subject: "Budget Alert Exceeded",
              html: `<p>You have spent ₹${totalThisMonth} this month, exceeding your alert threshold ₹${threshold}.</p>`
            }).catch(() => {});
          }

          await User.findByIdAndUpdate(userId, {
            lastBudgetAlertMonth: currentMonthKey
          });
        }
      }
    }

    return res.status(201).json({ success: true, expense });

  } catch (err) {
    console.error("Add expense failed:", err);
    res.status(500).json({ success: false, message: "Could not add expense" });
  }
}

// ======================================================
// GET ALL EXPENSES FOR DASHBOARD + RECENT EXPENSES
// ======================================================
const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAllByUser(req.user.id);
    res.json(expenses);
  } catch (error) {
    console.error("Get all expenses error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================================================
// GET PAGINATED EXPENSES
// ======================================================
const getExpensesPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const data = await Expense.findByUserPaginated(req.user.id, page, limit);

    res.json(data);
  } catch (error) {
    console.error("Fetch paginated expenses error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================================================
// EDIT EXPENSE
// ======================================================
// ======================================================
// EDIT EXPENSE (UPDATE + UPDATE USER TOTALS)
// ======================================================
const updateExpense = async (req, res) => {
  try {
    const id = req.params.id;
    const { amount, description, category, type, date, note } = req.body;

    const old = await Expense.findById(id);
    if (!old) return res.status(404).json({ error: "Expense not found" });

    // Update the record
    await Expense.updateById(id, {
      amount,
      description,
      category,
      type,
      date,
      note,
    });

    // ------------------------------------------
    // UPDATE USER TOTAL INCOME / EXPENSE
    // ------------------------------------------
    const diff = amount - old.amount;

    if (type === "expense") {
      await User.updateById(req.user.id, { $inc: { totalExpenses: diff } });
    } else {
      await User.updateById(req.user.id, { $inc: { totalIncome: diff } });
    }

    res.json({ message: "Expense updated successfully" });
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================================================
// DELETE EXPENSE (soft delete)
// ======================================================
// ======================================================
// DELETE EXPENSE (SOFT DELETE + UPDATE USER TOTALS)
// ======================================================
const deleteExpense = async (req, res) => {
  try {
    const id = req.params.id;

    const exp = await Expense.findById(id);
    if (!exp) return res.status(404).json({ error: "Not found" });

    // reduce totals
    if (exp.type === "expense") {
      await User.updateById(req.user.id, {
        $inc: { totalExpenses: -exp.amount },
      });
    } else {
      await User.updateById(req.user.id, {
        $inc: { totalIncome: -exp.amount },
      });
    }

    // soft delete
    await Expense.softDelete(id);

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================================================
// REPORT FILTER (for frontend reports page)
// ======================================================
const getFilteredExpenses = async (req, res) => {
  try {
    const { month, year, start, end, category, type } = req.query;


    const filters = {
      month,
      year,
      start,
      end,
      category,
      type
    };

    const expenses = await Expense.findAllForReport(req.user.id, filters);
    res.json(expenses);
  } catch (error) {
    console.error("Report filter error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
const monthlyAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = parseInt(req.query.month);
    const year = new Date().getFullYear();

    const user = await User.findById(userId).lean();
    const threshold = user?.alertThreshold || 0;

    // USE MODEL STATIC
    const agg = await Expense.getMonthlyAnalytics(userId, month, year);

    const income = agg[0]?.income || 0;
    const expense = agg[0]?.expense || 0;
    const remaining = income - expense;

    res.json({
      income,
      expense,
      remaining,
      threshold
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Analytics fetch failed" });
  }
};

// ======================================================
// DOWNLOAD REPORT (CSV)
// ======================================================
const downloadReport = async (req, res) => {
  try {
    const expenses = await Expense.findAllForReport(req.user.id, {});

    let csv = "Date,Description,Category,Type,Amount,Note\n";

    expenses.forEach((e) => {
      csv += `${new Date(e.date).toLocaleDateString()},${e.description},${
        e.category
      },${e.type},${e.amount},${e.note || ""}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=report.csv");

    res.send(csv);
  } catch (error) {
    console.error("Download report error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const bulkDeleteExpenses = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No expense IDs provided" });
    }

    const result = await Expense.bulkDelete(userId, ids);

    res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ message: "Failed to bulk delete expenses" });
  }
};

module.exports = {
  addExpense,
  getAllExpenses,
  getExpensesPaginated,
  updateExpense,
  deleteExpense,
  getFilteredExpenses,
  downloadReport,
  bulkDeleteExpenses,
  monthlyAnalytics
};
