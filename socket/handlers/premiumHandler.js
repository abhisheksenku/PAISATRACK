// socket/handlers/premiumHandler.js
const User = require("../../models/user");

// function registerPremiumHandlers(io, socket) {

//   socket.on("premium_status_changed", async () => {
//     try {
//       const userId = socket.user.id;

//       // Always fetch updated user data
//       const user = await User.findById(userId);

//       if (!user) return;

//       const payload = {
//         userId,
//         isPremium: user.isPremium
//       };

//       // Notify all active sessions of this user
//       io.to(`user_${userId}`).emit("premium_status_changed", payload);

//     } catch (err) {
//       console.error("WS premium handler error:", err);
//       socket.emit("premium_error", { message: "Failed to update premium status" });
//     }
//   });

// }
// socket/handlers/premiumHandler.js

const registerPremiumHandlers = (io, socket) => {
  const userId = socket.user.id;

  // --------------------------------------
  // 5. PREMIUM STATUS CHANGED
  // --------------------------------------
  socket.on("premium_status_changed", async () => {
    try {
      // 1) Fetch updated DB value
      const user = await User.findById(userId);

      if (!user) return;

      // 2) If user is now premium → join premium room
      if (user.isPremium) {
        socket.join("premium_users");
        socket.user.isPremium = true; // update socket memory
        console.log("User joined premium_users room:", userId);
      }

      // 3) Notify user's own sessions
      io.to(`user_${userId}`).emit("premium_status_changed", {
        userId,
        isPremium: user.isPremium,
      });
    } catch (err) {
      console.error("premium_status_changed handler error:", err);
    }
  });

  // --------------------------------------
  // 6. LEADERBOARD REFRESH (premium users only)
  // --------------------------------------
  socket.on("leaderboard_refresh_request", () => {
    io.to("premium_users").emit("leaderboard_refresh");
  });
};

module.exports = registerPremiumHandlers;
