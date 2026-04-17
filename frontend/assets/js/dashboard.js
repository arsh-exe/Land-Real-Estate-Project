const dashboardRoot = document.getElementById("dashboard-root");
const dashboardTitle = document.getElementById("dashboard-title");
const dashboardSubtitle = document.getElementById("dashboard-subtitle");
const dashboardActions = document.getElementById("dashboard-actions");

const personalizeDashboardHeader = () => {
  const user = getUser();
  const fullName = String(user?.fullName || "").trim();
  const firstName = fullName ? fullName.split(/\s+/)[0] : "";

  if (dashboardTitle) {
    dashboardTitle.textContent = firstName ? `${firstName}'s Dashboard` : "Your Dashboard";
  }

  if (dashboardSubtitle) {
    dashboardSubtitle.textContent = fullName
      ? `Welcome ${fullName}. Manage properties, requests, and track verification workflows in real-time.`
      : "Manage properties, requests, and track verification workflows in real-time.";
  }
};

const quickActionMap = {
  User: [
    { label: "➕ Register New Property", href: "/pages/properties?view=add", variant: "primary" },
    { label: "🔍 Browse Land", href: "/pages/properties.html", variant: "secondary" },
  ],
  Buyer: [
    { label: "🔍 Browse Land", href: "/pages/properties.html", variant: "primary" },
    { label: "📥 My Requests", href: "/pages/requests.html?section=pending", variant: "secondary" },
  ],
  Seller: [
    { label: "➕ Register New Property", href: "/pages/properties?view=add", variant: "primary" },
    { label: "🏠 My Properties", href: "/pages/properties?view=mine", variant: "secondary" },
  ],
  Admin: [
    { label: "📝 Verify Requests", href: "/pages/requests.html?verify=1", variant: "primary" },
    { label: "🏢 All Properties", href: "/pages/properties.html", variant: "secondary" },
  ],
  "Government Officer": [
    { label: "📝 Verify Requests", href: "/pages/requests.html?verify=1", variant: "primary" },
    { label: "🏢 All Properties", href: "/pages/properties.html", variant: "secondary" },
  ],
};

const metricMetaMap = {
  "My Properties": { icon: "🏠", accent: "metric-hero" },
  "My Requests": { icon: "📥", accent: "metric-hero" },
  "Total Asset Value": { icon: "📈", accent: "metric-hero" },
  "Pending Decisions": { icon: "⚠️", accent: "metric-attention" },
  Pending: { icon: "⚠️", accent: "metric-attention" },
  Approved: { icon: "✅", accent: "metric-hero" },
  Users: { icon: "👥", accent: "metric-hero" },
  Properties: { icon: "🏢", accent: "metric-hero" },
  "Pending Verification": { icon: "📝", accent: "metric-attention" },
};

const badgeClass = (status) => {
  if (!status) return "pending";
  return String(status).toLowerCase();
};

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
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const formatRelativeTime = (inputDate) => {
  const date = inputDate ? new Date(inputDate) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const divisions = [
    { amount: 60, name: "second" },
    { amount: 60, name: "minute" },
    { amount: 24, name: "hour" },
    { amount: 7, name: "day" },
    { amount: 4.34524, name: "week" },
    { amount: 12, name: "month" },
    { amount: Number.POSITIVE_INFINITY, name: "year" },
  ];

  let duration = absSeconds;
  for (const division of divisions) {
    if (duration < division.amount) {
      return rtf.format(Math.sign(diffSeconds) * Math.round(duration), division.name);
    }
    duration /= division.amount;
  }

  return rtf.format(-Math.round(absSeconds / 31536000), "year");
};

const renderEmptyState = (message, actionLabel, actionHref) => `
  <div class="dashboard-empty-state">
    <svg viewBox="0 0 240 160" aria-hidden="true" focusable="false">
      <rect x="25" y="30" width="190" height="110" rx="18" fill="#eef4fb" />
      <path d="M62 110c25-35 51-52 79-52 20 0 38 8 54 24" fill="none" stroke="#8fb0d6" stroke-width="6" stroke-linecap="round" />
      <circle cx="78" cy="74" r="12" fill="#ffd98d" />
      <path d="M40 124h160" stroke="#c7d7f2" stroke-width="10" stroke-linecap="round" />
      <path d="M150 52l20-20 14 14-20 20z" fill="#8fb0d6" />
    </svg>
    <strong>${message}</strong>
    ${actionLabel ? `<a class="btn btn-primary" href="${actionHref}">${actionLabel}</a>` : ""}
  </div>
`;

const buildHeroActions = (role) => (quickActionMap[role] || quickActionMap.User || [])
  .map(
    (action) => `<a class="btn ${action.variant === "primary" ? "btn-primary" : "btn-outline"}" href="${action.href}">${action.label}</a>`
  )
  .join("");

const getMetricIcon = (label) => metricMetaMap[label]?.icon || "◆";
const getMetricAccentClass = (label) => metricMetaMap[label]?.accent || "metric-hero";

