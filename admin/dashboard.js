const SUPABASE_URL = "https://drpoikzfnmmofhnkbeer.supabase.co";
const SUPABASE_KEY = "sb_publishable_kphccPmumtpk2CKf6zXiLw_tsJR3epR";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let sections = [];
let items = [];
let deliveryAreas = [];
let settings = {};

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function requireAdmin() {
  const { data, error } = await db.auth.getSession();

  if (error || !data.session) {
    location.href = "../";
    return false;
  }

  const { data: admin, error: adminError } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", data.session.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await db.auth.signOut();
    location.href = "../";
    return false;
  }

  return true;
}

async function loadAll() {
  const [
    sectionsResult,
    itemsResult,
    deliveryResult,
    settingsResult
  ] = await Promise.all([
    db.from("menu_sections").select("*").order("page").order("sort_order").order("name"),
    db.from("menu_items").select("*").order("sort_order").order("name"),
    db.from("delivery_areas").select("*").order("sort_order").order("name"),
    db.from("site_settings").select("*")
  ]);

  if (sectionsResult.error) throw sectionsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (deliveryResult.error) throw deliveryResult.error;
  if (settingsResult.error) throw settingsResult.error;

  sections = sectionsResult.data || [];
  items = itemsResult.data || [];
  deliveryAreas = deliveryResult.data || [];
  settings = Object.fromEntries(
    (settingsResult.data || []).map(row => [row.setting_key, row.setting_value])
  );

  renderEverything();
}

function renderEverything() {
  $("sections-count").textContent = sections.length;
  $("items-count").textContent = items.length;
  $("delivery-count").textContent = deliveryAreas.length;

  document.querySelectorAll(".menu-view").forEach(view => {
    renderMenuPage(view.dataset.page);
  });

  renderDelivery();
  renderSettings();
  refreshSectionSelect();
}

