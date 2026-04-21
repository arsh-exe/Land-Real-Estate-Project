const detailsRoot = document.getElementById("property-details-root");

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const resolveImageUrl = (image) => {
  if (!image) return "";
  if (typeof image === "string") {
    return image.startsWith("http") ? image : `${SERVER_URL}${image}`;
  }
  const path = image.filePath || image.url || image.src;
  if (!path) return "";
  return path.startsWith("http") ? path : `${SERVER_URL}${path}`;
};

const getImageDocuments = (property = {}) => {
  const docs = Array.isArray(property.documents) ? property.documents : [];
  return docs.filter((doc) => String(doc?.mimeType || "").toLowerCase().startsWith("image/") && doc?.filePath);
};

const getDocumentTypeLabel = (doc = {}) => {
  const mime = String(doc.mimeType || "").toLowerCase();
  const kind = String(doc.kind || "").toUpperCase();

  if (kind === "CERTIFICATE") return "CERT";
  if (mime.includes("pdf")) return "PDF";
  return "DOC";
};

const formatDate = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const renderPropertyDetails = (property, propertyStatus = "Available") => {
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
  const isOwner = Boolean(currentUserId) && String(ownerId) === String(currentUserId);

  const imageDocs = getImageDocuments(property);
  const imageUrls = [
    ...(Array.isArray(property.images) ? property.images.map(resolveImageUrl) : []),
    ...imageDocs.map((doc) => doc.filePath.startsWith("http") ? doc.filePath : `${SERVER_URL}${doc.filePath}`),
  ].filter(Boolean);

  const galleryImages = [...new Set(imageUrls)];
  if (!galleryImages.length) {
    galleryImages.push("https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1400&q=70");
  }

  const thumbImages = galleryImages.slice(0, 4);
  const remainingThumbs = Math.max(0, galleryImages.length - 4);

  const documents = Array.isArray(property.documents) ? property.documents : [];
  const nonImageDocs = documents.filter((doc) => !String(doc?.mimeType || "").toLowerCase().startsWith("image/"));
  const ownershipHistory = Array.isArray(property.ownershipHistory) ? property.ownershipHistory : [];

  const legalStatus = property?.approval?.status || propertyStatus || "Pending";
  const isVerified = legalStatus === "Approved";
  const isForSale = Boolean(property?.isOpenForSale);

  const titleNumber = property?.titleNumber || `NGL${String(property?._id || "000000").slice(-6).toUpperCase()}`;
  const lastRegistered = formatDate(property?.updatedAt || property?.createdAt);

  const metrics = [
    { icon: "▦", value: property?.bedrooms ?? 6, label: "Bedrooms" },
    { icon: "▥", value: property?.bathrooms ?? 4, label: "Bathrooms" },
    { icon: "◪", value: property?.area ? `${property.area}` : "4,850", label: "Sq Ft (Internal)" },
    { icon: "▲", value: property?.plotSize || "0.2", label: "Acres (Plot)" },
  ];

  let transferAction = `<button class="btn btn-secondary" disabled>Request Official Transfer</button>`;
  if (currentRole === "user" && !isOwner && isForSale) {
    transferAction = `<button class="btn btn-primary" data-request="${property._id}">Request Official Transfer</button>`;
  } else if (isOwner) {
    transferAction = `<button class="btn btn-outline" disabled>Owned by You</button>`;
  }

  const docItems = nonImageDocs.length
    ? nonImageDocs
        .slice(0, 3)
        .map(
          (doc) => `
            <article class="pd3-doc-item">
              <span class="pd3-doc-icon">${getDocumentTypeLabel(doc)}</span>
              <div>
                <p class="pd3-doc-title">${doc.originalName || "Registry Document"}</p>
                <p class="pd3-doc-meta">${doc.mimeType || "PDF"}</p>
              </div>
              <a class="pd3-doc-link" href="${doc.filePath?.startsWith('http') ? doc.filePath : `${SERVER_URL}${doc.filePath}`}" target="_blank" rel="noopener noreferrer">↓</a>
            </article>
          `
        )
        .join("")
    : `<p class="pd3-empty">No registered documents available.</p>`;

  const historyItems = ownershipHistory.length
    ? ownershipHistory
        .map(
          (entry, index) => `
            <article class="pd3-history-item ${index === 0 ? "active" : ""}">
              <h4>${index === 0 ? "Current Owner" : index === 1 ? "Previous Owner" : "Historical Owner"}</h4>
              <p class="pd3-history-name">${entry.owner?.fullName || "Owner"}</p>
              <p>Registered: ${formatDate(entry.transferredAt)}</p>
              <p>${entry.note || "Registry record"}</p>
            </article>
          `
        )
        .join("")
    : `<p class="pd3-empty">No ownership history recorded.</p>`;

  detailsRoot.innerHTML = `
    <section class="pd3-root">
      <section class="pd3-top">
        <div class="pd3-gallery-col">
          <button class="pd3-main-image-wrap" type="button" aria-label="Open main property image">
            <img id="pd3-main-image" class="pd3-main-image" src="${galleryImages[0]}" alt="Main property view" loading="lazy" />
          </button>

          <div class="pd3-thumbs">
            ${thumbImages
              .map(
                (image, index) => `
                  <button class="pd3-thumb ${index === 0 ? "active" : ""}" type="button" data-image="${image}">
                    <img src="${image}" alt="Property thumbnail ${index + 1}" loading="lazy" />
                    ${index === thumbImages.length - 1 && remainingThumbs ? `<span class="pd3-thumb-overlay">+${remainingThumbs} Photos</span>` : ""}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>

        <aside class="pd3-summary-col">
          <span class="pd3-badge">${isVerified ? "Verified Registry" : legalStatus}</span>
          <h1>${property.title || "Untitled Estate"}</h1>
          <p class="pd3-location">${property.location || "Location not provided"}</p>

          <article class="pd3-summary-card">
            <h3>Registry Summary</h3>
            <div class="pd3-summary-row"><span>Title Number</span><strong>${titleNumber}</strong></div>
            <div class="pd3-summary-row"><span>Last Registered</span><strong>${lastRegistered}</strong></div>
            <div class="pd3-summary-row"><span>Current Valuation</span><strong>${toCurrency(property.price || 0)}</strong></div>
          </article>

          <div class="pd3-actions">
            ${transferAction}
            <button class="btn btn-outline" type="button" disabled>Contact Registry Agent</button>
          </div>
        </aside>
      </section>

      <section class="pd3-bottom">
        <div class="pd3-left">
          <article class="pd3-panel pd3-overview">
            <h2>Property Overview</h2>
            <div class="pd3-overview-copy">${
              property.description ||
              "The Wellington Manor presents a rare opportunity to acquire a substantial Grade II listed residence situated within one of Kensington's most sought-after enclaves. Originally constructed in 1842, the property retains an exceptional array of period features including intricate cornicing, working marble fireplaces, and original sash windows, seamlessly integrated with modern infrastructure."
            }</div>
          </article>

          <article class="pd3-panel pd3-stats">
            <h2>Key Statistics</h2>
            <div class="pd3-stats-grid">
              ${metrics
                .map(
                  (metric) => `
                    <article class="pd3-stat-card">
                      <span class="pd3-stat-icon">${metric.icon}</span>
                      <p class="pd3-stat-value">${metric.value}</p>
                      <p class="pd3-stat-label">${metric.label}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </article>
        </div>

        <aside class="pd3-right">
          <article class="pd3-panel pd3-history">
            <h2>Ownership History</h2>
            ${historyItems}
          </article>

          <article class="pd3-panel pd3-docs">
            <h2>Registered Documents</h2>
            ${docItems}
          </article>
        </aside>
      </section>

      <div class="pd3-lightbox" aria-hidden="true">
        <button class="pd3-lightbox-close" type="button" data-lightbox-close aria-label="Close image">×</button>
        <img class="pd3-lightbox-image" src="" alt="Expanded property image" />
      </div>
    </section>
  `;

  const mainImage = detailsRoot.querySelector("#pd3-main-image");
  const thumbButtons = detailsRoot.querySelectorAll(".pd3-thumb");
  const mainImageWrap = detailsRoot.querySelector(".pd3-main-image-wrap");
  const lightbox = detailsRoot.querySelector(".pd3-lightbox");
  const lightboxImage = detailsRoot.querySelector(".pd3-lightbox-image");

  const openLightbox = (src) => {
    if (!lightbox || !lightboxImage || !src) return;
    lightboxImage.src = src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  thumbButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.image || "";
      if (!mainImage || !next) return;
      mainImage.src = next;
      thumbButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  mainImageWrap?.addEventListener("click", () => openLightbox(mainImage?.src));
  detailsRoot.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);

  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.classList.contains("open")) {
      closeLightbox();
    }
  });

  detailsRoot.querySelectorAll("[data-request]").forEach((button) => {
    button.addEventListener("click", async () => {
      const originalText = button.textContent;
      try {
        button.disabled = true;
        button.textContent = "Requesting...";
        await apiRequest("/registrations", {
          method: "POST",
          body: JSON.stringify({ propertyId: button.dataset.request }),
        });
        showToast("Transfer request submitted successfully", "success");
        button.textContent = "Request Submitted";
      } catch (error) {
        button.disabled = false;
        button.textContent = originalText;
        showToast(error.message, "error");
      }
    });
  });
};

