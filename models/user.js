const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },

    isPremium: { type: Boolean, default: false },

    totalExpenses: { type: Number, default: 0 },
    totalIncome: { type: Number, default: 0 },
    alertThreshold: { type: Number, default: null }, // monthly limit
    lastBudgetAlertMonth: { type: String, default: null }, // e.g., "2025-11"

    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ------------ STATIC METHODS (match old class API) ------------

// findByEmail
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

// updateById (custom behavior + updatedAt)
userSchema.statics.updateById = function (id, update) {
  update.updatedAt = new Date(); // matches your old code
  return this.findByIdAndUpdate(id, update, { new: true });
};

// findByResetToken
userSchema.statics.findByResetToken = function (token) {
  return this.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });
};

module.exports = mongoose.model("User", userSchema);
