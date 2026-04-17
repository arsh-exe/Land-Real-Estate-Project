const dashboardRoot = document.getElementById("dashboard-root");

const badgeClass = (status) => {
  if (!status) return "pending";
  return status.toLowerCase();
};

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || "";
  return "";
};

const getRecentActivityHref = (item = {}, status = "") => {
  const propertyId = toIdString(item.property);
  if (propertyId) {
    return `/pages/property-details?id=${propertyId}`;
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

  const metricCards = [];

  if (role === "Buyer") {
    metricCards.push(
      { label: "My Requests", value: data.myRequestsCount, href: "/pages/requests?section=pending" },
      { label: "Approved", value: data.approvedCount, href: "/pages/requests.html" },
      { label: "Pending", value: data.pendingCount, href: "/pages/requests?section=pending" }
    );
  } else if (role === "Seller") {
    metricCards.push(
      { label: "My Properties", value: data.myPropertiesCount, href: "/pages/properties?view=mine" },
      { label: "Total Requests", value: data.incomingRequestsCount, href: "/pages/requests.html" },
      { label: "Pending Decisions", value: data.pendingApprovals, href: "/pages/requests?section=pending" }
    );
  } else {
    metricCards.push(
      { label: "Users", value: data.usersCount, href: "/pages/admin-dashboard.html" },
      { label: "Properties", value: data.propertiesCount, href: "/pages/properties.html" },
      { label: "Pending Verification", value: data.pendingVerificationCount, href: "/pages/requests?section=pending" }
    );
  }

  dashboardRoot.innerHTML = `
    <div class="grid grid-3">
      ${metricCards
        .map(
          (item) => `
            <a class="dashboard-card-link" href="${item.href}" aria-label="Open ${item.label}">
              <article class="card dashboard-metric-card">
                <div>${item.label}</div>
                <div class="metric">${item.value || 0}</div>
              </article>
            </a>
          `
        )
        .join("")}
    </div>
    <section class="card" style="margin-top: 1rem;">
      <h3>Recent Activity</h3>
      <div class="list">
        ${(data.myRequests || data.incomingRequests || data.recentTransactions || [])
          .slice(0, 8)
          .map((item) => {
            const status = item.finalStatus || item.status || "Pending";
            const label = item.registrationId || item.transactionId || "Request";
            const href = getRecentActivityHref(item, status);
            return `
              <a class="recent-activity-link" href="${href}" aria-label="Open ${label}">
                <article class="txn-item">
                  <strong>${label}</strong>
                  <div class="badge ${badgeClass(status)}">${status}</div>
                </article>
              </a>
            `;
          })
          .join("") || "<p>No recent activity.</p>"}
      </div>
    </section>
  `;
};

const loadDashboard = async () => {
  if (!dashboardRoot) return;
  
  // Show skeleton loading state
  dashboardRoot.innerHTML = `
    <div class="grid grid-3">
      ${Array(3).fill(`
        <article class="card skeleton" style="border: none; box-shadow: none; height: 100px;">
          <div class="skeleton-text short"></div>
          <div class="skeleton-title" style="margin-top: 1rem;"></div>
        </article>
      `).join("")}
    </div>
    <section class="card skeleton" style="margin-top: 1rem; height: 300px; border: none; box-shadow: none;">
    </section>
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
