document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);

    const formValues = Object.fromEntries(formData.entries());

    console.log("Form values:", formValues);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/login`,
        formValues
      );

      console.log("Login successful:", response.data);

      sessionStorage.setItem("token", response.data.token);
      window.location.href = '/expense';
      loginForm.reset();
    } catch (error) {
      console.error("Error during login:", error);

      if (error.response && error.response.status === 401) {
        showNotification("Invalid email or password", true);
      } else {
        showNotification("Something went wrong. Please try again.", true);
      }
    }
  });
});