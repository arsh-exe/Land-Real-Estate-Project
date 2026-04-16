const requestsRoot = document.getElementById("requests-root");
const transactionsRoot = document.getElementById("transactions-root");

const makeBadge = (status) => `<span class="badge ${String(status).toLowerCase()}">${status}</span>`;

const actionButtons = (request, role) => {
  if (role === "seller" && request.sellerDecision?.status === "Pending") {
    return `
      <button class="btn btn-primary" data-action="seller" data-status="Approved" data-id="${request._id}">Approve</button>
      <button class="btn btn-danger" data-action="seller" data-status="Rejected" data-id="${request._id}">Reject</button>
    `;
  }

  if (
    ["admin", "government officer"].includes(role) &&
    request.sellerDecision?.status === "Approved" &&
    request.finalStatus === "Pending"
  ) {
    return `
      <button class="btn btn-primary" data-action="officer" data-status="Approved" data-id="${request._id}">Verify & Approve</button>
      <button class="btn btn-danger" data-action="officer" data-status="Rejected" data-id="${request._id}">Reject</button>
      <button class="btn btn-outline" data-certificate="${request._id}">Generate Certificate</button>
    `;
  }

  return "";
};

const bindRequestActions = () => {
  requestsRoot?.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const status = button.dataset.status;
      const note = prompt("Optional note:") || "";

      const endpoint =
        action === "seller"
          ? `/registrations/${id}/seller-decision`
          : `/registrations/${id}/officer-decision`;

      try {
        await apiRequest(endpoint, {
          method: "PATCH",
          body: JSON.stringify({ status, note }),
        });
        showToast(`Request ${status.toLowerCase()} successfully`, "success");
        await loadRequests();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  requestsRoot?.querySelectorAll("[data-certificate]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const data = await apiRequest(`/certificates/${button.dataset.certificate}`, {
          method: "POST",
        });
        showToast(`Certificate created: ${data.certificate.filePath}`, "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
};

const loadRequests = async () => {
  if (!requestsRoot) return;

  // Show skeleton loading state
  requestsRoot.innerHTML = Array(3).fill(`
    <article class="request-item skeleton" style="border: none; box-shadow: none;">
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
      <div style="display:flex; gap:0.5rem; margin-top:1rem;">
        <div class="skeleton-text" style="width: 100px; height: 36px; border-radius: 8px;"></div>
        <div class="skeleton-text" style="width: 100px; height: 36px; border-radius: 8px;"></div>
      </div>
    </article>
  `).join("");

  try {
    const role = roleKey(getUser()?.role);
    const { registrations } = await apiRequest("/registrations");

    requestsRoot.innerHTML = (registrations || [])
      .map(
        (request) => `
        <article class="request-item">
          <h3>${request.registrationId}</h3>
          <p><strong>Property:</strong> ${request.property?.title || "N/A"}</p>
          <p><strong>Buyer:</strong> ${request.buyer?.fullName || "N/A"}</p>
          <p><strong>Seller:</strong> ${request.seller?.fullName || "N/A"}</p>
          <p>Seller: ${makeBadge(request.sellerDecision?.status || "Pending")}</p>
          <p>Final: ${makeBadge(request.finalStatus || "Pending")}</p>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
            ${actionButtons(request, role)}
          </div>
        </article>
      `
      )
      .join("");

    if (!registrations.length) {
      requestsRoot.innerHTML = "<p>No requests found.</p>";
    }

    bindRequestActions();
  } catch (error) {
    requestsRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

const loadTransactions = async () => {
  if (!transactionsRoot) return;

  // Show skeleton loading state
  transactionsRoot.innerHTML = Array(3).fill(`
    <article class="txn-item skeleton" style="border: none; box-shadow: none; height: 100px;">
      <div class="skeleton-text short"></div>
      <div class="skeleton-title" style="margin-top: 0.5rem;"></div>
    </article>
  `).join("");

  try {
    const { transactions } = await apiRequest("/transactions");
    transactionsRoot.innerHTML = (transactions || [])
      .map(
        (item) => `
        <article class="txn-item">
          <strong>${item.transactionId}</strong>
          <p>${item.property?.title || "Property"}</p>
          <p>${makeBadge(item.status)}</p>
        </article>
      `
      )
      .join("");

    if (!transactions.length) {
      transactionsRoot.innerHTML = "<p>No transactions available.</p>";
    }
  } catch (error) {
    transactionsRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", () => {
  loadRequests();
  loadTransactions();
});
