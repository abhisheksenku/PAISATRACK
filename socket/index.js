const { Server } = require("socket.io");
const socketAuth = require("./middleware");
const registerExpenseHandlers = require("./handlers/expenseHandler");
const registerPremiumHandlers = require("./handlers/premiumHandler");
const { setIo } = require("./io");
function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  setIo(io);
  // Attach auth middleware
  socketAuth(io);

  io.on("connection", (socket) => {
    const user = socket.user;

    // Each user gets their own private room
    socket.join(`user_${user.id}`);

    // Premium room for real-time leaderboard
    if (user.isPremium) {
      socket.join("premium_users");
    }

    // Register all handlers
    registerExpenseHandlers(io, socket);
    registerPremiumHandlers(io, socket);

    // Disconnect handling
    socket.on("disconnect", () => {
      console.log(`User ${user.id} disconnected`);
    });
  });

  return io;
}

module.exports = { initializeSocket };
