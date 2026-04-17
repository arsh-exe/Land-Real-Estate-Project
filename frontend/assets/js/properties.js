const propertyList = document.getElementById("property-list");
const propertyFilterForm = document.getElementById("property-filter-form");
const addPropertyForm = document.getElementById("add-property-form");
const propertyFormTitle = document.getElementById("property-form-title");
const propertyFormSubmit = document.getElementById("property-form-submit");
const propertyFormCancel = document.getElementById("property-form-cancel");
const sellModal = document.getElementById("sell-modal");
const sellModalClose = document.getElementById("sell-modal-close");
const sellModalCancel = document.getElementById("sell-modal-cancel");
const sellPropertyForm = document.getElementById("sell-property-form");
const sellFormMessage = document.getElementById("sell-form-message");
const propertyImagesInput = document.getElementById("property-images");
const propertyDocumentsInput = document.getElementById("documents");
const sellImagesInput = document.getElementById("sell-images");
const sellDocumentsInput = document.getElementById("sell-documents");
const clearPropertyImagesBtn = document.getElementById("clear-property-images");
const clearPropertyDocumentsBtn = document.getElementById("clear-property-documents");
const clearSellImagesBtn = document.getElementById("clear-sell-images");
const clearSellDocumentsBtn = document.getElementById("clear-sell-documents");
const propertyImagesSelected = document.getElementById("property-images-selected");
const propertyDocumentsSelected = document.getElementById("property-documents-selected");
const sellImagesSelected = document.getElementById("sell-images-selected");
const sellDocumentsSelected = document.getElementById("sell-documents-selected");
const CAROUSEL_INTERVAL_MS = 2000;

let propertyFormMode = "create";
let editingPropertyId = null;
let shouldOpenForSaleAfterModalSave = true;

const createFileChipManager = (inputEl, listEl, emptyText) => {
  if (!inputEl || !listEl) {
    return {
      clear: () => {},
    };
  }

  let selectedFiles = [];
  const fileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;

  const syncInputFiles = () => {
    const transfer = new DataTransfer();
    selectedFiles.forEach((file) => transfer.items.add(file));
    inputEl.files = transfer.files;
  };

  const render = () => {
    if (!selectedFiles.length) {
      listEl.innerHTML = `<span class="file-chip-empty">${emptyText}</span>`;
      return;
    }

    listEl.innerHTML = selectedFiles
      .map(
        (file, index) => `
          <span class="file-chip">
            <span>${file.name}</span>
            <button type="button" class="file-chip-remove" data-remove-index="${index}" aria-label="Remove ${file.name}">x</button>
          </span>
        `
      )
      .join("");
  };

  inputEl.addEventListener("change", () => {
    const incomingFiles = Array.from(inputEl.files || []);
    if (!incomingFiles.length) {
      render();
      return;
    }

    const existingKeys = new Set(selectedFiles.map(fileKey));
    incomingFiles.forEach((file) => {
      const key = fileKey(file);
      if (!existingKeys.has(key)) {
        selectedFiles.push(file);
        existingKeys.add(key);
      }
    });

    syncInputFiles();
    render();
  });

  listEl.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-index]");
    if (!removeButton) return;

    const index = Number(removeButton.dataset.removeIndex);
    if (Number.isNaN(index) || index < 0 || index >= selectedFiles.length) return;

    selectedFiles.splice(index, 1);
    syncInputFiles();
    render();
  });

  const clear = () => {
    selectedFiles = [];
    syncInputFiles();
    render();
  };

  render();

  return {
    clear,
  };
};

const propertyImagesManager = createFileChipManager(
  propertyImagesInput,
  propertyImagesSelected,
  "No images selected"
);
const propertyDocumentsManager = createFileChipManager(
  propertyDocumentsInput,
  propertyDocumentsSelected,
  "No documents selected"
);
const sellImagesManager = createFileChipManager(
  sellImagesInput,
  sellImagesSelected,
  "No images selected"
);
const sellDocumentsManager = createFileChipManager(
  sellDocumentsInput,
  sellDocumentsSelected,
  "No documents selected"
);

