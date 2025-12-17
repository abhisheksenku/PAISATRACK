// ==========================================================
//  PaisaTrack — Main Server (app.js)
// ==========================================================

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const http = require("http");
const { initializeSocket } = require("./socket/index");


// Middleware
const userAuthenticate = require("./middleware/auth");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const premiumRoutes = require("./routes/premiumRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

// Database
const connectDB = require("./util/database");

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = initializeSocket(server); // attach websockets

// ==========================================================
// MIDDLEWARE SETUP
// ==========================================================

// Body parser (URL encoded)
app.use(bodyParser.urlencoded({ extended: false }));

// JSON parser (MUST be before routes)
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, "public")));

// Logging middleware (request logger)
app.use((req, res, next) => {
  res.setHeader("Set-Cookie", "X-Dummy=; Max-Age=0; HttpOnly");
  next();
});

app.use((req, res, next) => {
  console.log(`Request->${req.method}${req.url}`);
  next();
});

// ==========================================================
// API ROUTES
// ==========================================================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/expenses", expenseRoutes);

// ==========================================================
// FRONTEND ROUTES (HTML Pages)
// ==========================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/expense", userAuthenticate.authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "expense.html"));
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "forgotPassword.html"));
});

app.get("/reset-password/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reset-password.html"));
});

// ==========================================================
// START SERVER
// ==========================================================

async function startServer() {
  try {
    await connectDB();
     // Uncomment if you want to reset DB
    //await db.dropDatabase();

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
  }
}

startServer();
