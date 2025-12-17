// services/emailService.js
require("dotenv").config();
const nodemailer = require("nodemailer");

// --------------------------------------------
// CREATE TRANSPORTER (Gmail + App Password)
// --------------------------------------------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.MAIL,           // your Gmail
    pass: process.env.MAIL_PASSWORD,  // your 16-digit App Password
  },
});

// --------------------------------------------
// MAIN EMAIL SEND FUNCTION
// --------------------------------------------
async function sendMail({ toEmail, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL,
      to: toEmail,
      subject,
      html,
      text,
    });

    console.log("Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendMail };
