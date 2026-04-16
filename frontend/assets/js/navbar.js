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
    { label: "Add Property", href: "/pages/properties?view=add" },
    { label: "My Properties", href: "/pages/properties?view=mine" },
    { label: "Requests", href: "/pages/requests.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
  admin: [
    { label: "Dashboard", href: "/pages/dashboard.html" },
    { label: "Verify Requests", href: "/pages/requests?verify=1" },
    { label: "All Properties", href: "/pages/properties.html" },
    { label: "Users", href: "/pages/admin-dashboard.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
  "government officer": [
    { label: "Dashboard", href: "/pages/dashboard.html" },
    { label: "Verify Requests", href: "/pages/requests?verify=1" },
    { label: "All Properties", href: "/pages/properties.html" },
    { label: "Users", href: "/pages/admin-dashboard.html" },
    { label: "Logout", href: "#logout", action: "logout" },
  ],
};

const normalizePath = (inputPath) => {
  if (!inputPath) return "index";
  let clean = inputPath.toLowerCase().replace(/\\/g, "/");
  if (clean === "/" || clean === "") return "index";
  
  // Remove leading/trailing slashes and .html extension for robust matching
  return clean
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/\.html$/, "");
};

const renderNavbar = () => {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  const user = getUser();
  const role = roleKey(user?.role) || "guest";
  const menu = menuByRole[role] || menuByRole.guest;
  const currentUrl = new URL(window.location.href);
  
  // Normalize current path
  const activePath = normalizePath(currentUrl.pathname);
  const currentView = (currentUrl.searchParams.get("view") || "").trim().toLowerCase();
  const currentAction = (currentUrl.searchParams.get("action") || "").trim().toLowerCase();
  const currentMine = (currentUrl.searchParams.get("mine") || "").trim().toLowerCase();

  const isMenuItemActive = (href = "") => {
    if (!href || href.startsWith("#")) return false;

    // Handle external or relative URLs
    const itemUrl = new URL(href, window.location.origin);
    const itemPath = normalizePath(itemUrl.pathname);
    
    // Exact or direct match
    const isDirectMatch = activePath === itemPath || 
                         activePath.endsWith("/" + itemPath) || 
                         (activePath.endsWith(itemPath) && (activePath.length === itemPath.length || activePath[activePath.length - itemPath.length - 1] === "/"));

    // Highlight "Properties" if on property details page
    if (!isDirectMatch && activePath.endsWith("property-details") && itemPath.endsWith("properties")) {
      return true;
    }

    if (!isDirectMatch) return false;

    // Parameter checks for specific views (add, mine, verify)
    if (itemUrl.pathname.endsWith("/properties.html")) {
      const itemView = (itemUrl.searchParams.get("view") || "").toLowerCase();
      const itemAction = (itemUrl.searchParams.get("action") || "").toLowerCase();
      const itemMine = (itemUrl.searchParams.get("mine") || "").toLowerCase();

      // Current URL states
      const isAdding = currentView === "add" || currentAction === "add";
      const isMine = currentView === "mine" || currentMine === "1" || currentMine === "true";

      // Match "Add Property" link
      if (itemView === "add" || itemAction === "add") {
        return isAdding;
      }

      // Match "My Properties" link
      if (itemView === "mine" || itemMine === "1" || itemMine === "true") {
        return isMine;
      }

      // Generic properties link (Search Properties / All Properties)
      // Only active if NOT in "add" or "mine" mode.
      return !isAdding && !isMine;
    }

    const itemParams = [...itemUrl.searchParams.entries()];
    if (itemParams.length > 0) {
      return itemParams.every(([key, value]) => currentUrl.searchParams.get(key) === value);
    }

    if (itemPath.endsWith("/requests.html") && currentUrl.searchParams.get("verify") === "1") return false;
    return true;
  };

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
              const isActive = isMenuItemActive(item.href || "");
              return `<a class="nav-link ${isActive ? "active" : ""}" href="${item.href}" data-action="${
                item.action || ""
              }" ${isActive ? 'aria-current="page"' : ""}>${item.label}</a>`;
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
