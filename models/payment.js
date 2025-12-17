const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: { type: String, required: true },
    paymentId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "PENDING" },
    purpose: { type: String, default: "premium" },

    // soft delete not needed, so only timestamps
  },
  { timestamps: true }
);
paymentSchema.statics.updateStatus = function (orderId, fields) {
  fields.updatedAt = new Date();
  return this.findOneAndUpdate({ orderId }, fields, { new: true });
};
paymentSchema.statics.findByOrderId = function (orderId) {
  return this.findOne({ orderId });
};
module.exports = mongoose.model("Payment", paymentSchema);