const resetPropertyFormMode = () => {
  propertyFormMode = "create";
  editingPropertyId = null;
  if (propertyFormTitle) propertyFormTitle.textContent = "Add Property";
  if (propertyFormSubmit) propertyFormSubmit.textContent = "Save Property";
  propertyFormCancel?.classList.add("hidden");
};

const openSellEditor = (propertyId, prefill, options = {}) => {
  if (!sellModal || !sellPropertyForm) return;

  const {
    shouldOpenForSale = true,
    title = "Want to Sell: Update Property Details",
    hint = "Update property details and upload new images/documents if needed.",
  } = options;

  propertyFormMode = "sell-edit";
  editingPropertyId = propertyId;
  shouldOpenForSaleAfterModalSave = shouldOpenForSale;

  const modalTitle = document.getElementById("sell-modal-title");
  const submitButton = sellPropertyForm.querySelector('button[type="submit"]');
  if (modalTitle) modalTitle.textContent = title;
  if (submitButton) {
    submitButton.textContent = shouldOpenForSale ? "Save & Open For Sale" : "Save Property Updates";
  }

  const titleInput = document.getElementById("sell-title");
  const locationInput = document.getElementById("sell-location");
  const typeInput = document.getElementById("sell-type");
  const priceInput = document.getElementById("sell-price");
  const areaInput = document.getElementById("sell-area");
  const imagesInput = document.getElementById("sell-images");
  const documentsInput = document.getElementById("sell-documents");

  if (titleInput) titleInput.value = prefill?.title || "";
  if (locationInput) locationInput.value = prefill?.location || "";
  if (typeInput) typeInput.value = prefill?.type || "Residential";
  if (priceInput) priceInput.value = prefill?.price ?? "";
  if (areaInput) areaInput.value = prefill?.area ?? "";
  sellImagesManager.clear();
  sellDocumentsManager.clear();

  if (sellFormMessage) {
    sellFormMessage.textContent = hint;
    sellFormMessage.style.color = "#344054";
  }

  sellModal.classList.remove("hidden");
  sellModal.setAttribute("aria-hidden", "false");
};

const closeSellModal = () => {
  if (!sellModal) return;
  sellModal.classList.add("hidden");
  sellModal.setAttribute("aria-hidden", "true");
  sellPropertyForm?.reset();
  sellImagesManager.clear();
  sellDocumentsManager.clear();
  if (sellFormMessage) sellFormMessage.textContent = "";
  editingPropertyId = null;
  propertyFormMode = "create";
  shouldOpenForSaleAfterModalSave = true;
};

const parsePropertiesPageMode = () => {
  const user = getUser();
  const role = roleKey(user?.role);
  const params = new URLSearchParams(window.location.search);
  const view = (params.get("view") || "").trim().toLowerCase();
  const action = (params.get("action") || "").trim().toLowerCase();
  const mine = (params.get("mine") || "").trim().toLowerCase();

  const isSeller = role === "seller" || role === "user" || role === "buyer";
  const isAdmin = role === "admin";
  const isBuyer = role === "buyer" || role === "user";

  if ((isSeller || isAdmin) && (view === "add" || action === "add")) {
    return "add";
  }

  if ((isSeller || isBuyer) && (view === "mine" || mine === "1" || mine === "true")) {
    return "mine";
  }

  if (isSeller && view === "selling") {
    return "selling";
  }

  return "all";
};

