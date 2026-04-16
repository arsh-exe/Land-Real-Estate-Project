const menuByRole = {
  guest: [
    { label: "Home", href: "/index.html" },
    { label: "Login", href: "/pages/login.html" },
    { label: "Register", href: "/pages/register.html" },
  ],
  buyer: [
    { label: "Dashboard", href: "/pages/dashboard.html" },
    { label: "Search Properties", href: "/pages/properties.html" },
    { label: "My Requests", href: "/pages/requests.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
  seller: [
    { label: "Dashboard", href: "/pages/dashboard.html" },
    { label: "Add Property", href: "/pages/properties.html?action=add" },
    { label: "My Properties", href: "/pages/properties.html?mine=1" },
    { label: "Requests", href: "/pages/requests.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
  admin: [
    { label: "Dashboard", href: "/pages/dashboard.html" },
    { label: "Verify Requests", href: "/pages/requests.html?verify=1" },
    { label: "All Properties", href: "/pages/properties.html" },
    { label: "Users", href: "/pages/admin-dashboard.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
  "government officer": [
    { label: "Dashboard", href: "/pages/dashboard.html" },
    { label: "Verify Requests", href: "/pages/requests.html?verify=1" },
    { label: "All Properties", href: "/pages/properties.html" },
    { label: "Users", href: "/pages/admin-dashboard.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
};

const normalizePath = (inputPath) => {
  if (!inputPath) return "/index.html";
  const clean = inputPath.toLowerCase();
  if (clean === "/") return "/index.html";
  return clean;
};

const renderNavbar = () => {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  const user = getUser();
  const role = roleKey(user?.role) || "guest";
  const menu = menuByRole[role] || menuByRole.guest;
  const activePath = normalizePath(window.location.pathname.replace(/\\/g, "/"));

  root.innerHTML = `
    <nav class="navbar">
      <div class="container nav-inner">
        <a class="brand" href="/index.html">
          <span class="brand-badge">LRS</span>
          <span>Land Registry System</span>
        </a>
        <button class="nav-toggle" id="nav-toggle">Menu</button>
        <div class="nav-links" id="nav-links">
          ${menu
            .map((item) => {
              const itemPath = normalizePath((item.href || "").split("?")[0]);
              const isActive = itemPath === activePath;
              return `<a class="nav-link ${isActive ? "active" : ""}" href="${item.href}" data-action="${
                item.action || ""
              }">${item.label}</a>`;
            })
            .join("")}
        </div>
      </div>
    </nav>
  `;

  document.getElementById("nav-toggle")?.addEventListener("click", () => {
    document.getElementById("nav-links")?.classList.toggle("open");
  });

  root.querySelectorAll("[data-action='logout']").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        if (getToken()) {
          await apiRequest("/auth/logout", { method: "POST" });
        }
      } catch (error) {
      } finally {
        clearAuth();
        window.location.href = "/index.html";
      }
    });
  });
};

const enforceAuthOnPage = () => {
  const requirement = document.body.dataset.auth || "public";
  const user = getUser();

  if (requirement === "private" && !user) {
    window.location.href = "/pages/login.html";
    return;
  }

  if (requirement === "guest" && user) {
    window.location.href = "/pages/dashboard.html";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  enforceAuthOnPage();
  renderNavbar();
});
