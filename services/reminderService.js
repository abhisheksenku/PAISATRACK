// services/reminderService.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const { Booking, Payment, User, Service, Staff } = require("../models/associations");
const { sendBookingReminder, sendPaymentReminderEmail } = require("./emailService");

// ============================================================
// == 1. Booking Reminders (appointments for tomorrow)
// ============================================================
async function sendBookingReminders() {
  console.log("CRON: Running daily booking reminder job...");

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const bookings = await Booking.findAll({
      where: { date: dateStr, status: "confirmed" },
      include: [
        { model: User, as: "User", attributes: ["name", "email"] },
        { model: Service, as: "Service", attributes: ["name"] },
        {
          model: Staff,
          as: "Staff",
          include: { model: User, as: "User", attributes: ["name"] },
        },
      ],
    });

    if (!bookings.length) {
      console.log("CRON: No upcoming bookings to remind.");
      return;
    }

    for (const booking of bookings) {
      await sendBookingReminder(booking);
    }
  } catch (err) {
    console.error("CRON: Booking reminder job failed:", err.message);
  }
}

// ============================================================
// == 2. Payment Reminders (payments from yesterday)
// ============================================================
async function sendPaymentReminders() {
  console.log("CRON: Running daily payment reminder job...");

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday.setHours(0, 0, 0, 0));
    const end = new Date(yesterday.setHours(23, 59, 59, 999));

    const payments = await Payment.findAll({
      where: {
        status: "SUCCESSFUL",
        createdAt: { [Op.between]: [start, end] },
      },
      include: [
        {
          model: Booking,
          as: "Booking",
          include: [
            { model: Service, as: "Service", attributes: ["name"] },
            { model: User, as: "User", attributes: ["name", "email"] },
          ],
        },
        { model: User, as: "User", attributes: ["name", "email"] },
      ],
    });

    if (!payments.length) {
      console.log("CRON: No payment reminders to send today.");
      return;
    }

    for (const p of payments) {
      const recipient = p.Booking?.User?.email || p.User?.email;
      const recipientName = p.Booking?.User?.name || p.User?.name || "Customer";
      if (!recipient) continue;

      await sendPaymentReminderEmail(recipient, recipientName, p.orderId, p.Booking || null);
    }
  } catch (err) {
    console.error("CRON: Payment reminder job failed:", err.message);
  }
}

// ============================================================
// == Schedule both cron jobs
// ============================================================

// Booking reminders: every day at 9 AM
cron.schedule("0 9 * * *", sendBookingReminders, { timezone: "Asia/Kolkata" });

// Payment reminders: every day at 10 AM
cron.schedule("0 10 * * *", sendPaymentReminders, { timezone: "Asia/Kolkata" });

console.log("✅ Reminder services initialized (booking @9AM, payment @10AM).");
// // RUN EVERY MINUTE FOR TESTING
// cron.schedule("* * * * *", sendBookingReminders, { timezone: "Asia/Kolkata" });
// cron.schedule("* * * * *", sendPaymentReminders, { timezone: "Asia/Kolkata" });

// console.log("⚠️ TEST MODE: Reminder jobs running every minute");

module.exports = { sendBookingReminders, sendPaymentReminders };
