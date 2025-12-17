// socket/handlers/expenseHandler.js
const Expense = require("../../models/expense");

// function registerExpenseHandlers(io, socket) {
//   socket.on("add_expense", async (data) => {
//     try {
//       // 1. Save new expense in MongoDB
//       const exp = new Expense({
//         userId: socket.user.id,
//         amount: data.amount,
//         type: data.type,
//         category: data.category,
//         description: data.description,
//         note: data.note || "",
//         date: data.date,
//       });

//       await exp.save();

//       // 2. Prepare payload
//       const payload = {
//         _id: exp._id,
//         userId: exp.userId,
//         amount: exp.amount,
//         type: exp.type,
//         category: exp.category,
//         description: exp.description,
//         note: exp.note,
//         date: exp.date,
//       };

//       // 3. Emit to that user's room → real-time update
//       io.to(`user_${socket.user.id}`).emit("expense_added", payload);
//       io.to("premium_users").emit("leaderboard_refresh");

//     } catch (err) {
//       console.error("WS add_expense failed:", err);
//       socket.emit("expense_error", { message: "Failed to add expense" });
//     }
//   });
//   socket.on("edit_expense", async (data) => {
//     try {
//       const { id, fields } = data;

//       await Expense.updateById(id, fields);

//       // Prepare broadcast payload
//       const payload = {
//         _id: id,
//         ...fields,
//       };

//       // Send updated expense to the user room
//       io.to(`user_${socket.user.id}`).emit("expense_updated", payload);
//     } catch (err) {
//       console.error("WS edit_expense error:", err);
//       socket.emit("expense_error", { message: "Failed to update expense" });
//     }
//   });
//   socket.on("delete_expense", async (data) => {
//     try {
//       const { id } = data;

//       // Soft-delete OR delete permanently (your model uses softDelete)
//       await Expense.softDelete(id);

//       // Broadcast to all active sessions of the same user
//       io.to(`user_${socket.user.id}`).emit("expense_deleted", { _id: id });
//     } catch (err) {
//       console.error("WS delete_expense error:", err);
//       socket.emit("expense_error", { message: "Failed to delete expense" });
//     }
//   });
//   socket.on("bulk_delete_expenses", async (data) => {
//   try {

//     const { ids } = data;   // array of expense IDs

//     await Expense.bulkDelete(socket.user.id, ids);

//     // Notify all active sessions
//     io.to(`user_${socket.user.id}`).emit("expenses_bulk_deleted", { ids });

//   } catch (err) {
//     console.error("WS bulk_delete_expenses error:", err);
//     socket.emit("expense_error", { message: "Failed to bulk delete expenses" });
//   }
// });

// }
// socket/handlers/expenseHandler.js

const registerExpenseHandlers = (io, socket) => {
  const userId = socket.user.id;

  // -------------------------
  // 1. ADD EXPENSE
  // -------------------------
  socket.on("add_expense", (expense) => {
    io.to(`user_${userId}`).emit("expense_added", expense);
    io.to("premium_users").emit("leaderboard_refresh");
  });

  socket.on("edit_expense", (updatedExpense) => {
    io.to(`user_${userId}`).emit("expense_updated", updatedExpense);
    io.to("premium_users").emit("leaderboard_refresh");
  });

  socket.on("delete_expense", ({ id }) => {
    io.to(`user_${userId}`).emit("expense_deleted", { id });
    io.to("premium_users").emit("leaderboard_refresh");
  });

  socket.on("bulk_delete_expenses", ({ ids }) => {
    io.to(`user_${userId}`).emit("expenses_bulk_deleted", { ids });
    io.to("premium_users").emit("leaderboard_refresh");
  });
};

module.exports = registerExpenseHandlers;
