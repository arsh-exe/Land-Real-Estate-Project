const authForm = document.getElementById("auth-form");

const bindPasswordToggles = () => {
  const toggleButtons = document.querySelectorAll("[data-password-toggle]");
  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const inputId = button.getAttribute("data-password-toggle");
      const input = document.getElementById(inputId);
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.textContent = shouldShow ? "Hide" : "Show";
      button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    });
  });
};

bindPasswordToggles();

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mode = authForm.dataset.mode;
    const messageBox = document.getElementById("auth-message");
    const submitButton = authForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";
    messageBox.textContent = "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Please wait...";
      }

      const formData = new FormData(authForm);
      const payload = Object.fromEntries(formData.entries());
      const endpoint = mode === "register" ? "/auth/signup" : "/auth/login";

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuth(data.token, data.user);
      if (typeof showToast === "function") {
        showToast(mode === "register" ? "Registration successful" : "Login successful", "success");
      }
      window.location.href = "/pages/dashboard.html";
    } catch (error) {
      messageBox.textContent = error.message;
      messageBox.style.color = "var(--danger)";
      if (typeof showToast === "function") {
        showToast(error.message, "error");
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}
