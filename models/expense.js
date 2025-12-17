const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    note: { type: String, default: "" },
    date: { type: Date, required: true },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
expenseSchema.statics.findAllByUser = function (userId) {
  return this.find({ userId, deletedAt: null }).sort({ date: -1 });
};
expenseSchema.statics.findByUserPaginated = async function (
  userId,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  const expenses = await this.find({ userId, deletedAt: null })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({ userId, deletedAt: null });

  return {
    expenses,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
expenseSchema.statics.updateById = function (id, fields) {
  fields.updatedAt = new Date();
  return this.findByIdAndUpdate(id, fields, { new: true });
};
expenseSchema.statics.softDelete = function (id) {
  return this.findByIdAndUpdate(id, { deletedAt: new Date() });
};
expenseSchema.statics.findAllForReport = function (userId, filters = {}) {
  const query = { userId, deletedAt: null };

  // ------------------------------------
  // DATE RANGE FILTERS
  // ------------------------------------
  if (filters.start) {
    query.date = { $gte: new Date(filters.start) };
  }

  if (filters.end) {
    const endDate = new Date(filters.end);
    endDate.setHours(23, 59, 59, 999);
    query.date = { ...(query.date || {}), $lte: endDate };
  }

  // ------------------------------------
  // CATEGORY FILTER
  // ------------------------------------
  if (filters.category && filters.category !== "All") {
    query.category = filters.category;
  }

  // ------------------------------------
  // TYPE FILTER (income/expense)
  // ------------------------------------
  if (filters.type && filters.type !== "All") {
    query.type = filters.type; // "income" or "expense"
  }

  // ------------------------------------
  // MONTH / YEAR FILTER ($expr required)
  // ------------------------------------
  const exprConditions = [];

  if (filters.month) {
    exprConditions.push({
      $eq: [{ $month: "$date" }, Number(filters.month)],
    });
  }

  if (filters.year) {
    exprConditions.push({
      $eq: [{ $year: "$date" }, Number(filters.year)],
    });
  }

  if (exprConditions.length > 0) {
    query.$expr = { $and: exprConditions };
  }

  return this.find(query).sort({ date: -1 });
};

expenseSchema.statics.bulkDelete = function (userId, ids) {
  return this.deleteMany({
    _id: { $in: ids },
    userId,
  });
};

expenseSchema.statics.getMonthlyAnalytics = function (userId, month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        deletedAt: null,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        income: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("Expense", expenseSchema);