const loadPropertyDetails = async () => {
  if (!detailsRoot) return;

  const urlParams = new URL(window.location.href);
  let id = urlParams.searchParams.get("id");

  if (!id) {
    const pathMatch = window.location.pathname.match(/property-details\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      id = decodeURIComponent(pathMatch[1]);
    }
  }

  if (!id) {
    id = sessionStorage.getItem("selectedPropertyId");
  }

  // Handle JS stringified null/undefined that can bypass falsy checks
  if (id === "undefined" || id === "null" || id === "[object Object]") {
    id = "";
  }

  if (!id) {
    detailsRoot.innerHTML = `
      <article class="card" style="max-width: 560px;">
        <h3 style="margin-top: 0;">Property id is missing</h3>
        <p>Please open a property from the listings page to view full details.</p>
        <p class="text-muted" style="margin-top:0.5rem; font-size:0.875rem;">Debug: If you arrived here from a valid link, the URL parameter was lost.</p>
        <a href="/pages/properties.html" class="btn btn-primary" style="margin-top:1rem;">Go to Properties</a>
      </article>
    `;
    return;
  }

  sessionStorage.setItem("selectedPropertyId", id);

  detailsRoot.innerHTML = `
    <section class="pd3-root">
      <article class="card skeleton" style="height: 380px; border: none; box-shadow: none;"></article>
      <article class="card skeleton" style="height: 280px; border: none; box-shadow: none;"></article>
      <article class="card skeleton" style="height: 220px; border: none; box-shadow: none;"></article>
    </section>
  `;

  try {
    const data = await apiRequest(`/properties/${id}`);
    renderPropertyDetails(data.property, data.propertyStatus || "Available");
  } catch (error) {
    detailsRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadPropertyDetails);
