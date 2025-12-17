const jwt = require("jsonwebtoken");

/**
 * Attaches authentication middleware to the Socket.IO server.
 * It verifies the JWT and attaches `socket.user` (with id and role)
 * for use in all other handlers.
 */
function socketAuth(io) {
  io.use((socket, next) => {
    try {
      // 1. Get the token
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication error: No token"));
      }

      // 2. Verify the token
      // We assume the payload is { user: { id: 1, role: 'admin' }, ... }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.user || !decoded.user.id ) {
         return next(new Error("Authentication error: Invalid token payload"));
      }
      
      // 3. ATTACH THE FULL USER OBJECT
      // This is the crucial fix
      
      // Attach id, role, and isPremium
      socket.user = {
        id: decoded.user.id,
        isPremium: decoded.user.isPremium || false
      };
      
      // 4. All good, allow the connection
      next();
      
    } catch (err) {
      console.error("Socket Auth: Invalid token.", err.message);
      return next(new Error("Authentication error"));
    }
  });
}

module.exports = socketAuth;