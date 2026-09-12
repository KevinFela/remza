// =========================================================
// EATERY AT FLAMINGO — PUBLIC DYNAMIC MENU
// Supabase powers Food, Drinks, Hubbly, Carwash and Delivery.
// =========================================================

const SUPABASE_URL = "https://drpoikzfnmmofhnkbeer.supabase.co";
const SUPABASE_KEY = "sb_publishable_kphccPmumtpk2CKf6zXiLw_tsJR3epR";

const eateryDB = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const currentPage = document.body.dataset.menuPage || "";

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanPhoneForTel(value) {
  return String(value || "").replace(/[^+0-9]/g, "");
}

async function loadSiteSettings() {
  const { data, error } = await eateryDB
    .from("site_settings")
    .select("setting_key, setting_value");

  if (error) {
    console.error("Could not load site settings:", error);
    return {};
  }

  const settings = Object.fromEntries(
    (data || []).map(row => [
      row.setting_key,
      row.setting_value
    ])
  );

  document
    .querySelectorAll("[data-setting]")
    .forEach(element => {
      const key = element.dataset.setting;

      if (
        settings[key] !== undefined &&
        settings[key] !== null &&
        settings[key] !== ""
      ) {
        element.textContent = settings[key];
      }
    });

  const emailLink = document.getElementById("footer-email");

  if (emailLink && settings.email) {
    emailLink.textContent = settings.email;
    emailLink.href = `mailto:${settings.email}`;
  }

  const phoneLink = document.getElementById("footer-phone");

  if (phoneLink && settings.phone) {
    phoneLink.textContent = settings.phone;
    phoneLink.href = `tel:${cleanPhoneForTel(settings.phone)}`;
  }

  const footerHours = document.getElementById("footer-hours");

  if (footerHours && settings.opening_hours) {
    footerHours.textContent = settings.opening_hours;
  }

  const footerAddress = document.getElementById("footer-address");

  if (footerAddress && settings.address) {
    footerAddress.textContent = settings.address;
  }

  const deliveryPhone = document.getElementById("delivery-phone");

  if (deliveryPhone && settings.phone) {
    deliveryPhone.textContent = settings.phone;
    deliveryPhone.href = `tel:${cleanPhoneForTel(settings.phone)}`;
  }

  return settings;
}

function renderMenuSection(section, items) {
  const hasSizePrices = items.some(
    item => item.price_small || item.price_large
  );

  const subtitle = section.subtitle
    ? `<p class="disclaimer">${escapeHTML(section.subtitle)}</p>`
    : "";

  const rows = items.length
    ? items.map(item => {
        const description = item.description
          ? `<span class="menu-item-description">${escapeHTML(item.description)}</span>`
          : "";

        if (hasSizePrices) {
          return `
            <tr>
              <td>
                ${escapeHTML(item.name)}
                ${description}
              </td>

              <td class="price-col">
                ${escapeHTML(item.price_small || "—")}
              </td>

              <td class="price-col">
                ${escapeHTML(item.price_large || "—")}
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td>
              ${escapeHTML(item.name)}
              ${description}
            </td>

            <td class="price-col">
              ${escapeHTML(item.price || "—")}
            </td>
          </tr>
        `;
      }).join("")
    : "";

  const headers = hasSizePrices
    ? `
      <tr>
        <th>Item</th>
        <th class="price-col">Small</th>
        <th class="price-col">Large</th>
      </tr>
    `
    : `
      <tr>
        <th>Item</th>
        <th class="price-col">Price</th>
      </tr>
    `;

  return `
    <div class="menu-section">
      <h2>${escapeHTML(section.name)}</h2>
      ${subtitle}

      <table>
        ${headers}
        ${rows}
      </table>
    </div>
  `;
}

async function loadMenu(page) {
  const container = document.getElementById("dynamic-menu");

  if (!container) return;

  try {
    const { data: sections, error: sectionError } =
      await eateryDB
        .from("menu_sections")
        .select("id, page, name, subtitle, sort_order")
        .eq("page", page)
        .eq("active", true)
        .order("sort_order", { ascending: true });

    if (sectionError) throw sectionError;

    if (!sections || !sections.length) {
      container.innerHTML =
        `<div class="menu-empty">No menu items available right now.</div>`;
      return;
    }

    const sectionIds = sections.map(section => section.id);

    const { data: items, error: itemError } =
      await eateryDB
        .from("menu_items")
        .select(`
          id,
          section_id,
          name,
          description,
          price,
          price_small,
          price_large,
          sort_order
        `)
        .in("section_id", sectionIds)
        .eq("active", true)
        .order("sort_order", { ascending: true });

    if (itemError) throw itemError;

    const groupedItems = new Map();

    (items || []).forEach(item => {
      if (!groupedItems.has(item.section_id)) {
        groupedItems.set(item.section_id, []);
      }

      groupedItems.get(item.section_id).push(item);
    });

    container.innerHTML = sections
      .map(section => {
        const sectionItems =
          groupedItems.get(section.id) || [];

        return renderMenuSection(
          section,
          sectionItems
        );
      })
      .join("");
  } catch (error) {
    console.error("Could not load menu:", error);

    container.innerHTML = `
      <div class="menu-error">
        Menu could not be loaded right now.
      </div>
    `;
  }
}

async function loadDeliveryAreas() {
  const container =
    document.getElementById("delivery-areas");

  if (!container) return;

  try {
    const { data, error } = await eateryDB
      .from("delivery_areas")
      .select("id, name, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!data || !data.length) {
      container.innerHTML =
        `<div class="menu-empty">No delivery areas listed.</div>`;
      return;
    }

    container.innerHTML = data
      .map(area => `
        <div class="item">
          • ${escapeHTML(area.name)}
        </div>
      `)
      .join("");
  } catch (error) {
    console.error(
      "Could not load delivery areas:",
      error
    );

    container.innerHTML = `
      <div class="menu-error">
        Delivery areas could not be loaded.
      </div>
    `;
  }
}

async function startEateryWebsite() {
  await loadSiteSettings();

  if (
    currentPage === "food" ||
    currentPage === "drinks" ||
    currentPage === "hubbly" ||
    currentPage === "carwash"
  ) {
    await loadMenu(currentPage);
  }

  if (currentPage === "delivery") {
    await loadDeliveryAreas();
  }
}

startEateryWebsite();