const updatePropertiesPageLayout = () => {
  const user = getUser();
  const role = roleKey(user?.role);
  const mode = parsePropertiesPageMode();

  const titleEl = document.getElementById("properties-title");
  const subtitleEl = document.getElementById("properties-subtitle");
  const addBlock = document.getElementById("add-property-block");
  const filterBlock = document.getElementById("filter-block");
  const listingBlock = document.getElementById("listing-block");

  if (addBlock) {
    const canAdd = user && ["user", "seller", "buyer", "admin"].includes(role);
    addBlock.classList.toggle("hidden", !canAdd);
  }

  if (mode === "add") {
    if (titleEl) titleEl.textContent = "Add Property";
    if (subtitleEl) subtitleEl.textContent = "Create a new property listing for registration and management.";
    filterBlock?.classList.add("hidden");
    listingBlock?.classList.add("hidden");
    addBlock?.classList.remove("hidden");
    return;
  }

  if (mode === "mine") {
    if (titleEl) titleEl.textContent = "My Properties";
    if (subtitleEl) subtitleEl.textContent = "View and manage properties registered under your account.";
    filterBlock?.classList.add("hidden");
    addBlock?.classList.add("hidden");
    listingBlock?.classList.remove("hidden");
    return;
  }

  if (mode === "selling") {
    if (titleEl) titleEl.textContent = "Currently Selling";
    if (subtitleEl) subtitleEl.textContent = "Properties marked open for sale and those in active transfer requests.";
    filterBlock?.classList.add("hidden");
    addBlock?.classList.add("hidden");
    listingBlock?.classList.remove("hidden");
    return;
  }

  if (titleEl) titleEl.textContent = "Property Registry";
  if (subtitleEl)
    subtitleEl.textContent = "Search listings, apply filters, manage submissions, and register your properties securely.";
  filterBlock?.classList.remove("hidden");
  // In search/list mode, hide the add form and keep focus on discovery.
  addBlock?.classList.add("hidden");
  listingBlock?.classList.remove("hidden");
};

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

const getPropertyStatusClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "sold") return "sold";
  if (normalized === "pending request") return "pending";
  return "available";
};

const buildPropertyStatusMap = (registrations = []) => {
  const map = new Map();

  registrations.forEach((registration) => {
    const propertyId =
      registration?.property?._id ||
      registration?.property?.id ||
      registration?.property;
    if (!propertyId) return;

    const status = String(registration.finalStatus || "Pending").toLowerCase();
    const previous = map.get(String(propertyId)) || "available";

    // Priority: sold > pending request > available
    if (status === "approved") {
      map.set(String(propertyId), "sold");
      return;
    }

    if (status === "pending" && previous !== "sold") {
      map.set(String(propertyId), "pending request");
      return;
    }

    if (!map.has(String(propertyId))) {
      map.set(String(propertyId), "available");
    }
  });

  return map;
};

const getImageDocuments = (property = {}) => {
  const docs = Array.isArray(property.documents) ? property.documents : [];
  return docs.filter((doc) => (doc?.mimeType || "").toLowerCase().startsWith("image/"));
};

const normalizeProperty = (property = {}) => {
  const title = property.title || property.name || "Untitled property";
  const location = property.location || property.address || "Location not provided";
  const type = property.type || property.propertyType || "Other";
  const area = property.area ?? property.size ?? null;
  const price = property.price ?? property.amount ?? 0;

  return {
    ...property,
    title,
    location,
    type,
    area,
    price,
  };
};

const queryStringFromForm = (formData) => {
  const params = new URLSearchParams();
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, value);
    }
  });
  return params.toString();
};

const parseCarouselImages = (carousel) => {
  try {
    return JSON.parse(decodeURIComponent(carousel.dataset.images || "%5B%5D"));
  } catch (_error) {
    return [];
  }
};

