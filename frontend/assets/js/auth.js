const authForm = document.getElementById("auth-form");

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mode = authForm.dataset.mode;
    const messageBox = document.getElementById("auth-message");
    messageBox.textContent = "";

    try {
      const formData = new FormData(authForm);
      const payload = Object.fromEntries(formData.entries());
      const endpoint = mode === "register" ? "/auth/signup" : "/auth/login";

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuth(data.token, data.user);
      window.location.href = "/pages/dashboard.html";
    } catch (error) {
      messageBox.textContent = error.message;
      messageBox.style.color = "#b42318";
    }
  });
}
