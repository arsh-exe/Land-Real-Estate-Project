const requestsRoot = document.getElementById("requests-root");

const toTitle = (value = "") =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const fmtDate = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getQuerySection = () => String(new URLSearchParams(window.location.search).get("section") || "").trim().toLowerCase();

const pendingTag = (request) => {
  const sellerStatus = String(request?.sellerDecision?.status || "Pending").toLowerCase();
  const finalStatus = String(request?.finalStatus || "Pending").toLowerCase();

  if (finalStatus === "pending" && sellerStatus === "pending") {
    return { label: "In Review", className: "in-review" };
  }

  if (finalStatus === "pending" && sellerStatus === "approved") {
    return { label: "Awaiting Docs", className: "awaiting-docs" };
  }

  return { label: "Pending", className: "in-review" };
};

const canSellerAct = (role, request, userId) => {
  const sellerId = request?.seller?._id || request?.seller;
  return ["user", "seller"].includes(role) && String(sellerId) === String(userId) && request?.sellerDecision?.status === "Pending";
};

const canOfficerAct = (role, request) =>
  ["admin", "government officer"].includes(role) &&
  request?.sellerDecision?.status === "Approved" &&
  request?.finalStatus === "Pending";

const getRequestProgress = (request) => {
  const sellerStatus = String(request?.sellerDecision?.status || "Pending").toLowerCase();
  const finalStatus = String(request?.finalStatus || "Pending").toLowerCase();

  const steps = [
    { label: "Requested", state: "completed" },
    { label: "Seller", state: "pending" },
    { label: "Govt", state: "pending" },
    { label: "Final", state: "pending" },
  ];

  let progress = 12;

  if (sellerStatus === "pending") {
    steps[1].state = "active";
    progress = 30;
  } else if (sellerStatus === "approved") {
    steps[1].state = "completed";
    progress = 52;

    if (finalStatus === "pending") {
      steps[2].state = "active";
      progress = 72;
    } else if (finalStatus === "approved") {
      steps[2].state = "completed";
      steps[3].state = "completed";
      progress = 100;
    } else if (finalStatus === "rejected") {
      steps[2].state = "rejected";
      steps[3].state = "rejected";
      progress = 100;
    }
  } else if (sellerStatus === "rejected") {
    steps[1].state = "rejected";
    steps[3].state = "rejected";
    progress = 100;
  }

  return { steps, progress };
};

const renderRequestProgress = (request) => {
  const { steps, progress } = getRequestProgress(request);

  return `
    <div class="rw-progress" aria-label="Request progress">
      <div class="rw-progress-track">
        <span class="rw-progress-fill" style="width:${progress}%;"></span>
      </div>
      <div class="rw-progress-steps">
        ${steps
          .map(
            (step) => `
              <span class="rw-step ${step.state}">
                <span class="rw-step-dot"></span>
                <span class="rw-step-label">${step.label}</span>
              </span>
            `
          )
          .join("")}
      </div>
    </div>
  `;
};

const renderRequestActions = (request, role, userId) => {
  let html = `<a class="btn btn-outline btn-sm" href="/pages/property-details.html?id=${request.property?._id || ""}">Details</a>`;

  if (canSellerAct(role, request, userId)) {
    html += `
      <button class="btn btn-primary btn-sm" data-action="seller" data-status="Approved" data-id="${request._id}">Action</button>
      <button class="btn btn-outline btn-sm" data-action="seller" data-status="Rejected" data-id="${request._id}">Reject</button>
    `;
  } else if (canOfficerAct(role, request)) {
    html += `
      <button class="btn btn-primary btn-sm" data-action="officer" data-status="Approved" data-id="${request._id}">Verify</button>
      <button class="btn btn-outline btn-sm" data-action="officer" data-status="Rejected" data-id="${request._id}">Reject</button>
    `;
  }

  return html;
};