const setCarouselFrame = (carousel, nextIndex) => {
  const track = carousel.querySelector(".carousel-track");
  if (!track) return;

  const images = parseCarouselImages(carousel);
  const totalRealImages = images.length;
  
  if (totalRealImages <= 1) return;

  // 1. Ensure transitions are ON
  track.style.transition = "transform 0.5s ease-in-out";

  let targetIndex = nextIndex;

  // If going backwards from the first image, loop to the last real image
  if (targetIndex < 0) {
    targetIndex = totalRealImages - 1;
  }

  // 2. Perform the slide
  const slideWidth = carousel.clientWidth;
  track.style.transform = `translateX(-${targetIndex * slideWidth}px)`;
  carousel.dataset.index = String(targetIndex);

  // 3. Update the dot indicators
  const dotsContainer = carousel.querySelector("[data-carousel-dots]");
  if (dotsContainer) {
    const displayIndex = targetIndex === totalRealImages ? 0 : targetIndex;
    const dots = dotsContainer.querySelectorAll(".carousel-dot");
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === displayIndex);
    });
  }

  // 4. The Seamless Loop Magic!
  // If we just slid to the clone at the end of the track...
  if (targetIndex === totalRealImages) {
    carousel.dataset.isAnimating = "true"; // Lock navigation briefly

    // Wait exactly 500ms for the CSS sliding animation to finish
    window.setTimeout(() => {
      // Turn off animation
      track.style.transition = "none";

      // Instantly teleport back to the real Image 1
      track.style.transform = `translateX(0px)`;
      carousel.dataset.index = "0";

      // Force the browser to register the teleport before unlocking
      track.offsetHeight;
      carousel.dataset.isAnimating = "false";
    }, 500);
  }
};

const moveCarousel = (carousel, direction) => {
  // Prevent rapid clicking while the teleport is happening
  if (carousel.dataset.isAnimating === "true") return;

  const currentIndex = parseInt(carousel.dataset.index || "0", 10);
  setCarouselFrame(carousel, currentIndex + direction);
};

const startCarouselAutoplay = (carousel) => {
  const images = parseCarouselImages(carousel);
  if (images.length < 2) return;

  let timer = null;

  const startTimer = () => {
    if (timer) return;
    timer = window.setInterval(() => {
      if (!carousel.isConnected) {
        stopTimer();
        return;
      }

      moveCarousel(carousel, 1);
    }, CAROUSEL_INTERVAL_MS);
  };

  const stopTimer = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  };

  startTimer();
};

