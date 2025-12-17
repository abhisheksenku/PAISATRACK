const User = require("../models/user");
const bcrypt = require("bcrypt");
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      isPremium: user.isPremium,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await User.updateById(userId, { password: newHash });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("UPDATE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const updateDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const updated = await User.updateById(userId, {
      name,
      phone,
    });

    if (!updated) {
      return res.status(400).json({ message: "Failed to update details" });
    }

    res.status(200).json({
      message: "Details updated successfully",
      name,
      phone,
    });
  } catch (err) {
    console.log("UPDATE DETAILS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Soft delete (recommended)
    await User.updateById(userId, {
      deletedAt: new Date(),
    });

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.log("DELETE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const setThreshold = async (req, res) => {
  try {
    const userId = req.user.id;
    const { threshold } = req.body;

    if (!threshold || threshold <= 0) {
      return res.status(400).json({ message: "Invalid threshold" });
    }

    await User.findByIdAndUpdate(userId, {
      alertThreshold: threshold,
      updatedAt: new Date()
    });

    res.json({ success: true, threshold });

  } catch (err) {
    res.status(500).json({ message: "Failed to update threshold" });
  }
};
const logout = (req, res) => {
  res.clearCookie("token");  // If JWT stored in cookie
  return res.json({ success: true, message: "Logged out" });
};
module.exports = {
  getProfile,
  updatePassword,
  updateDetails,
  deleteAccount,
  setThreshold,
  logout
};
