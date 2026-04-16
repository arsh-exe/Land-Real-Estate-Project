const usersRoot = document.getElementById("users-root");

const loadUsers = async () => {
  if (!usersRoot) return;

  const role = roleKey(getUser()?.role);
  if (!["admin", "government officer"].includes(role)) {
    usersRoot.innerHTML = "<p>Access restricted to Admin and Government Officer.</p>";
    return;
  }

  // Show skeleton loading state
  usersRoot.innerHTML = Array(3).fill(`
    <article class="txn-item skeleton" style="border: none; box-shadow: none; height: 120px;">
      <div class="skeleton-title" style="margin-top: 0.5rem; margin-bottom: 1rem;"></div>
      <div class="skeleton-text short"></div>
      <div class="skeleton-text" style="width: 80px; height: 24px; border-radius: 999px;"></div>
    </article>
  `).join("");

  try {
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
    usersRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadUsers);
