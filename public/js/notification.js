// Global notification system
let notificationTimeout;
const notificationToast = document.getElementById("notificationToast");
const notificationMessage = document.getElementById("notificationMessage");

function showNotification(message, isError = false) {
  if (notificationTimeout) clearTimeout(notificationTimeout);

  notificationMessage.textContent = message;

  notificationToast.classList.toggle("error", isError);
  notificationToast.classList.toggle("success", !isError);

  notificationToast.classList.add("show");

  notificationTimeout = setTimeout(() => {
    notificationToast.classList.remove("show");
  }, 3000);
}
