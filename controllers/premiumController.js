// controllers/premiumController.js
const User = require("../models/user");
const { createOrder, getPaymentStatus } = require("../services/paymentService");
const Payment = require("../models/payment");

// =============================================================
// 1. CREATE ORDER → called when user clicks "Buy Premium"
// =============================================================
const createPremiumOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const orderId = `PREMIUM_${Date.now()}`;
    const amount = 299;

    // 1. Create order at Cashfree
    const paymentSessionId = await createOrder(
      orderId,
      amount,
      "INR",
      userId,
      user.phone
    );

    // 2. Save payment record via Mongoose (NO ObjectId conversion)
    await Payment.create({
      userId,
      orderId,
      amount,
      status: "PENDING",
    });

    res.json({ orderId, paymentSessionId });
  } catch (error) {
    console.error("Error creating premium order:", error);
    res.status(500).json({ message: "Could not create premium order" });
  }
};

// =============================================================
// 2. VERIFY PAYMENT → Cashfree redirects here
// =============================================================
const verifyPremiumPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    // Check Cashfree status
    const status = await getPaymentStatus(orderId);

    // Update payment record
    await Payment.updateStatus(orderId, {
      status,
      verifiedAt: new Date(),
    });

    if (status === "Success") {
      // Set user as Premium
      await User.updateById(req.user.id, { isPremium: true });

      return res.json({
        success: true,
        message: "Payment successful. You are now a premium user.",
      });
    }

    return res.json({
      success: false,
      message: "Payment failed or pending.",
      status,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

// =============================================================
// 3. GET LEADERBOARD (Premium-only)
// =============================================================
const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({}, "name totalExpenses").sort({
      totalExpenses: -1,
    });

    res.json({ users });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Unable to fetch leaderboard" });
  }
};
// =============================================================
// VERIFY PAYMENT (POST) — Used by frontend after Cashfree checkout
// =============================================================
const verifyPaymentUpdateUser = async (req, res) => {
  try {
    console.log("VERIFY BODY:", req.body);
    const { orderId, paymentId } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderId or paymentId" });
    }

    // 1) Fetch Cashfree payment status
    const status = await getPaymentStatus(orderId);

    // 2) Update payment record
    await Payment.updateStatus(orderId, {
      paymentId,
      status,
      verifiedAt: new Date(),
    });

    // 3) If success → upgrade the user
    if (status === "Success") {
      await User.updateById(req.user.id, { isPremium: true });

      return res.json({
        success: true,
        message: "Premium activated successfully",
        status,
      });
    }

    return res.json({
      success: false,
      message: "Payment not successful",
      status,
    });
  } catch (error) {
    console.error("POST verify payment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};

module.exports = {
  createPremiumOrder,
  verifyPremiumPayment,
  getLeaderboard,
  verifyPaymentUpdateUser,
};
