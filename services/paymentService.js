// services/cashfreeService.js
const cashfree = require("./cashfreeClient");

// ============================================================
//  CREATE PAYMENT ORDER (Cashfree)
// ============================================================
const createOrder = async (
  orderId,
  orderAmount,
  orderCurrency = "INR",
  customerID,
  customerPhone
) => {
  try {
    // Order expiry: +1 hr
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    const formattedExpiryDate = expiryDate.toISOString();

    const requestBody = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: orderCurrency,
      customer_details: {
        customer_id: customerID,
        customer_phone: customerPhone,
        
      },
      order_meta: {
        return_url: `http://localhost:3000/api/premium/payment-status/${orderId}`,
        payment_methods: "cc,dc,upi"
      },
      order_expiry_time: formattedExpiryDate
    };

    const response = await cashfree.PGCreateOrder(requestBody);
    return response.data.payment_session_id;

  } catch (error) {
    console.error("Cashfree createOrder error:", error.message);
    throw error;
  }
};

// ============================================================
//  CHECK PAYMENT STATUS
// ============================================================
const getPaymentStatus = async (orderId) => {
  try {
    const response = await cashfree.PGOrderFetchPayments(orderId);
    const transactions = response.data;

    let orderStatus = "Failure";

    if (transactions.some((txn) => txn.payment_status === "SUCCESS")) {
      orderStatus = "Success";
    } else if (transactions.some((txn) => txn.payment_status === "PENDING")) {
      orderStatus = "Pending";
    }

    return orderStatus;

  } catch (error) {
    console.error("Cashfree getPaymentStatus error:", error.message);
    throw error;
  }
};

module.exports = {
  createOrder,
  getPaymentStatus
};
