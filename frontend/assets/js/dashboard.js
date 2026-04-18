const dashboardRoot = document.getElementById("dashboard-root");

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || "";
  return "";
};

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const getInitials = (name = "") => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getActivityContext = (item = {}) => {
  const propertyTitle = item.property?.title || item.property?.name || "property";
  const status = String(item.finalStatus || item.status || "Pending").toLowerCase();

  if (item._feedType === "myRequest") {
    if (status === "approved") return `Transfer Title: ${propertyTitle}`;
    if (status === "rejected") return `Transfer Declined: ${propertyTitle}`;
    return `Transfer Request: ${propertyTitle}`;
  }

  if (item._feedType === "incomingRequest") {
    if (status === "approved") return `Title Approved: ${propertyTitle}`;
    if (status === "rejected") return `Title Rejected: ${propertyTitle}`;
    return `Boundary Survey: ${propertyTitle}`;
  }

  if (status === "approved") return `Archive Request Completed`;
  if (status === "rejected") return `Archive Request Rejected`;
  return `Archive Request #${item.registrationId || item.transactionId || "N/A"}`;
};

const getActivitySubtitle = (item = {}) => {
  const actor =
    item.buyer?.fullName ||
    item.seller?.fullName ||
    item.fromOwner?.fullName ||
    item.toOwner?.fullName ||
    "Registry system";

  if (item._feedType === "incomingRequest") {
    return `Awaiting review from ${actor}`;
  }

  if (item._feedType === "myRequest") {
    return `Request submitted by ${actor}`;
  }

  return `Processed by ${actor}`;
};

const getActivityHref = (item = {}) => {
  const propertyId = toIdString(item.property);
  if (propertyId) return `/pages/property-details.html?id=${propertyId}`;
  return "/pages/requests.html";
};

const getStatusClass = (status = "") => {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "completed") return "completed";
  return "pending";
};

const getRoleLabel = (role) => {
  if (role === "Government Officer") return "Registrar";
  if (role === "Admin") return "Administrator";
  if (role === "User") return "Land Owner";
  return role || "Registrar";
};

