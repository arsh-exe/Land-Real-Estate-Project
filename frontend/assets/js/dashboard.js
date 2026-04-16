const dashboardRoot = document.getElementById("dashboard-root");

const badgeClass = (status) => {
  if (!status) return "pending";
  return status.toLowerCase();
};

const renderDashboard = (role, data) => {
  if (!dashboardRoot) return;

  const metricCards = [];

  if (role === "Buyer") {
    metricCards.push(
      { label: "My Requests", value: data.myRequestsCount },
      { label: "Approved", value: data.approvedCount },
      { label: "Pending", value: data.pendingCount }
    );
  } else if (role === "Seller") {
    metricCards.push(
      { label: "My Properties", value: data.myPropertiesCount },
      { label: "Total Requests", value: data.incomingRequestsCount },
      { label: "Pending Decisions", value: data.pendingApprovals }
    );
  } else {
    metricCards.push(
      { label: "Users", value: data.usersCount },
      { label: "Properties", value: data.propertiesCount },
      { label: "Pending Verification", value: data.pendingVerificationCount }
    );
  }

  dashboardRoot.innerHTML = `
    <div class="grid grid-3">
      ${metricCards
        .map(
          (item) => `
            <article class="card">
              <div>${item.label}</div>
              <div class="metric">${item.value || 0}</div>
            </article>
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
            return `
              <article class="txn-item">
                <strong>${label}</strong>
                <div class="badge ${badgeClass(status)}">${status}</div>
              </article>
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
