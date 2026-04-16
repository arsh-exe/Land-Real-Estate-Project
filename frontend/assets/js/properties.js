const propertyList = document.getElementById("property-list");
const propertyFilterForm = document.getElementById("property-filter-form");
const addPropertyForm = document.getElementById("add-property-form");

const parsePropertiesPageMode = () => {
  const user = getUser();
  const role = roleKey(user?.role);
  const params = new URLSearchParams(window.location.search);
  const view = (params.get("view") || "").trim().toLowerCase();
  const action = (params.get("action") || "").trim().toLowerCase();
  const mine = (params.get("mine") || "").trim().toLowerCase();

  const isSeller = role === "seller";
  const isAdmin = role === "admin";

  if ((isSeller || isAdmin) && (view === "add" || action === "add")) {
    return "add";
  }

  if (isSeller && (view === "mine" || mine === "1" || mine === "true")) {
    return "mine";
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
    const canAdd = user && ["seller", "admin"].includes(role);
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
    if (subtitleEl) subtitleEl.textContent = "View and manage properties registered under your seller account.";
    filterBlock?.classList.add("hidden");
    addBlock?.classList.add("hidden");
    listingBlock?.classList.remove("hidden");
    return;
  }

  if (titleEl) titleEl.textContent = "Property Registry";
  if (subtitleEl)
    subtitleEl.textContent = "Search listings, apply filters, manage submissions, and register your properties securely.";
  filterBlock?.classList.remove("hidden");
  // Keep add form available as a fallback for seller/admin so users can always add from this page.
  if (user && ["seller", "admin"].includes(role)) {
    addBlock?.classList.remove("hidden");
  } else {
    addBlock?.classList.add("hidden");
  }
  listingBlock?.classList.remove("hidden");
};

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

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

const renderProperties = (properties = []) => {
  if (!propertyList) return;
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const normalizedProperties = properties.map(normalizeProperty);

  if (normalizedProperties.length === 0) {
    propertyList.innerHTML = '<p style="color:#617189;">No properties found for the selected filters.</p>';
    return;
  }

  propertyList.innerHTML = normalizedProperties
    .map(
      (property) => {
        const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
        const canManage =
          currentRole === "admin" ||
          (currentRole === "seller" && Boolean(currentUserId) && String(ownerId) === String(currentUserId));

        return `
      <article class="property-item">
        <h3>${property.title}</h3>
        <p>${property.location} • ${property.type}</p>
        <p><strong>${toCurrency(property.price)}</strong> • ${property.area ?? "Area not specified"}${
        property.area !== null && property.area !== undefined ? " sq.ft" : ""
      }</p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <a class="btn btn-outline" href="/pages/property-details.html?id=${property._id}">View Details</a>
          ${
            currentRole === "buyer"
              ? `<button class="btn btn-primary" data-request="${property._id}">Request Registration</button>`
              : ""
          }
          ${
            canManage
              ? `<button class="btn btn-outline" data-edit="${property._id}">Update</button>
                 <button class="btn btn-danger" data-delete="${property._id}">Delete</button>`
              : ""
          }
        </div>
      </article>
    `;
      }
    )
    .join("");

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
    const shouldLoadMine = role === "seller" && mode === "mine";
    const endpoint = shouldLoadMine
      ? "/properties/my"
      : `/properties${query ? `?${query}` : ""}`;
    const data = await apiRequest(endpoint);
    renderProperties(data.properties || []);
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
    output.textContent = "Property added successfully";
    output.style.color = "#067647";
    // Send sellers/admins to a listing view after creation so they can verify the new record.
    const role = roleKey(getUser()?.role);
    if (role === "seller") {
      window.location.href = "/pages/properties.html?view=mine";
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

window.addEventListener("DOMContentLoaded", () => {
  updatePropertiesPageLayout();
  if (parsePropertiesPageMode() !== "add") {
    loadProperties();
  }
});
