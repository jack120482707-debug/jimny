const dataFiles = {
  vehicle: "../data/vehicle.json",
  maintenance: "../data/maintenance.json",
  fluids: "../data/fluids.json",
  torque: "../data/torque.json",
  troubleshooting: "../data/troubleshooting.json",
  obd: "../data/obd_codes.json"
};

const state = {
  data: {},
  view: null,
  query: "",
  localMaintenanceRecords: []
};

const content = document.querySelector("#appContent");
const statusLabel = document.querySelector("#dataStatus");
const searchInput = document.querySelector("#searchInput");
const navButtons = [...document.querySelectorAll(".nav-button")];
const maintenanceStorageKey = "jimny-db-maintenance-records";

function text(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object") return Object.values(value).join(" / ");
  return String(value);
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function matchesQuery(item) {
  if (!state.query) return true;
  return JSON.stringify(item).toLowerCase().includes(state.query.toLowerCase());
}

function card(title, body) {
  return `<article class="card"><h3>${title}</h3>${body}</article>`;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty">沒有符合搜尋條件的資料。</div>`;
  const head = headers.map((header) => `<th>${header.label}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = headers
        .map((header) => {
          const value = header.value(row);
          return `<td>${header.html ? value : escapeHtml(value)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const cards = rows
    .map((row) => {
      const fields = headers
        .map((header) => {
          const value = header.value(row);
          const renderedValue = header.html ? value : escapeHtml(value);
          return `
            <div class="data-field">
              <span>${header.label}</span>
              <strong>${renderedValue}</strong>
            </div>
          `;
        })
        .join("");
      return `<article class="data-card">${fields}</article>`;
    })
    .join("");

  return `
    <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="mobile-card-list">${cards}</div>
  `;
}

function loadLocalMaintenanceRecords() {
  const stored = localStorage.getItem(maintenanceStorageKey);
  state.localMaintenanceRecords = stored ? JSON.parse(stored) : [];
}

function saveLocalMaintenanceRecords() {
  localStorage.setItem(maintenanceStorageKey, JSON.stringify(state.localMaintenanceRecords));
}

function allMaintenanceRecords() {
  const sourceRecords = state.data.maintenance.records || [];
  return [...state.localMaintenanceRecords, ...sourceRecords].sort((a, b) => {
    const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCompare !== 0) return dateCompare;
    return Number(b.odometer_km || 0) - Number(a.odometer_km || 0);
  });
}

function maintenanceForm() {
  const today = new Date().toISOString().slice(0, 10);
  return `
    <section>
      <h2>新增保養紀錄</h2>
      <form class="record-form" id="maintenanceForm">
        <div class="form-grid">
          <label>
            <span>日期</span>
            <input name="date" type="date" value="${today}" required>
          </label>
          <label>
            <span>里程 km</span>
            <input name="odometer_km" type="number" inputmode="numeric" min="0" step="1" placeholder="例如 20000" required>
          </label>
          <label>
            <span>類型</span>
            <select name="type">
              <option value="Regular maintenance">定期保養</option>
              <option value="Repair">維修</option>
              <option value="Inspection">檢查</option>
              <option value="Modification">改裝</option>
            </select>
          </label>
          <label>
            <span>店家</span>
            <input name="shop" type="text" placeholder="例如 Suzuki 原廠">
          </label>
          <label class="wide">
            <span>項目</span>
            <input name="item_name" type="text" placeholder="例如 更換引擎機油與機油芯" required>
          </label>
          <label>
            <span>費用 TWD</span>
            <input name="cost_twd" type="number" inputmode="numeric" min="0" step="1" placeholder="例如 2150">
          </label>
          <label class="wide">
            <span>備註</span>
            <textarea name="notes" rows="3" placeholder="例如 空氣芯清潔後續用"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit">儲存紀錄</button>
          <button type="button" class="secondary" id="exportMaintenance">匯出手機紀錄</button>
        </div>
        <p class="form-note">手機新增的紀錄會存在這台手機的瀏覽器，不會自動寫回 GitHub。</p>
      </form>
    </section>
  `;
}

function renderOverview() {
  const vehicle = state.data.vehicle.vehicle;
  const dimensions = state.data.vehicle.dimensions;
  const upcoming = state.data.maintenance.upcoming_tasks || [];
  const records = allMaintenanceRecords();

  content.innerHTML = `
    <section>
      <h2>車輛總覽</h2>
      <div class="grid">
        ${card("車型", `<div class="metric"><span>${vehicle.make}</span><strong>${vehicle.model} ${vehicle.generation}</strong></div>`)}
        ${card("引擎", `<div class="metric"><span>${vehicle.engine.code}</span><strong>${vehicle.engine.displacement_cc} cc</strong></div>`)}
        ${card("傳動", `<div class="metric"><span>${vehicle.drive_type}</span><strong>${vehicle.transmission}</strong></div>`)}
        ${card("尺寸", `<p>${dimensions.length_mm} x ${dimensions.width_mm} x ${dimensions.height_mm} mm</p><p class="label">離地高 ${dimensions.ground_clearance_mm} mm</p>`)}
      </div>
    </section>
    <section>
      <h2>近期保養</h2>
      ${table(
        [
          { label: "到期里程", value: (row) => `${row.due_odometer_km.toLocaleString()} km` },
          { label: "日期", value: (row) => row.due_date },
          { label: "項目", value: (row) => row.item },
          { label: "優先度", value: (row) => row.priority }
        ],
        upcoming.filter(matchesQuery)
      )}
    </section>
    <section>
      <h2>最近紀錄</h2>
      ${table(
        [
          { label: "日期", value: (row) => row.date },
          { label: "里程", value: (row) => `${row.odometer_km.toLocaleString()} km` },
          { label: "類型", value: (row) => row.type },
          { label: "備註", value: (row) => row.notes }
        ],
        records.filter(matchesQuery)
      )}
    </section>
  `;
}

function renderMaintenance() {
  const intervals = state.data.maintenance.service_intervals || [];
  const records = allMaintenanceRecords();

  content.innerHTML = `
    ${maintenanceForm()}
    <section>
      <h2>保養週期</h2>
      ${table(
        [
          { label: "項目", value: (row) => row.item },
          { label: "公里", value: (row) => `${row.interval_km.toLocaleString()} km` },
          { label: "月份", value: (row) => `${row.interval_months} 個月` },
          { label: "嚴苛使用", value: (row) => row.severity_adjustment }
        ],
        intervals.filter(matchesQuery)
      )}
    </section>
    <section>
      <h2>保養紀錄</h2>
      ${table(
        [
          { label: "日期", value: (row) => row.date },
          { label: "里程", value: (row) => `${row.odometer_km.toLocaleString()} km` },
          { label: "店家", value: (row) => row.shop },
          { label: "項目", value: (row) => row.items.map((item) => item.name).join("、") },
          { label: "備註", value: (row) => row.notes },
          {
            label: "動作",
            html: true,
            value: (row) =>
              row.local_id
                ? `<button class="link-button" data-delete-maintenance="${escapeHtml(row.local_id)}">刪除</button>`
                : "-"
          }
        ],
        records.filter(matchesQuery)
      )}
    </section>
  `;
}

function renderFluids() {
  const fluids = state.data.fluids.fluids || [];
  content.innerHTML = `
    <section>
      <h2>油品規格</h2>
      ${table(
        [
          { label: "系統", value: (row) => row.system },
          { label: "油品", value: (row) => row.fluid_name },
          { label: "規格", value: (row) => row.recommended_spec },
          { label: "黏度", value: (row) => row.viscosity },
          { label: "容量", value: (row) => row.capacity_liters },
          { label: "備註", value: (row) => row.notes }
        ],
        fluids.filter(matchesQuery)
      )}
    </section>
  `;
}

function renderTorque() {
  const specs = state.data.torque.torque_specs || [];
  content.innerHTML = `
    <section>
      <h2>鎖付扭力</h2>
      ${table(
        [
          { label: "分類", value: (row) => row.category },
          { label: "零件", value: (row) => row.component },
          { label: "扭力", value: (row) => `${row.torque_nm} ${state.data.torque.unit}` },
          { label: "尺寸", value: (row) => row.fastener_size },
          { label: "備註", value: (row) => row.notes }
        ],
        specs.filter(matchesQuery)
      )}
    </section>
  `;
}

function renderTroubleshooting() {
  const cases = state.data.troubleshooting.cases || [];
  const filtered = cases.filter(matchesQuery);
  content.innerHTML = `
    <section>
      <h2>故障排除</h2>
      <div class="grid">
        ${
          filtered.length
            ? filtered
                .map((item) =>
                  card(
                    item.symptom,
                    `<p class="severity-${item.severity}">${item.severity}</p>
                    <p><span class="label">可能原因</span><br>${item.possible_causes.join("、")}</p>
                    <p><span class="label">建議處理</span><br>${item.recommended_actions.join("、")}</p>
                    <div class="pill-row">${item.related_obd_codes.map((code) => `<span class="pill">${code}</span>`).join("")}</div>`
                  )
                )
                .join("")
            : `<div class="empty">沒有符合搜尋條件的資料。</div>`
        }
      </div>
    </section>
  `;
}

function renderObd() {
  const codes = state.data.obd.codes || [];
  content.innerHTML = `
    <section>
      <h2>OBD 代碼</h2>
      ${table(
        [
          { label: "代碼", value: (row) => row.code },
          { label: "系統", value: (row) => row.system },
          { label: "說明", value: (row) => row.description },
          { label: "嚴重度", value: (row) => row.severity },
          { label: "可能原因", value: (row) => row.possible_causes },
          { label: "建議修復", value: (row) => row.fixes }
        ],
        codes.filter(matchesQuery)
      )}
    </section>
  `;
}

function render() {
  const renderers = {
    overview: renderOverview,
    maintenance: renderMaintenance,
    fluids: renderFluids,
    torque: renderTorque,
    troubleshooting: renderTroubleshooting,
    obd: renderObd
  };

  if (!state.view) {
    content.innerHTML = "";
    return;
  }

  renderers[state.view]();
}

async function loadData() {
  try {
    loadLocalMaintenanceRecords();
    const entries = await Promise.all(
      Object.entries(dataFiles).map(async ([key, path]) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`無法載入 ${path}`);
        return [key, await response.json()];
      })
    );
    state.data = Object.fromEntries(entries);
    statusLabel.textContent = "資料已載入";
    render();
  } catch (error) {
    statusLabel.textContent = "載入失敗";
    content.innerHTML = `<div class="empty">${error.message}。請用本機伺服器開啟 app，不要直接雙擊 HTML。</div>`;
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    navButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  render();
});