const metricValueMarkup = (item) => {
  if (item.metricClass === "metric-currency") {
    return `<div class="metric-value ${item.metricClass}">${item.value || 0}</div>`;
  }

  return `<div class="metric-value">${item.value ?? 0}</div>`;
};

const getPropertySplit = (properties = []) => {
  const total = properties.length;
  if (!total) return [];

  const counts = properties.reduce((accumulator, property) => {
    const key = String(property?.type || "Other");
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const palette = ["#0b2e59", "#1f5e9d", "#5f8fc3", "#8fb0d6", "#c7d7f2", "#f59e0b"];
  return Object.entries(counts)
    .map(([type, count], index) => ({
      type,
      count,
      percent: (count / total) * 100,
      color: palette[index % palette.length],
    }))
    .sort((left, right) => right.count - left.count);
};

const getActivityActorName = (item = {}) => {
  return (
    item.buyer?.fullName ||
    item.seller?.fullName ||
    item.fromOwner?.fullName ||
    item.toOwner?.fullName ||
    "Land User"
  );
};

const getActivityPrimaryActor = (item = {}) => {
  if (item._feedType === "incomingRequest") {
    return item.buyer?.fullName || item.seller?.fullName || "Buyer";
  }

  if (item._feedType === "myRequest") {
    return item.buyer?.fullName || item.seller?.fullName || "You";
  }

  if (item._feedType === "transaction") {
    return item.fromOwner?.fullName || item.toOwner?.fullName || "Transaction";
  }

  return getActivityActorName(item);
};

const getActivityContext = (item = {}) => {
  const propertyTitle = item.property?.title || item.property?.name || "property";
  const status = String(item.finalStatus || item.status || "Pending");
  const normalized = status.toLowerCase();

  if (item._feedType === "myRequest") {
    if (normalized === "approved") return `Approved sale of ${propertyTitle}`;
    if (normalized === "rejected") return `Request rejected for ${propertyTitle}`;
    return `Requested to buy ${propertyTitle}`;
  }

  if (item._feedType === "incomingRequest") {
    if (normalized === "approved") return `Approved sale request for ${propertyTitle}`;
    if (normalized === "rejected") return `Rejected sale request for ${propertyTitle}`;
    return `New request for ${propertyTitle}`;
  }

  if (item._feedType === "transaction") {
    if (normalized === "approved") return `Approved sale of ${propertyTitle}`;
    if (normalized === "rejected") return `Rejected transaction for ${propertyTitle}`;
    return `Transaction pending for ${propertyTitle}`;
  }

  return `${status} for ${propertyTitle}`;
};

const getRecentActivityHref = (item = {}, status = "") => {
  const propertyId = toIdString(item.property);
  if (propertyId) {
    return `/pages/property-details.html?id=${propertyId}`;
  }

  if (item.transactionId) {
    return "/pages/requests?section=transactions";
  }

  const normalizedStatus = String(status).toLowerCase();
  if (normalizedStatus === "approved") return "/pages/requests?section=approved";
  if (normalizedStatus === "rejected") return "/pages/requests?section=rejected";
  return "/pages/requests?section=pending";
};

const renderDashboard = (role, data) => {
  if (!dashboardRoot) return;

  if (dashboardActions) {
    dashboardActions.innerHTML = buildHeroActions(role);
  }

  const metricCards = [];
  const isUnifiedUser = role === "User";
  const recentActivityItems = isUnifiedUser
    ? [
        ...(data.myRequests || []).map((item) => ({ ...item, _feedType: "myRequest" })),
        ...(data.incomingRequests || []).map((item) => ({ ...item, _feedType: "incomingRequest" })),
      ]
    : (data.recentTransactions || []).map((item) => ({ ...item, _feedType: "transaction" }));

  recentActivityItems.sort((left, right) => new Date(right.createdAt || right.updatedAt || 0) - new Date(left.createdAt || left.updatedAt || 0));

  const propertySplit = role === "User" ? getPropertySplit(data.myProperties || []) : [];
  const activityCount = recentActivityItems.length;

  if (role === "User") {
    metricCards.push(
      { label: "My Properties", value: data.myPropertiesCount, href: "/pages/properties?view=mine" },
      { label: "My Requests", value: data.myRequestsCount, href: "/pages/requests?section=pending" },
      {
        label: "Total Asset Value",
        value: toCurrency(data.totalAssetsValue || 0),
        href: "/pages/properties?view=mine",
        metricClass: "metric-currency",
      },
      { label: "Pending Decisions", value: data.pendingApprovals, href: "/pages/requests?section=pending" }
    );
  } else if (role === "Buyer") {
    metricCards.push(
      { label: "My Requests", value: data.myRequestsCount, href: "/pages/requests?section=pending" },
      {
        label: "Total Asset Value",
        value: toCurrency(data.totalAssetsValue || 0),
        href: "/pages/properties?view=mine",
        metricClass: "metric-currency",
      },
      { label: "Approved", value: data.approvedCount, href: "/pages/requests.html" },
      { label: "Pending", value: data.pendingCount, href: "/pages/requests?section=pending" }
    );
  } else if (role === "Seller") {
    metricCards.push(
      { label: "My Properties", value: data.myPropertiesCount, href: "/pages/properties?view=mine" },
      {
        label: "Total Asset Value",
        value: toCurrency(data.totalAssetsValue || 0),
        href: "/pages/properties?view=mine",
        metricClass: "metric-currency",
      },
      { label: "Total Requests", value: data.incomingRequestsCount, href: "/pages/requests.html" },
      { label: "Pending Decisions", value: data.pendingApprovals, href: "/pages/requests?section=pending" }
    );
  } else {
    metricCards.push(
      { label: "Users", value: data.usersCount, href: "/pages/admin-dashboard.html" },
      { label: "Properties", value: data.propertiesCount, href: "/pages/properties.html" },
      { label: "Pending Verification", value: data.pendingVerificationCount, href: "/pages/requests?verify=1" },
      { label: "Requests", value: data.requestsCount, href: "/pages/requests.html" }
    );
  }

  const metricsMarkup = `
    <section class="card dashboard-section-card">
      <div class="dashboard-metrics-grid">
        ${metricCards
          .map(
            (item) => `
              <a class="dashboard-card-link" href="${item.href}" aria-label="Open ${item.label}">
                <article class="card dashboard-metric-card ${getMetricAccentClass(item.label)}" data-icon="${getMetricIcon(item.label)}">
                  <div class="metric-label">${item.label}</div>
                  ${metricValueMarkup(item)}
                </article>
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;

  const allocationMarkup = role === "User"
    ? `
      <section class="card dashboard-section-card">
        <h3>Portfolio Split</h3>
        <div class="dashboard-allocation">
          ${propertySplit.length
            ? `
                <div class="allocation-bar" aria-label="Property allocation by type">
                  ${propertySplit
                    .map(
                      (segment) => `
                        <span class="allocation-segment" style="width:${segment.percent}%; background:${segment.color};" title="${segment.type}: ${segment.count}"></span>
                      `
                    )
                    .join("")}
                </div>
                <div class="allocation-legend">
                  ${propertySplit
                    .map(
                      (segment) => `
                        <span class="allocation-legend-item"><span class="allocation-dot" style="background:${segment.color}"></span>${segment.type} ${segment.count}</span>
                      `
                    )
                    .join("")}
                </div>
              `
            : renderEmptyState(
                "You don't own any land yet.",
                "Browse available properties",
                "/pages/properties.html"
              )}
        </div>
      </section>
    `
    : "";

  const activityMarkup = `
    <section class="card dashboard-section-card">
      <h3>Recent Activity</h3>
      <div class="dashboard-activity-feed">
        ${activityCount
          ? recentActivityItems
              .slice(0, 8)
              .map((item) => {
                const status = item.finalStatus || item.status || "Pending";
                const href = getRecentActivityHref(item, status);
                const actorName = getActivityPrimaryActor(item);
                const title = getActivityContext(item);
                const reference = item.registrationId || item.transactionId || item.referenceId || "REF";
                const avatar = getInitials(actorName);
                const time = formatRelativeTime(item.createdAt || item.updatedAt);

                return `
                  <a class="recent-activity-link" href="${href}" aria-label="Open ${title}">
                    <article class="dashboard-activity-item">
                      <div class="dashboard-avatar" aria-hidden="true">${avatar}</div>
                      <div class="dashboard-activity-copy">
                        <p class="dashboard-activity-title">${title}</p>
                        <p class="dashboard-activity-subtitle">${actorName}</p>
                        <p class="dashboard-activity-subtitle">Ref ${reference}</p>
                      </div>
                      <div class="dashboard-activity-meta">
                        <span class="dashboard-activity-time">${time}</span>
                        <span class="badge ${badgeClass(status)}">${status}</span>
                      </div>
                    </article>
                  </a>
                `;
              })
              .join("")
          : renderEmptyState(
              "No recent activity yet.",
              role === "User" ? "Browse available properties" : "Review requests",
              role === "User" ? "/pages/properties.html" : "/pages/requests.html?verify=1"
            )}
      </div>
    </section>
  `;

  dashboardRoot.innerHTML = `
    <div class="dashboard-grid">
      ${metricsMarkup}
      ${allocationMarkup}
      ${activityMarkup}
    </div>
  `;
};

const loadDashboard = async () => {
  if (!dashboardRoot) return;
  
  // Show skeleton loading state
  dashboardRoot.innerHTML = `
    <div class="dashboard-grid">
      <section class="card skeleton" style="border: none; box-shadow: none; min-height: 160px;">
        <div class="skeleton-text short"></div>
        <div class="skeleton-title" style="margin-top: 1rem;"></div>
      </section>
      <section class="card skeleton" style="border: none; box-shadow: none; min-height: 220px;"></section>
      <section class="card skeleton" style="border: none; box-shadow: none; min-height: 280px;"></section>
    </div>
  `;

  try {
    const { role, data } = await apiRequest("/dashboard");
    renderDashboard(role, data);
  } catch (error) {
    dashboardRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadDashboard);
window.addEventListener("DOMContentLoaded", personalizeDashboardHeader);