function renderMenuPage(page) {
  const target = document.querySelector(`#${page}-view .menu-page-content`);
  const pageSections = sections
    .filter(section => section.page === page)
    .sort((a,b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  if (!pageSections.length) {
    target.innerHTML = `<div class="panel"><p class="empty">No sections yet.</p></div>`;
    return;
  }

  target.innerHTML = pageSections.map(section => {
    const sectionItems = items
      .filter(item => item.section_id === section.id)
      .sort((a,b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

    const rows = sectionItems.length
      ? sectionItems.map(item => `
          <tr>
            <td>
              <strong>${escapeHTML(item.name)}</strong>
              ${item.description ? `<div class="muted" style="margin:4px 0 0">${escapeHTML(item.description)}</div>` : ""}
              ${!item.active ? `<span class="status-pill hidden">Hidden</span>` : ""}
            </td>
            <td class="price">${escapeHTML(item.price || "—")}</td>
            <td class="price">${escapeHTML(item.price_small || "—")}</td>
            <td class="price">${escapeHTML(item.price_large || "—")}</td>
            <td class="actions">
              <div class="row-actions">
                <button class="mini-btn" data-item-action="edit" data-id="${item.id}">Edit</button>
                <button class="mini-btn" data-item-action="toggle" data-id="${item.id}">${item.active ? "Hide" : "Show"}</button>
                <button class="mini-btn danger" data-item-action="delete" data-id="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `).join("")
      : `<tr><td colspan="5" class="empty">No items in this section.</td></tr>`;

    return `
      <article class="section-card">
        <div class="section-head">
          <div>
            <h3>${escapeHTML(section.name)}</h3>
            ${section.subtitle ? `<p>${escapeHTML(section.subtitle)}</p>` : ""}
            ${!section.active ? `<span class="status-pill hidden">Hidden section</span>` : ""}
          </div>

          <div class="section-actions">
            <button class="mini-btn" data-section-action="add-item" data-id="${section.id}">+ Item</button>
            <button class="mini-btn" data-section-action="edit" data-id="${section.id}">Edit</button>
            <button class="mini-btn" data-section-action="toggle" data-id="${section.id}">${section.active ? "Hide" : "Show"}</button>
            <button class="mini-btn danger" data-section-action="delete" data-id="${section.id}">Delete</button>
          </div>
        </div>

        <table class="menu-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="price">Price</th>
              <th class="price">Small</th>
              <th class="price">Large</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </article>
    `;
  }).join("");
}

function renderDelivery() {
  const target = $("delivery-list");

  if (!deliveryAreas.length) {
    target.innerHTML = `<p class="empty">No delivery areas yet.</p>`;
    return;
  }

  target.innerHTML = deliveryAreas
    .sort((a,b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map(area => `
      <div class="simple-row">
        <div>
          <strong>${escapeHTML(area.name)}</strong>
          ${!area.active ? `<span class="status-pill hidden">Hidden</span>` : ""}
        </div>
        <div class="row-actions">
          <button class="mini-btn" data-delivery-action="edit" data-id="${area.id}">Edit</button>
          <button class="mini-btn" data-delivery-action="toggle" data-id="${area.id}">${area.active ? "Hide" : "Show"}</button>
          <button class="mini-btn danger" data-delivery-action="delete" data-id="${area.id}">Delete</button>
        </div>
      </div>
    `).join("");
}

function renderSettings() {
  $("setting-email").value = settings.email || "";
  $("setting-phone").value = settings.phone || "";
  $("setting-opening-hours").value = settings.opening_hours || "";
  $("setting-carwash-hours").value = settings.carwash_hours || "";
  $("setting-address").value = settings.address || "";
  $("setting-delivery-fee").value = settings.delivery_fee || "";
  $("setting-free-delivery").value = settings.free_delivery_threshold || "";
}

function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  $(`${name}-view`).classList.add("active");
  document.querySelector(`.nav-btn[data-view="${name}"]`)?.classList.add("active");
}

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

function openModal(id) {
  $(id).classList.add("active");
}

function closeModal(modal) {
  modal.classList.remove("active");
}

document.querySelectorAll(".modal-overlay").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
  });

  modal.querySelector(".modal-close").addEventListener("click", () => closeModal(modal));
});

function refreshSectionSelect(selectedId = "") {
  const select = $("item-section");

  select.innerHTML = sections
    .sort((a,b) => a.page.localeCompare(b.page) || a.sort_order - b.sort_order)
    .map(section => `
      <option value="${section.id}" ${section.id === selectedId ? "selected" : ""}>
        ${escapeHTML(section.page.toUpperCase())} — ${escapeHTML(section.name)}
      </option>
    `).join("");
}

function openSectionForm(page, section = null) {
  $("section-form").reset();
  $("section-id").value = section?.id || "";
  $("section-page").value = page || section?.page || "food";
  $("section-name").value = section?.name || "";
  $("section-subtitle").value = section?.subtitle || "";
  $("section-sort-order").value = section?.sort_order ?? 0;
  $("section-active").checked = section ? !!section.active : true;
  $("section-modal-title").textContent = section ? "Edit Section" : "Add Section";
  $("section-message").textContent = "";
  openModal("section-modal");
}

function openItemForm(sectionId = "", item = null) {
  $("item-form").reset();
  $("item-id").value = item?.id || "";

  refreshSectionSelect(item?.section_id || sectionId);

  $("item-name").value = item?.name || "";
  $("item-description").value = item?.description || "";
  $("item-price").value = item?.price || "";
  $("item-price-small").value = item?.price_small || "";
  $("item-price-large").value = item?.price_large || "";
  $("item-sort-order").value = item?.sort_order ?? 0;
  $("item-active").checked = item ? !!item.active : true;
  $("item-modal-title").textContent = item ? "Edit Item" : "Add Item";
  $("item-message").textContent = "";
  openModal("item-modal");
}

function openDeliveryForm(area = null) {
  $("delivery-form").reset();
  $("delivery-id").value = area?.id || "";
  $("delivery-name").value = area?.name || "";
  $("delivery-sort-order").value = area?.sort_order ?? 0;
  $("delivery-active").checked = area ? !!area.active : true;
  $("delivery-modal-title").textContent = area ? "Edit Area" : "Add Area";
  $("delivery-message").textContent = "";
  openModal("delivery-modal");
}

document.querySelectorAll(".add-section-btn").forEach(button => {
  button.addEventListener("click", () => openSectionForm(button.dataset.page));
});

document.querySelectorAll(".add-item-btn").forEach(button => {
  button.addEventListener("click", () => {
    const firstSection = sections.find(section => section.page === button.dataset.page);
    if (!firstSection) {
      alert("Create a section first.");
      return;
    }
    openItemForm(firstSection.id);
  });
});

$("quick-add-section").addEventListener("click", () => openSectionForm("food"));

$("quick-add-item").addEventListener("click", () => {
  if (!sections.length) {
    alert("Create a section first.");
    return;
  }
  openItemForm(sections[0].id);
});

$("add-delivery-area").addEventListener("click", () => openDeliveryForm());

$("section-form").addEventListener("submit", async event => {
  event.preventDefault();

  const id = $("section-id").value;
  const payload = {
    page: $("section-page").value,
    name: $("section-name").value.trim(),
    subtitle: $("section-subtitle").value.trim() || null,
    sort_order: Number($("section-sort-order").value || 0),
    active: $("section-active").checked,
    updated_at: new Date().toISOString()
  };

  const result = id
    ? await db.from("menu_sections").update(payload).eq("id", id)
    : await db.from("menu_sections").insert([payload]);

  if (result.error) {
    $("section-message").textContent = result.error.message;
    return;
  }

  closeModal($("section-modal"));
  await loadAll();
});

$("item-form").addEventListener("submit", async event => {
  event.preventDefault();

  const id = $("item-id").value;
  const payload = {
    section_id: $("item-section").value,
    name: $("item-name").value.trim(),
    description: $("item-description").value.trim() || null,
    price: $("item-price").value.trim() || null,
    price_small: $("item-price-small").value.trim() || null,
    price_large: $("item-price-large").value.trim() || null,
    sort_order: Number($("item-sort-order").value || 0),
    active: $("item-active").checked,
    updated_at: new Date().toISOString()
  };

  const result = id
    ? await db.from("menu_items").update(payload).eq("id", id)
    : await db.from("menu_items").insert([payload]);

  if (result.error) {
    $("item-message").textContent = result.error.message;
    return;
  }

  closeModal($("item-modal"));
  await loadAll();
});

$("delivery-form").addEventListener("submit", async event => {
  event.preventDefault();

  const id = $("delivery-id").value;
  const payload = {
    name: $("delivery-name").value.trim(),
    sort_order: Number($("delivery-sort-order").value || 0),
    active: $("delivery-active").checked
  };

  const result = id
    ? await db.from("delivery_areas").update(payload).eq("id", id)
    : await db.from("delivery_areas").insert([payload]);

  if (result.error) {
    $("delivery-message").textContent = result.error.message;
    return;
  }

  closeModal($("delivery-modal"));
  await loadAll();
});

document.addEventListener("click", async event => {
  const sectionButton = event.target.closest("[data-section-action]");
  if (sectionButton) {
    const section = sections.find(row => row.id === sectionButton.dataset.id);
    if (!section) return;

    const action = sectionButton.dataset.sectionAction;

    if (action === "edit") return openSectionForm(section.page, section);
    if (action === "add-item") return openItemForm(section.id);

    if (action === "toggle") {
      await db.from("menu_sections").update({
        active: !section.active,
        updated_at: new Date().toISOString()
      }).eq("id", section.id);
      return loadAll();
    }

    if (action === "delete") {
      if (!confirm(`Delete section "${section.name}" and all items inside it?`)) return;
      const { error } = await db.from("menu_sections").delete().eq("id", section.id);
      if (error) return alert(error.message);
      return loadAll();
    }
  }

  const itemButton = event.target.closest("[data-item-action]");
  if (itemButton) {
    const item = items.find(row => row.id === itemButton.dataset.id);
    if (!item) return;

    const action = itemButton.dataset.itemAction;

    if (action === "edit") return openItemForm(item.section_id, item);

    if (action === "toggle") {
      await db.from("menu_items").update({
        active: !item.active,
        updated_at: new Date().toISOString()
      }).eq("id", item.id);
      return loadAll();
    }

    if (action === "delete") {
      if (!confirm(`Delete "${item.name}"?`)) return;
      const { error } = await db.from("menu_items").delete().eq("id", item.id);
      if (error) return alert(error.message);
      return loadAll();
    }
  }

  const deliveryButton = event.target.closest("[data-delivery-action]");
  if (deliveryButton) {
    const area = deliveryAreas.find(row => row.id === deliveryButton.dataset.id);
    if (!area) return;

    const action = deliveryButton.dataset.deliveryAction;

    if (action === "edit") return openDeliveryForm(area);

    if (action === "toggle") {
      await db.from("delivery_areas").update({ active: !area.active }).eq("id", area.id);
      return loadAll();
    }

    if (action === "delete") {
      if (!confirm(`Delete delivery area "${area.name}"?`)) return;
      const { error } = await db.from("delivery_areas").delete().eq("id", area.id);
      if (error) return alert(error.message);
      return loadAll();
    }
  }
});

$("settings-form").addEventListener("submit", async event => {
  event.preventDefault();

  const rows = [
    ["email", $("setting-email").value.trim()],
    ["phone", $("setting-phone").value.trim()],
    ["opening_hours", $("setting-opening-hours").value.trim()],
    ["carwash_hours", $("setting-carwash-hours").value.trim()],
    ["address", $("setting-address").value.trim()],
    ["delivery_fee", $("setting-delivery-fee").value.trim()],
    ["free_delivery_threshold", $("setting-free-delivery").value.trim()]
  ].map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value,
    updated_at: new Date().toISOString()
  }));

  const { error } = await db
    .from("site_settings")
    .upsert(rows, { onConflict: "setting_key" });

  $("settings-message").textContent = error ? error.message : "Settings saved.";

  if (!error) await loadAll();
});

$("logout-button").addEventListener("click", async () => {
  await db.auth.signOut();
  location.href = "../";
});

(async function start() {
  if (!(await requireAdmin())) return;

  try {
    await loadAll();
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not load the CMS.");
  }
})();
