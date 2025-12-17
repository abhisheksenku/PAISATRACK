const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const User = require("../models/user");
const { v4: uuidv4 } = require("uuid");
const { sendMail } = require("../services/emailService");
require("dotenv").config();
const generateAccessToken = (user) => {
  const payload = {
    user: {
      id: user._id,
      isPremium: user.isPremium   // MUST ADD
    },
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const signupUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password)
      return res.status(400).json({ message: "All fields required" });

    const existingUser = await User.findByEmail(email);
    if (existingUser)
      return res
        .status(400)
        .json({ message: "User with this email already exists." });

    const password_hash = await bcrypt.hash(password, saltRounds);

    const savedUser = await User.create({
      name,
      email,
      phone,
      password: password_hash,
    });

    res.status(201).json({
      message: "User registered successfully!",
      userId: savedUser._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// const signupUser = async (req, res) => {
//   try {
//     const { name, email, phone, password } = req.body;

//     if (!name || !email || !phone || !password)
//       return res.status(400).json({ message: "All fields required" });

//     const existingUser = await User.findByEmail(email);
//     if (existingUser)
//       return res
//         .status(400)
//         .json({ message: "User with this email already exists." });

//     const password_hash = await bcrypt.hash(password, saltRounds);

//     const newUser = new User({
//       name,
//       email,
//       phone,
//       password: password_hash,
//     });

//     const savedUser = await newUser.save(); // Mongoose save()

//     res.status(201).json({
//       message: "User registered successfully!",
//       userId: savedUser._id, // Mongoose uses _id instead of insertedId
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("LOGIN BODY:", req.body);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const loggeduser = await User.findByEmail(email);
    console.log("USER FOUND:", loggeduser);

    if (!loggeduser)
      return res.status(401).json({ message: "Invalid credentials" });

    // FIXED LINE ↓↓↓
    const isPasswordValid = await bcrypt.compare(password, loggeduser.password);
    console.log("PASSWORD MATCH:", isPasswordValid);

    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateAccessToken(loggeduser);
    console.log("TOKEN GENERATED:", token);

    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      })
      .json({
        message: "Login successful",
        token,
        user: {
          id: loggeduser._id,
          name: loggeduser.name,
          email: loggeduser.email,
        },
      });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findByEmail(email);
    if (!user)
      return res
        .status(200) // don't reveal whether email exists
        .json({ message: "If this email exists, a reset link has been sent." });

    const token = uuidv4();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await User.updateById(user._id, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    try {
      await sendMail({
        toEmail: email,
        subject: "Reset your password",
        html: `<p>Hello,</p>
               <p>You requested a password reset. Click below:</p>
               <a href="${resetLink}">Reset Password</a>
               <p>Link expires in 15 minutes.</p>`,
        text: `Visit the following link to reset your password: ${resetLink}`,
      });
    } catch (err) {
      console.error("Email sending failed:", err);
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    res
      .status(200)
      .json({ message: "If this email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const updatenewPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!token) return res.status(400).json({ error: "Token is required" });
  if (!newPassword || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  try {
    // Fetch user using resetToken + expiry check
    const user = await User.findByResetToken(token);

    if (!user) {
      return res.status(400).json({ error: "Token expired or invalid" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password + clear reset fields
    await User.updateById(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports = {
  signupUser,
  loginUser,
  requestPasswordReset,
  updatenewPassword,
};