const renderProperties = (properties = [], propertyStatusMap = new Map()) => {
  if (!propertyList) return;
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const pageMode = parsePropertiesPageMode();
  const normalizedProperties = properties
    .map(normalizeProperty)
    .filter((property) => {
      if (["mine", "selling"].includes(pageMode)) return true;

      if (!["user", "buyer", "seller"].includes(currentRole)) return true;

      const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
      if (!currentUserId || !ownerId) return true;

      return String(ownerId) !== String(currentUserId);
    });

  if (normalizedProperties.length === 0) {
    propertyList.innerHTML = '<p style="color:#617189;">No properties found for the selected filters.</p>';
    return;
  }

  propertyList.innerHTML = normalizedProperties
    .map(
      (property) => {
        const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
        const isOwner = Boolean(currentUserId) && String(ownerId) === String(currentUserId);
        const isAdmin = currentRole === "admin";
        const approvalStatus = String(property?.approval?.status || "Approved");
        const approvalClass =
          approvalStatus.toLowerCase() === "approved"
            ? "available"
            : approvalStatus.toLowerCase() === "rejected"
            ? "sold"
            : "pending";
        const imageDocs = getImageDocuments(property).filter((doc) => Boolean(doc?.filePath));
        const imageUrls = imageDocs.map((doc) => `${SERVER_URL}${doc.filePath}`);
        const hasImage = imageUrls.length > 0;
        const encodedImages = encodeURIComponent(JSON.stringify(imageUrls));
        const status = propertyStatusMap.get(String(property._id)) || "available";
        const statusClass = getPropertyStatusClass(status);
        const sellEditPayload = encodeURIComponent(
          JSON.stringify({
            title: property.title,
            location: property.location,
            type: property.type,
            price: property.price,
            area: property.area,
          })
        );
        const actionButtons = `
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem;">
            <a href="/pages/property-details?id=${property._id}" class="btn btn-outline btn-sm">View Details</a>
            ${
              pageMode === "mine" && isOwner && currentRole === "user"
                ? approvalStatus === "Approved"
                  ? `<button class="btn btn-primary btn-sm" data-sell-edit="${property._id}" data-sell-payload="${sellEditPayload}">${
                      property.isOpenForSale ? "Update Sale Details" : "Want to Sell"
                    }</button>
                     ${
                       property.isOpenForSale
                         ? `<button class="btn btn-outline btn-sm" data-sale-stop="${property._id}">Stop Selling</button>`
                         : ""
                     }`
                  : `<button class="btn btn-secondary btn-sm" data-doc-edit="${property._id}" data-sell-payload="${sellEditPayload}">Update Documents</button>`
                : ""
            }
            ${
              currentRole === "user" && !isOwner
                ? `<button class="btn btn-primary btn-sm" data-request="${property._id}">Request Registration</button>`
                : ""
            }
            ${
              isAdmin
                ? `<button class="btn btn-secondary btn-sm" data-edit="${property._id}">Update</button>
                   <button class="btn btn-danger btn-sm" data-delete="${property._id}">Delete</button>`
                : ""
            }
          </div>
        `;
        const imageMarkup = hasImage
          ? `<div class="carousel-track" style="transform: translateX(0px);">
               ${imageUrls
                 .map(
                   (url) => `<img class="property-image" src="${url}" alt="${property.title} image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'property-image-placeholder\\'>Image failed to load</div>'" />`
                 )
                 .join("")}
               ${imageUrls.length > 1 ? `<img class="property-image" src="${imageUrls[0]}" aria-hidden="true" loading="lazy" />` : ""}
             </div>
             ${
               imageUrls.length > 1
                 ? `<div class="carousel-dots" data-carousel-dots>
                      ${imageUrls.map((_, i) => `<div class="carousel-dot ${i === 0 ? "active" : ""}"></div>`).join("")}
                    </div>`
                 : ""
             }`
          : `<div class="property-image-placeholder">No image found</div>`;

        return `
      <article class="property-item">
        <div class="property-media ${hasImage ? "property-carousel" : ""}" ${
          hasImage ? `data-images="${encodedImages}" data-index="0"` : ""
        }>
          ${imageMarkup}
        </div>
        <h3>${property.title}</h3>
        ${pageMode === "mine" && status === "sold" ? "" : `<p><span class="badge ${statusClass}">${status}</span></p>`}
        <p><span class="badge ${approvalClass}">approval: ${approvalStatus.toLowerCase()}</span></p>
        ${
          pageMode === "mine"
            ? `<p><span class="badge ${property.isOpenForSale ? "available" : "pending"}">${
                property.isOpenForSale ? "open for sale" : "not for sale"
              }</span></p>`
            : ""
        }
        <p>${property.location} • ${property.type}</p>
        <p><strong>${toCurrency(property.price)}</strong> • ${property.area ?? "Area not specified"}${
        property.area !== null && property.area !== undefined ? " sq.ft" : ""
      }</p>
        ${actionButtons}
      </article>
    `;
      }
    )
    .join("");

  propertyList.querySelectorAll(".property-media").forEach((media, index) => {
    const propertyCard = media.closest(".property-item");
    const detailLink = propertyCard?.querySelector('a[href^="/pages/property-details?id="]');
    if (!detailLink) return;

    media.addEventListener("click", (event) => {
      if (event.target.closest("a") || event.target.closest("button") || event.target.closest("input")) {
        return;
      }

      window.location.href = detailLink.getAttribute("href");
    });

    if (media.classList.contains("property-carousel")) {
      startCarouselAutoplay(media);
    }
  });

  propertyList.querySelectorAll("[data-request]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest("/registrations", {
          method: "POST",
          body: JSON.stringify({ propertyId: button.dataset.request }),
        });
        alert("Request submitted successfully");
      } catch (error) {
        alert(error.message);
      }
    });
  });

  propertyList.querySelectorAll("[data-sell-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const prefill = JSON.parse(decodeURIComponent(button.dataset.sellPayload || "%7B%7D"));
        openSellEditor(button.dataset.sellEdit, prefill, {
          shouldOpenForSale: true,
          title: "Want to Sell: Update Property Details",
          hint: "Update property details and upload new images/documents if needed.",
        });
      } catch (_error) {
        showToast("Unable to open sell editor for this property", "error");
      }
    });
  });

  propertyList.querySelectorAll("[data-doc-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const prefill = JSON.parse(decodeURIComponent(button.dataset.sellPayload || "%7B%7D"));
        openSellEditor(button.dataset.docEdit, prefill, {
          shouldOpenForSale: false,
          title: "Update Property Documents For Approval",
          hint: "Government approval is pending/rejected. Update details and documents, then save to continue review.",
        });
      } catch (_error) {
        showToast("Unable to open sell editor for this property", "error");
      }
    });
  });

  propertyList.querySelectorAll("[data-sale-stop]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Stop selling this property?")) return;

      try {
        await apiRequest(`/properties/${button.dataset.saleStop}/sale-status`, {
          method: "PATCH",
          body: JSON.stringify({ isOpenForSale: false }),
        });
        showToast("Property removed from sale", "success");
        await loadProperties();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  propertyList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const title = prompt("New title (leave blank to keep current):") || undefined;
      const priceInput = prompt("New price (leave blank to keep current):");
      const price = priceInput ? Number(priceInput) : undefined;

      try {
        await apiRequest(`/properties/${button.dataset.edit}`, {
          method: "PUT",
          body: JSON.stringify({ title, price }),
        });
        await loadProperties();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  propertyList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this property record?")) return;

      try {
        await apiRequest(`/properties/${button.dataset.delete}`, {
          method: "DELETE",
        });
        await loadProperties();
      } catch (error) {
        if ((error.message || "").toLowerCase().includes("forbidden")) {
          alert("You can only delete your own properties.");
        } else {
          alert(error.message);
        }
      }
    });
  });

  propertyList.querySelectorAll("[data-upload-image]").forEach((input) => {
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      try {
        await apiRequest(`/properties/${input.dataset.uploadImage}`, {
          method: "PUT",
          body: formData,
        });
        showToast("Property images uploaded successfully", "success");
        await loadProperties();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        input.value = "";
      }
    });
  });
};

