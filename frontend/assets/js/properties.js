const propertyList = document.getElementById("property-list");
const propertyFilterForm = document.getElementById("property-filter-form");
const addPropertyForm = document.getElementById("add-property-form");

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

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

  propertyList.innerHTML = properties
    .map(
      (property) => `
      <article class="property-item">
        <h3>${property.title}</h3>
        <p>${property.location} • ${property.type}</p>
        <p><strong>${toCurrency(property.price)}</strong> • ${property.area} sq.ft</p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <a class="btn btn-outline" href="/pages/property-details.html?id=${property._id}">View Details</a>
          ${
            currentRole === "buyer"
              ? `<button class="btn btn-primary" data-request="${property._id}">Request Registration</button>`
              : ""
          }
          ${
            ["seller", "admin"].includes(currentRole)
              ? `<button class="btn btn-outline" data-edit="${property._id}">Update</button>
                 <button class="btn btn-danger" data-delete="${property._id}">Delete</button>`
              : ""
          }
        </div>
      </article>
    `
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
        alert(error.message);
      }
    });
  });
};

const loadProperties = async (query = "") => {
  if (!propertyList) return;
  try {
    const user = getUser();
    const mine = new URLSearchParams(window.location.search).get("mine");
    const endpoint = mine && user && roleKey(user.role) === "seller" ? "/properties/my" : `/properties${query ? `?${query}` : ""}`;
    const data = await apiRequest(endpoint);
    renderProperties(data.properties || []);
  } catch (error) {
    propertyList.innerHTML = `<p style="color:#b42318;">${error.message}</p>`;
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
    await loadProperties();
  } catch (error) {
    output.textContent = error.message;
    output.style.color = "#b42318";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  const addBlock = document.getElementById("add-property-block");
  if (addBlock) {
    const canAdd = user && ["seller", "admin"].includes(roleKey(user.role));
    addBlock.classList.toggle("hidden", !canAdd);
  }

  loadProperties();
});