const bindWorkflowActions = () => {
  requestsRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const status = button.dataset.status;

      const endpoint = action === "seller" ? `/registrations/${id}/seller-decision` : `/registrations/${id}/officer-decision`;

      try {
        await apiRequest(endpoint, {
          method: "PATCH",
          body: JSON.stringify({ status, note: "" }),
        });
        showToast(`Request ${status.toLowerCase()} successfully`, "success");
        await loadRequestsWorkflow();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  requestsRoot.querySelectorAll("[data-certificate]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest(`/certificates/${button.dataset.certificate}`, { method: "POST" });
        showToast("Certificate generated successfully", "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  requestsRoot.querySelectorAll("[data-property-approval-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const status = button.dataset.propertyApprovalAction;
      const id = button.dataset.propertyApprovalId;
      const note = prompt("Optional review note:") || "";

      try {
        await apiRequest(`/properties/${id}/approval`, {
          method: "PATCH",
          body: JSON.stringify({ status, note }),
        });
        showToast(`Property ${status.toLowerCase()} successfully`, "success");
        await loadRequestsWorkflow();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  requestsRoot.querySelectorAll(".rw-nav a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (href) {
        window.history.pushState({}, "", href);
        loadRequestsWorkflow({ softLoad: true });
      }
    });
  });
};

window.addEventListener("popstate", () => {
  if (window.location.pathname.includes("requests")) {
    loadRequestsWorkflow({ softLoad: true });
  }
});

let cachedWorkflowData = null;

const renderWorkflow = ({ role, userId, registrations, transactions, pendingProperties }) => {
  const section = getQuerySection();

  const pending = registrations
    .filter((item) => String(item.finalStatus || "Pending").toLowerCase() === "pending")
    .sort((a, b) => {
      const aCanAct = canSellerAct(role, a, userId) || canOfficerAct(role, a);
      const bCanAct = canSellerAct(role, b, userId) || canOfficerAct(role, b);
      if (aCanAct && !bCanAct) return -1;
      if (!aCanAct && bCanAct) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const approved = registrations
    .filter((item) => String(item.finalStatus || "Pending").toLowerCase() === "approved")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const rejected = registrations
    .filter((item) => String(item.finalStatus || "Pending").toLowerCase() === "rejected")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const total = registrations.length;
  const approvedCount = approved.length;
  const rejectedCount = rejected.length;

  const prioritySource = section === "approved" ? approved : section === "rejected" ? rejected : pending;
  const priorityCards = prioritySource;

  const approvalFeed = approved;
  const rejectedFeed = rejected;
  const txFeed = transactions || [];
  const timelineFeed = registrations
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const sideLinks = [
    { key: "pending", label: "Pending Requests", active: section !== "approved" && section !== "rejected" },
    { key: "approved", label: "Approved Titles", active: section === "approved" },
    { key: "rejected", label: "Rejected Filings", active: section === "rejected" },
    { key: "transactions", label: "Transaction Vault", active: section === "transactions" },
  ];

  const propertyApprovalCards = ["admin", "government officer"].includes(role)
    ? pendingProperties || []
    : [];

  requestsRoot.innerHTML = `
    <section class="rw-shell">


      <section class="rw-center">
        <header class="rw-header">
          <div>
            <h1>Registration Workflow</h1>
            <p>Manage and process active land registrations, title transfers, and historical transactions.</p>
          </div>
        </header>

        <article class="rw-panel">
          <div class="rw-panel-title">
            <h2>Priority Pending</h2>
          </div>

          <div class="rw-priority-grid">
            ${
              propertyApprovalCards.length
                ? propertyApprovalCards
                    .map(
                      (property) => `
                        <article class="rw-priority-card awaiting-docs">
                          <p class="rw-request-id">PROPERTY REVIEW</p>
                          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:0.2rem;">
                            <p class="rw-request-title">${property.title || "Untitled Property"}</p>
                            <span class="rw-pill awaiting-docs">Awaiting Docs</span>
                          </div>
                          <p class="rw-request-meta">Owner: ${property.owner?.fullName || "N/A"}</p>
                          <p class="rw-request-meta">Location: ${property.location || "N/A"}</p>
                          <div class="rw-request-actions">
                            <a class="btn btn-outline btn-sm" href="/pages/property-details.html?id=${property._id}">Details</a>
                            <button class="btn btn-primary btn-sm" data-property-approval-action="Approved" data-property-approval-id="${property._id}">Approve</button>
                            <button class="btn btn-outline btn-sm" data-property-approval-action="Rejected" data-property-approval-id="${property._id}">Reject</button>
                          </div>
                        </article>
                      `
                    )
                    .join("")
                : ""
            }

            ${
              priorityCards.length
                ? priorityCards
                    .map((request) => {
                      const tag = pendingTag(request);
                      return `
                        <article class="rw-priority-card ${tag.className}">
                          <p class="rw-request-id">${request.registrationId || "REG-REQUEST"}</p>
                          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:0.2rem;">
                            <p class="rw-request-title">${request.property?.title || "Property"}</p>
                            <span class="rw-pill ${tag.className}">${tag.label}</span>
                          </div>
                          <p class="rw-request-meta">Buyer: ${request.buyer?.fullName || "N/A"}</p>
                          <p class="rw-request-meta">Seller: ${request.seller?.fullName || "N/A"}</p>
                          ${renderRequestProgress(request)}
                          <div class="rw-request-actions">
                            ${renderRequestActions(request, role, userId)}
                          </div>
                        </article>
                      `;
                    })
                    .join("")
                : `<p class="rw-empty">No priority requests available.</p>`
            }
          </div>
        </article>

        <article class="rw-panel">
          <div class="rw-panel-title">
            <h2>Recent Approvals</h2>
          </div>

          <div class="rw-approval-list">
            ${
              approvalFeed.length
                ? approvalFeed
                    .map(
                      (request) => `
                        <article class="rw-approval-item">
                          <div>
                            <p class="rw-approval-title">${request.property?.title || "Approved Property"}</p>
                            <p class="rw-approval-meta">ID: ${request.registrationId || "N/A"} • Approved: ${fmtDate(
                        request.updatedAt || request.createdAt
                      )}</p>
                          </div>
                          ${
                            ["admin", "government officer"].includes(role)
                              ? `<button class="btn btn-outline btn-sm" data-certificate="${request._id}">View Certificate</button>`
                              : `<a href="/pages/property-details.html?id=${request.property?._id || ""}">View Details</a>`
                          }
                        </article>
                      `
                    )
                    .join("")
                : `<p class="rw-empty">No approved requests found.</p>`
            }
          </div>
        </article>

        <article class="rw-panel">
          <div class="rw-panel-title">
            <h2>Rejected Filings</h2>
          </div>

          <div class="rw-approval-list">
            ${
              rejectedFeed.length
                ? rejectedFeed
                    .map(
                      (request) => `
                        <article class="rw-approval-item rw-rejected-item">
                          <div>
                            <p class="rw-approval-title">${request.property?.title || "Rejected Filing"}</p>
                            <p class="rw-approval-meta">ID: ${request.registrationId || "N/A"} • Rejected: ${fmtDate(
                        request.updatedAt || request.createdAt
                      )}</p>
                          </div>
                          <a href="/pages/property-details.html?id=${request.property?._id || ""}">View Details</a>
                        </article>
                      `
                    )
                    .join("")
                : `<p class="rw-empty">No rejected filings found.</p>`
            }
          </div>
        </article>

        <article class="rw-panel">
          <div class="rw-panel-title">
            <h2>Decision Timeline</h2>
          </div>

          <div class="rw-timeline">
            ${
              timelineFeed.length
                ? timelineFeed
                    .map((request) => {
                      const state = String(request.finalStatus || "Pending").toLowerCase();
                      const statusClass = state === "approved" ? "approved" : state === "rejected" ? "rejected" : "pending";
                      return `
                        <article class="rw-timeline-item ${statusClass}">
                          <div>
                            <p class="rw-timeline-title">${request.registrationId || "REG-REQUEST"} • ${
                        request.property?.title || "Property"
                      }</p>
                            <p class="rw-timeline-time">${fmtDate(request.updatedAt || request.createdAt)}</p>
                          </div>
                          <span class="badge ${statusClass}">${toTitle(state)}</span>
                        </article>
                      `;
                    })
                    .join("")
                : `<p class="rw-empty">No timeline events available.</p>`
            }
          </div>
        </article>
      </section>

      <aside class="rw-right">
        <article class="rw-right-card rw-volume">
          <h3>Weekly Volume</h3>
          <p class="rw-volume-big">${total}</p>
          <p class="rw-volume-sub">Registrations in current workflow</p>
          <div class="rw-volume-stats">
            <div><span>Approved</span><strong>${approvedCount}</strong></div>
            <div><span>Rejected</span><strong>${rejectedCount}</strong></div>
          </div>
        </article>

        <article class="rw-right-card">
          <h3 class="rw-tx-title">Recent Transactions</h3>
          <div class="rw-tx-list">
            ${
              txFeed.length
                ? txFeed
                    .map(
                      (tx) => `
                        <article class="rw-tx-item">
                          <p class="rw-tx-head">${toTitle(tx.status || "Transaction")}</p>
                          <p class="rw-tx-sub">${tx.transactionId || "TX-ID"} • ${tx.property?.title || "Property"}</p>
                          <p class="rw-tx-time">${fmtDate(tx.createdAt)}</p>
                        </article>
                      `
                    )
                    .join("")
                : `<p class="rw-empty">No transaction records available.</p>`
            }
          </div>
        </article>
      </aside>
    </section>
  `;

  bindWorkflowActions();
};

const loadRequestsWorkflow = async (options = {}) => {
  if (!requestsRoot) return;

  const { softLoad = false } = options;

  if (softLoad && cachedWorkflowData) {
    renderWorkflow(cachedWorkflowData);
    return;
  }

  requestsRoot.innerHTML = `
    <section class="rw-shell">
      <article class="card skeleton" style="height: 520px; border:none; box-shadow:none;"></article>
      <article class="card skeleton" style="height: 520px; border:none; box-shadow:none;"></article>
      <article class="card skeleton" style="height: 520px; border:none; box-shadow:none;"></article>
    </section>
  `;

  try {
    const user = getUser();
    const role = roleKey(user?.role);
    const userId = user?._id || user?.id;

    const [registrationData, transactionData, propertyApprovalData] = await Promise.all([
      apiRequest("/registrations"),
      apiRequest("/transactions").catch(() => ({ transactions: [] })),
      ["admin", "government officer"].includes(role)
        ? apiRequest("/properties/pending-approvals").catch(() => ({ properties: [] }))
        : Promise.resolve({ properties: [] }),
    ]);

    cachedWorkflowData = {
      role,
      userId,
      registrations: registrationData?.registrations || [],
      transactions: transactionData?.transactions || [],
      pendingProperties: propertyApprovalData?.properties || [],
    };

    renderWorkflow(cachedWorkflowData);
  } catch (error) {
    requestsRoot.innerHTML = `<p style="color:var(--danger); padding:1rem;">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadRequestsWorkflow);