const getPortfolioSplit = (properties = []) => {
  const total = properties.length;
  if (!total) {
    return [
      { label: "Commercial", percent: 60, color: "#001f54" },
      { label: "Residential", percent: 25, color: "#4b7085" },
      { label: "Agricultural", percent: 15, color: "#7a7f8a" },
    ];
  }

  const counts = properties.reduce((acc, property) => {
    const key = String(property?.type || "Other");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const palette = ["#001f54", "#4b7085", "#7a7f8a", "#0f5a87", "#7a5f3d"];

  return Object.entries(counts)
    .map(([label, count], index) => ({
      label,
      percent: (count / total) * 100,
      color: palette[index % palette.length],
    }))
    .sort((left, right) => right.percent - left.percent);
};

const getMetricSet = (role, data) => {
  if (role === "User") {
    return [
      {
        label: "My Properties",
        value: data.myPropertiesCount ?? 0,
        note: "All Verified",
        icon: "//",
      },
      {
        label: "Pending Decisions",
        value: data.pendingApprovals ?? 0,
        note: "Requires Action",
        icon: "///",
      },
    ];
  }

  if (role === "Admin" || role === "Government Officer") {
    return [
      {
        label: "Properties",
        value: data.propertiesCount ?? 0,
        note: "Registry Records",
        icon: "//",
      },
      {
        label: "Pending Decisions",
        value: data.pendingVerificationCount ?? 0,
        note: "Requires Action",
        icon: "///",
      },
    ];
  }

  return [
    {
      label: "My Requests",
      value: data.myRequestsCount ?? 0,
      note: "Submitted",
      icon: "//",
    },
    {
      label: "Pending Decisions",
      value: data.pendingCount ?? 0,
      note: "Requires Action",
      icon: "///",
    },
  ];
};

const bindSidebarActions = () => {
  dashboardRoot.querySelectorAll("[data-action='logout']").forEach((link) => {
    link.addEventListener("click", async (event) => {
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

const buildActivityFeed = (role, data) => {
  const items = role === "User"
    ? [
        ...(data.myRequests || []).map((item) => ({ ...item, _feedType: "myRequest" })),
        ...(data.incomingRequests || []).map((item) => ({ ...item, _feedType: "incomingRequest" })),
      ]
    : (data.recentTransactions || []).map((item) => ({ ...item, _feedType: "transaction" }));

  return items
    .sort((left, right) => new Date(right.createdAt || right.updatedAt || 0) - new Date(left.createdAt || left.updatedAt || 0))
    .slice(0, 5);
};

const renderWorkspace = (role, data) => {
  const user = getUser();
  const firstName = String(user?.fullName || "Registrar").split(/\s+/)[0] || "Registrar";
  const avatar = getInitials(user?.fullName || "RA");

  const metrics = getMetricSet(role, data);
  const activityItems = buildActivityFeed(role, data);
  const split = getPortfolioSplit(data.myProperties || []);

  const assetValue = role === "User"
    ? toCurrency(data.totalAssetsValue || 0)
    : toCurrency((data.propertiesCount || 0) * 1000000);

  dashboardRoot.innerHTML = `
    <aside class="svd-sidebar">
      <div class="svd-brand">
        <h2>National Portal</h2>
        <p>Land Registry Bureau</p>
      </div>

      <nav class="svd-nav" aria-label="Dashboard Navigation">
        <a class="active" href="/pages/dashboard.html"><span class="svd-nav-icon">■</span>Dashboard</a>
        <a href="/pages/properties?view=add"><span class="svd-nav-icon">▣</span>Add Property</a>
        <a href="/pages/properties.html"><span class="svd-nav-icon">▤</span>Buy</a>
        <a href="/pages/properties?view=mine"><span class="svd-nav-icon">▦</span>My Properties</a>
        <a href="/pages/properties?view=selling"><span class="svd-nav-icon">▧</span>Currently Selling</a>
        <a href="/pages/requests.html"><span class="svd-nav-icon">◍</span>Requests</a>
        <a href="#logout" data-action="logout"><span class="svd-nav-icon">●</span>Logout</a>
      </nav>

      <div class="svd-sidebar-cta">
        <a class="btn btn-primary" href="/pages/requests.html">Track Requests</a>
      </div>
    </aside>

    <section class="svd-main">
      <header class="svd-topbar">
        <h2 class="svd-topbar-title">The Sovereign Archive</h2>
        <div class="svd-topbar-actions">
          <input class="svd-search" type="search" placeholder="Search archives..." aria-label="Search archives" />
          <span class="svd-pill-icon" aria-hidden="true">!</span>
          <span class="svd-pill-icon" aria-hidden="true">?</span>
          <span class="svd-avatar" aria-label="${user?.fullName || "User"}">${avatar}</span>
        </div>
      </header>

      <div class="svd-content">
        <h1>Welcome Back, ${firstName}</h1>
        <p class="svd-subtitle">Your portfolio overview and pending administrative tasks.</p>

        <div class="svd-grid">
          ${metrics
            .map(
              (metric) => `
                <article class="svd-card svd-metric-card">
                  <span class="svd-metric-label">${metric.label}</span>
                  <div class="svd-metric-value">${metric.value}</div>
                  <div class="svd-metric-note">● ${metric.note}</div>
                  <div class="svd-metric-watermark">${metric.icon}</div>
                </article>
              `
            )
            .join("")}

          <article class="svd-card svd-activity">
            <div class="svd-activity-head">
              <h3>Recent Activity</h3>
              <a href="/pages/requests.html">View All -></a>
            </div>

            <div class="svd-activity-list">
              ${activityItems.length
                ? activityItems
                    .map((item) => {
                      const status = item.finalStatus || item.status || "Pending";
                      return `
                        <a class="svd-activity-item" href="${getActivityHref(item)}">
                          <span class="svd-activity-icon">◌</span>
                          <div>
                            <p class="svd-activity-title">${getActivityContext(item)}</p>
                            <p class="svd-activity-subtitle">${getActivitySubtitle(item)}</p>
                            <span class="svd-badge ${getStatusClass(status)}">${status}</span>
                          </div>
                        </a>
                      `;
                    })
                    .join("")
                : `<p class="svd-empty">No recent activity found.</p>`}
            </div>
          </article>

          <article class="svd-card svd-portfolio">
            <div class="svd-portfolio-top">
              <div>
                <h3>Portfolio Split</h3>
                <p>Distribution of registered land types.</p>
              </div>
              <div class="svd-asset-meta">
                <div class="svd-asset-label">Total Asset Value</div>
                <div class="svd-asset-value">${assetValue}</div>
              </div>
            </div>

            <div class="svd-allocation-bar" aria-label="Portfolio allocation bar">
              ${split
                .map(
                  (segment) => `<span class="svd-allocation-segment" style="width:${segment.percent}%; background:${segment.color};"></span>`
                )
                .join("")}
            </div>

            <div class="svd-allocation-legend">
              ${split
                .map(
                  (segment) => `
                    <span class="svd-allocation-item">
                      <span class="svd-dot" style="background:${segment.color};"></span>
                      ${segment.label} ${Math.round(segment.percent)}%
                    </span>
                  `
                )
                .join("")}
            </div>
          </article>
        </div>
      </div>
    </section>
  `;

  bindSidebarActions();
};

const renderLoading = () => {
  dashboardRoot.innerHTML = `
    <section style="padding: 2rem; color: #4f6076;">Loading dashboard...</section>
  `;
};

const loadDashboard = async () => {
  if (!dashboardRoot) return;
  renderLoading();

  try {
    const { role, data } = await apiRequest("/dashboard");
    renderWorkspace(role, data || {});
  } catch (error) {
    dashboardRoot.innerHTML = `<p style="padding:2rem; color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadDashboard);