content.addEventListener("submit", (event) => {
  if (event.target.id !== "maintenanceForm") return;
  event.preventDefault();

  const formData = new FormData(event.target);
  const cost = Number(formData.get("cost_twd") || 0);
  const record = {
    local_id: crypto.randomUUID(),
    date: formData.get("date"),
    odometer_km: Number(formData.get("odometer_km")),
    type: formData.get("type"),
    shop: formData.get("shop") || "未填寫",
    items: [
      {
        name: formData.get("item_name"),
        status: "completed",
        parts: [],
        cost_twd: cost
      }
    ],
    notes: formData.get("notes") || "",
    source: "phone-local"
  };

  state.localMaintenanceRecords.unshift(record);
  saveLocalMaintenanceRecords();
  event.target.reset();
  render();
});

content.addEventListener("click", (event) => {
  const deleteId = event.target.dataset.deleteMaintenance;
  if (deleteId) {
    state.localMaintenanceRecords = state.localMaintenanceRecords.filter((record) => record.local_id !== deleteId);
    saveLocalMaintenanceRecords();
    render();
    return;
  }

  if (event.target.id === "exportMaintenance") {
    const blob = new Blob([JSON.stringify(state.localMaintenanceRecords, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jimny-maintenance-phone-records.json";
    link.click();
    URL.revokeObjectURL(url);
  }
});

loadData();
