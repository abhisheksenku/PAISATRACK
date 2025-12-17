const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();

const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = req.header("Authorization") || req.cookies.token;
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7); // remove 'Bearer ' prefix
    }
    console.log("Token received:", token);
    if (!token) {
      //return res.redirect("/login"); // or use res.status(401).json({ message: 'No token provided' });
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);
    // Extract userId from token
    const userId = decoded.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    req.user = { id: userId };
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    res.status(500).json({ success: false, message: "Authentication failed" });
  }
};

module.exports = { authenticate };
