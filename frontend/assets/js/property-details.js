const detailsRoot = document.getElementById("property-details-root");

const statusBadge = (status) => `badge ${String(status || "Pending").toLowerCase()}`;

const renderPropertyDetails = (property) => {
  detailsRoot.innerHTML = `
    <article class="card">
      <h2>${property.title}</h2>
      <p>${property.location} • ${property.type}</p>
      <p><strong>Price:</strong> ${property.price}</p>
      <p><strong>Area:</strong> ${property.area} sq.ft</p>
      <p><strong>Owner:</strong> ${property.owner?.fullName || "N/A"}</p>
    </article>

    <article class="card" style="margin-top:1rem;">
      <h3>Ownership History</h3>
      <div class="list">
        ${(property.ownershipHistory || [])
          .map(
            (entry) => `
            <div class="property-item">
              <strong>${entry.owner?.fullName || "Owner"}</strong>
              <p>${new Date(entry.transferredAt).toLocaleString()}</p>
              <div class="badge pending">${entry.note || "Record"}</div>
            </div>
          `
          )
          .join("") || "<p>No ownership history</p>"}
      </div>
    </article>

    <article class="card" style="margin-top:1rem;">
      <h3>Documents</h3>
      <div class="list">
        ${(property.documents || [])
          .map(
            (doc) => `
            <div class="property-item">
              <strong>${doc.originalName}</strong>
              <p>${doc.mimeType}</p>
              <a class="btn btn-outline" href="http://localhost:5000${doc.filePath}" target="_blank">Open</a>
            </div>
          `
          )
          .join("") || "<p>No documents uploaded</p>"}
      </div>
    </article>
  `;
};

const loadPropertyDetails = async () => {
  if (!detailsRoot) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    detailsRoot.innerHTML = "<p>Property id is missing</p>";
    return;
  }

  // Show skeleton loading state
  detailsRoot.innerHTML = `
    <article class="card skeleton" style="border: none; box-shadow: none; height: 200px; margin-bottom: 1rem;">
      <div class="skeleton-title" style="margin-bottom: 1rem;"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </article>
    <article class="card skeleton" style="border: none; box-shadow: none; height: 150px; margin-bottom: 1rem;">
      <div class="skeleton-title" style="width: 40%; margin-bottom: 1rem;"></div>
      <div class="skeleton-text short"></div>
    </article>
    <article class="card skeleton" style="border: none; box-shadow: none; height: 150px;">
      <div class="skeleton-title" style="width: 40%; margin-bottom: 1rem;"></div>
      <div class="skeleton-text short"></div>
    </article>
  `;

  try {
    const data = await apiRequest(`/properties/${id}`);
    renderPropertyDetails(data.property);
  } catch (error) {
    detailsRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadPropertyDetails);
