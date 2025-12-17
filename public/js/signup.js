document.addEventListener("DOMContentLoaded", () => {
  const signUpForm = document.getElementById("signupForm");

  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(signUpForm);
    const formValues = Object.fromEntries(formData.entries());

    try {
      const response = await axios.post(`${BASE_URL}/api/auth/signup`, formValues);
      console.log("User added:", response.data);

      showNotification("User registered successfully!", false);
      signUpForm.reset();

      setTimeout(() => (window.location.href = "/login"), 2000);
    } catch (error) {
      console.error("Error during signup:", error);

      if (error.response?.status === 400)
        showNotification(error.response.data.message, true);
      else
        showNotification("Something went wrong. Please try again.", true);
    }
  });
});