const loadProperties = async (query = "") => {
  if (!propertyList) return;
  
  // Show skeleton loading state
  propertyList.innerHTML = Array(3).fill(`
    <article class="property-item skeleton" style="border: none; box-shadow: none;">
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
      <div style="display:flex; gap:0.5rem; margin-top:1rem;">
        <div class="skeleton-text" style="width: 100px; height: 36px; border-radius: 8px;"></div>
        <div class="skeleton-text" style="width: 150px; height: 36px; border-radius: 8px;"></div>
      </div>
    </article>
  `).join("");

  try {
    const user = getUser();
    const role = roleKey(user?.role);
    const mode = parsePropertiesPageMode();
    const shouldLoadMine = ["user", "seller", "buyer"].includes(role) && mode === "mine";
    const shouldLoadSelling = ["user", "seller", "buyer"].includes(role) && mode === "selling";
    const shouldLoadAllForReview = ["admin", "government officer"].includes(role) && !shouldLoadMine && !shouldLoadSelling;
    let endpoint = shouldLoadAllForReview
      ? `/properties/all${query ? `?${query}` : ""}`
      : shouldLoadSelling
      ? "/properties/selling/current"
      : shouldLoadMine
      ? "/properties/my"
      : `/properties${query ? `?${query}` : ""}`;

    if (!shouldLoadMine && !shouldLoadSelling && ["user", "buyer", "seller"].includes(role)) {
      const separator = endpoint.includes("?") ? "&" : "?";
      endpoint = `${endpoint}${separator}onlyForSale=true`;
    }
    const [propertyData, registrationData] = await Promise.all([
      apiRequest(endpoint),
      apiRequest("/registrations").catch(() => ({ registrations: [] })),
    ]);

    const statusMap = buildPropertyStatusMap(registrationData.registrations || []);
    renderProperties(propertyData.properties || [], statusMap);
  } catch (error) {
    propertyList.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

propertyFilterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(propertyFilterForm).entries());
  const query = queryStringFromForm(formData);
  await loadProperties(query);
});

addPropertyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const output = document.getElementById("property-form-message");

  try {
    const formData = new FormData(addPropertyForm);
    await apiRequest("/properties", {
      method: "POST",
      body: formData,
    });

    addPropertyForm.reset();
    propertyImagesManager.clear();
    propertyDocumentsManager.clear();
    output.textContent = "Property submitted and awaiting government approval";
    output.style.color = "#067647";
    // Send sellers/admins to a listing view after creation so they can verify the new record.
    const role = roleKey(getUser()?.role);
    if (["user", "seller"].includes(role)) {
      window.location.href = "/pages/properties?view=mine";
      return;
    }
    if (role === "admin") {
      window.location.href = "/pages/properties.html";
      return;
    }

    await loadProperties();
  } catch (error) {
    output.textContent = error.message;
    output.style.color = "#b42318";
  }
});

sellPropertyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingPropertyId) {
    showToast("Select a property before updating sale details", "error");
    return;
  }

  try {
    const formData = new FormData(sellPropertyForm);
    await apiRequest(`/properties/${editingPropertyId}`, {
      method: "PUT",
      body: formData,
    });

    if (shouldOpenForSaleAfterModalSave) {
      await apiRequest(`/properties/${editingPropertyId}/sale-status`, {
        method: "PATCH",
        body: JSON.stringify({ isOpenForSale: true }),
      });
      showToast("Property updated and listed for sale", "success");
    } else {
      showToast("Property details/documents updated", "success");
    }

    closeSellModal();
    await loadProperties();
  } catch (error) {
    if (sellFormMessage) {
      sellFormMessage.textContent = error.message;
      sellFormMessage.style.color = "#b42318";
    }
    showToast(error.message, "error");
  }
});

propertyFormCancel?.addEventListener("click", () => {
  const addBlock = document.getElementById("add-property-block");
  const mode = parsePropertiesPageMode();
  const output = document.getElementById("property-form-message");

  addPropertyForm?.reset();
  propertyImagesManager.clear();
  propertyDocumentsManager.clear();
  resetPropertyFormMode();

  if (output) {
    output.textContent = "";
  }

  if (mode === "mine" || mode === "selling") {
    addBlock?.classList.add("hidden");
  }
});

sellModalClose?.addEventListener("click", closeSellModal);
sellModalCancel?.addEventListener("click", closeSellModal);
clearPropertyImagesBtn?.addEventListener("click", () => {
  propertyImagesManager.clear();
  showToast("Selected images removed", "info");
});
clearPropertyDocumentsBtn?.addEventListener("click", () => {
  propertyDocumentsManager.clear();
  showToast("Selected documents removed", "info");
});
clearSellImagesBtn?.addEventListener("click", () => {
  sellImagesManager.clear();
  showToast("Selected images removed", "info");
});
clearSellDocumentsBtn?.addEventListener("click", () => {
  sellDocumentsManager.clear();
  showToast("Selected documents removed", "info");
});
sellModal?.addEventListener("click", (event) => {
  if (event.target === sellModal) {
    closeSellModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sellModal && !sellModal.classList.contains("hidden")) {
    closeSellModal();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  updatePropertiesPageLayout();
  if (parsePropertiesPageMode() !== "add") {
    loadProperties();
  }
});
