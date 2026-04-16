const usersRoot = document.getElementById("users-root");

const loadUsers = async () => {
  if (!usersRoot) return;

  try {
    const role = roleKey(getUser()?.role);
    if (!["admin", "government officer"].includes(role)) {
      usersRoot.innerHTML = "<p>Access restricted to Admin and Government Officer.</p>";
      return;
    }

    const { users } = await apiRequest("/auth/users");
    usersRoot.innerHTML = users
      .map(
        (user) => `
        <article class="txn-item">
          <strong>${user.fullName}</strong>
          <p>${user.email}</p>
          <p><span class="badge pending">${user.role}</span></p>
        </article>
      `
      )
      .join("");
  } catch (error) {
    usersRoot.innerHTML = `<p style="color:#b42318;">${error.message}</p>`;
  }
};

window.addEventListener("DOMContentLoaded", loadUsers);
