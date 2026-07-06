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
  view: "overview",
  query: ""
};

const content = document.querySelector("#appContent");
const statusLabel = document.querySelector("#dataStatus");
const searchInput = document.querySelector("#searchInput");
const navButtons = [...document.querySelectorAll(".nav-button")];

function text(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object") return Object.values(value).join(" / ");
  return String(value);
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
      const cells = headers.map((header) => `<td>${text(header.value(row))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderOverview() {
  const vehicle = state.data.vehicle.vehicle;
  const dimensions = state.data.vehicle.dimensions;
  const upcoming = state.data.maintenance.upcoming_tasks || [];
  const records = state.data.maintenance.records || [];

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
  const records = state.data.maintenance.records || [];

  content.innerHTML = `
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
          { label: "備註", value: (row) => row.notes }
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
  renderers[state.view]();
}

async function loadData() {
  try {
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

loadData();
