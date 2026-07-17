const dataFiles = {
  vehicle: "../data/vehicle.json",
  maintenance: "../data/maintenance.json",
  fluids: "../data/fluids.json",
  torque: "../data/torque.json",
  troubleshooting: "../data/troubleshooting.json",
  obd: "../data/obd_codes.json",
  manual: "../data/manual_index.json"
};

const state = {
  data: {},
  view: null,
  query: "",
  aiQuestion: "",
  aiPrompt: "",
  aiSources: [],
  localMaintenanceRecords: [],
  selected: {}
};

const content = document.querySelector("#appContent");
const statusLabel = document.querySelector("#dataStatus");
const searchInput = document.querySelector("#searchInput");
const navButtons = [...document.querySelectorAll(".nav-button")];
const maintenanceStorageKey = "jimny-db-maintenance-records";
const aiIntents = [
  {
    id: "starting",
    label: "啟動 / 發不動",
    triggers: ["啟動", "發不動", "冷車", "沒電", "starter", "start"],
    terms: ["battery", "jump-start", "starter", "engine switch", "starting", "ignition"]
  },
  {
    id: "overheat",
    label: "水溫 / 過熱",
    triggers: ["水溫", "過熱", "冷卻", "水箱", "coolant", "overheat"],
    terms: ["coolant", "radiator", "overheat", "temperature gauge", "cooling system", "engine overheating"]
  },
  {
    id: "brake",
    label: "煞車",
    triggers: ["煞車", "剎車", "brake", "異音", "踏板"],
    terms: ["brake", "brake fluid", "brake pedal", "parking brake", "braking"]
  },
  {
    id: "fuse",
    label: "保險絲 / 電系",
    triggers: ["保險絲", "電系", "沒電", "燈不亮", "fuse"],
    terms: ["fuse", "fuses", "fuse box", "electrical", "battery"]
  },
  {
    id: "fluid",
    label: "油品 / 液體",
    triggers: ["油", "油品", "機油", "變速箱油", "差速器", "fluid", "oil"],
    terms: ["engine oil", "oil filter", "gear oil", "fluid", "differential oil", "transmission oil"]
  },
  {
    id: "torque",
    label: "扭力 / 鎖付",
    triggers: ["扭力", "鎖", "螺絲", "torque", "tightening"],
    terms: ["torque", "tightening", "nut", "bolt"]
  },
  {
    id: "obd",
    label: "診斷 / 警示燈",
    triggers: ["OBD", "故障碼", "警示燈", "故障燈", "check engine", "diagnostic"],
    terms: ["diagnostic", "warning light", "malfunction indicator", "DTC", "check engine"]
  },
  {
    id: "tire",
    label: "輪胎 / 胎壓",
    triggers: ["輪胎", "胎壓", "抖動", "tire", "tyre"],
    terms: ["tire", "tyre", "tire pressure", "wheel", "vibration"]
  }
];

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

function expandedQueryTerms(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  const aliases = state.data.manual?.aliases || {};
  const terms = [normalizedQuery];

  Object.entries(aliases).forEach(([zh, englishTerms]) => {
    if (zh.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(zh.toLowerCase())) {
      terms.push(...englishTerms.map((term) => term.toLowerCase()));
    }
  });

  return [...new Set(terms)];
}

function detectAiIntents(question) {
  const normalizedQuestion = question.toLowerCase();
  return aiIntents.filter((intent) =>
    intent.triggers.some((trigger) => normalizedQuestion.includes(trigger.toLowerCase()))
  );
}

function aiSearchTerms(question) {
  const detected = detectAiIntents(question);
  const terms = expandedQueryTerms(question);
  detected.forEach((intent) => terms.push(...intent.terms.map((term) => term.toLowerCase())));
  return [...new Set(terms)].filter((term) => term.length >= 2);
}

function matchesManualPage(page) {
  const terms = expandedQueryTerms(state.query);
  if (!terms.length) return true;
  const haystack = `${page.title} ${page.text} ${(page.zh_keywords || []).join(" ")}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function scoreManualPage(page, question) {
  const terms = aiSearchTerms(question);
  if (!terms.length) return 0;
  const title = String(page.title || "").toLowerCase();
  const textBody = String(page.text || "").toLowerCase();
  const keywords = (page.zh_keywords || []).join(" ").toLowerCase();

  return terms.reduce((score, term) => {
    let nextScore = score;
    if (title.includes(term)) nextScore += 12;
    if (keywords.includes(term)) nextScore += 8;
    if (textBody.includes(term)) nextScore += 2;
    if (textBody.includes(`warning ${term}`) || textBody.includes(`${term} warning`)) nextScore += 3;
    if (textBody.includes(`notice ${term}`) || textBody.includes(`${term} notice`)) nextScore += 2;
    return nextScore;
  }, 0);
}

function extractRelevantSnippet(textBody, terms, maxLength = 620) {
  const textValue = String(textBody || "");
  const lowerText = textValue.toLowerCase();
  const hitPositions = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b);

  if (!hitPositions.length) return textValue.slice(0, maxLength);

  const center = hitPositions[0];
  const start = Math.max(0, center - Math.floor(maxLength * 0.35));
  const end = Math.min(textValue.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < textValue.length ? "..." : "";
  return `${prefix}${textValue.slice(start, end)}${suffix}`;
}

function findManualSources(question, limit = 4) {
  const terms = aiSearchTerms(question);
  return (state.data.manual.pages || [])
    .map((page) => ({ ...page, score: scoreManualPage(page, question) }))
    .filter((page) => page.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((page) => ({ ...page, snippet: extractRelevantSnippet(page.text, terms) }));
}

function buildAiPrompt(question, sources) {
  const vehicle = state.data.vehicle.vehicle;
  const detectedIntents = detectAiIntents(question);
  const recentRecords = allMaintenanceRecords()
    .slice(0, 3)
    .map((record) => `- ${record.date}, ${record.odometer_km} km, ${record.items.map((item) => item.name).join("、")}, ${record.notes || "無備註"}`)
    .join("\n");
  const sourceText = sources
    .map(
      (page) => `【手冊第 ${page.page} 頁：${page.title}】\n${page.snippet || page.text.slice(0, 620)}`
    )
    .join("\n\n");

  return `你是 Suzuki Jimny 維修與保養助理。請使用繁體中文回答。

車輛設定：
- 車型：${vehicle.make} ${vehicle.model} ${vehicle.generation}
- 車身：Jimny 5門
- 變速箱：手排
- 引擎：${vehicle.engine.code}，${vehicle.engine.displacement_cc} cc
- 驅動：${vehicle.drive_type}

使用者問題：
${question}

系統判斷的問題類型：
${detectedIntents.length ? detectedIntents.map((intent) => `- ${intent.label}`).join("\n") : "- 未明確分類，請先詢問補充症狀"}

最近保養紀錄：
${recentRecords || "- 無"}

以下是系統從車主手冊擷取的相關片段。請只把它們當作主要依據，不要把無關段落硬套到答案：
${sourceText || "未找到相關手冊摘錄。"}

回答規則：
- 先直接回答使用者最可能需要做的第一步。
- 不要逐字翻譯手冊；請整理成診斷流程。
- 如果手冊片段不足以支持結論，請明確說「手冊摘錄不足」。
- 不要編造手冊沒有提到的規格值。
- 涉及煞車、轉向、過熱、燃油、電系短路時，優先提醒安全停車與找技師。

請用以下格式回答：
1. 最短結論
2. 先做哪 3 個檢查
3. 可能原因排序
4. 可自行確認項目
5. 需要技師處理項目
6. 相關手冊頁碼
7. 不足資訊 / 需要補問的問題`;
}

function renderAiSources(sources) {
  if (!sources.length) return `<div class="empty">尚未找到相關手冊頁面。可換個關鍵字，例如：煞車、冷卻、電瓶、保險絲、brake、battery。</div>`;
  const officialPdfUrl = state.data.manual.official_pdf_url;
  return `
    <div class="mobile-card-list always-show">
      ${sources
        .map(
          (page) => `
            <article class="data-card">
              <div class="data-field"><span>頁碼</span><strong>第 ${page.page} 頁</strong></div>
              <div class="data-field"><span>標題</span><strong>${escapeHtml(page.title)}</strong></div>
              <div class="data-field"><span>關鍵字</span><strong>${escapeHtml(page.zh_keywords || [])}</strong></div>
              <div class="data-field"><span>命中片段</span><strong>${escapeHtml(page.snippet || page.text.slice(0, 420))}</strong></div>
              <div class="data-field"><span>原廠 PDF</span><strong><a href="${officialPdfUrl}#page=${page.page}" target="_blank" rel="noopener">開啟 Suzuki 原廠 PDF</a></strong></div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
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

function detailsCard(headers, row) {
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
  return `<article class="data-card detail-card">${fields}</article>`;
}

function selectDetails({ title, selectKey, rows, label, headers, placeholder = "請選擇項目" }) {
  if (!rows.length) {
    return `
      <section class="select-section">
        <h2>${title}</h2>
        <div class="empty">沒有符合搜尋條件的資料。</div>
      </section>
    `;
  }

  const selectedId = state.selected[selectKey] || "";
  const selectedRow = rows.find((row, index) => String(index) === selectedId);
  const options = rows
    .map((row, index) => {
      const value = String(index);
      const selected = value === selectedId ? " selected" : "";
      return `<option value="${value}"${selected}>${escapeHtml(label(row))}</option>`;
    })
    .join("");

  return `
    <section class="select-section">
      <h2>${title}</h2>
      <label class="select-control">
        <span>${placeholder}</span>
        <select data-select-key="${selectKey}">
          <option value="">${placeholder}</option>
          ${options}
        </select>
      </label>
      ${selectedRow ? detailsCard(headers, selectedRow) : `<div class="empty">請先從下拉選單選擇一筆資料。</div>`}
    </section>
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
  const intervalRows = intervals.filter(matchesQuery);
  const recordRows = records.filter(matchesQuery);
  const intervalHeaders = [
    { label: "項目", value: (row) => row.item },
    { label: "公里", value: (row) => `${row.interval_km.toLocaleString()} km` },
    { label: "月份", value: (row) => `${row.interval_months} 個月` },
    { label: "嚴苛使用", value: (row) => row.severity_adjustment }
  ];
  const recordHeaders = [
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
  ];

  content.innerHTML = `
    ${maintenanceForm()}
    ${selectDetails({
      title: "保養週期",
      selectKey: "maintenanceIntervals",
      rows: intervalRows,
      label: (row) => `${row.item} / ${row.interval_km.toLocaleString()} km`,
      headers: intervalHeaders,
      placeholder: "選擇保養項目"
    })}
    ${selectDetails({
      title: "保養紀錄",
      selectKey: "maintenanceRecords",
      rows: recordRows,
      label: (row) => `${row.date} / ${row.odometer_km.toLocaleString()} km / ${row.items.map((item) => item.name).join("、")}`,
      headers: recordHeaders,
      placeholder: "選擇保養紀錄"
    })}
  `;
}

function renderFluids() {
  const fluids = (state.data.fluids.fluids || []).filter(matchesQuery);
  const headers = [
    { label: "系統", value: (row) => row.system },
    { label: "油品", value: (row) => row.fluid_name },
    { label: "規格", value: (row) => row.recommended_spec },
    { label: "黏度", value: (row) => row.viscosity },
    { label: "容量", value: (row) => row.capacity_liters },
    { label: "備註", value: (row) => row.notes }
  ];
  content.innerHTML = `
    ${selectDetails({
      title: "油品規格",
      selectKey: "fluids",
      rows: fluids,
      label: (row) => `${row.system} / ${row.fluid_name}`,
      headers,
      placeholder: "選擇油品"
    })}
  `;
}

function renderTorque() {
  const specs = (state.data.torque.torque_specs || []).filter(matchesQuery);
  const headers = [
    { label: "分類", value: (row) => row.category },
    { label: "零件", value: (row) => row.component },
    { label: "扭力", value: (row) => `${row.torque_nm} ${state.data.torque.unit}` },
    { label: "尺寸", value: (row) => row.fastener_size },
    { label: "備註", value: (row) => row.notes }
  ];
  content.innerHTML = `
    ${selectDetails({
      title: "鎖付扭力",
      selectKey: "torque",
      rows: specs,
      label: (row) => `${row.category} / ${row.component}`,
      headers,
      placeholder: "選擇零件"
    })}
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
  const codes = (state.data.obd.codes || []).filter(matchesQuery);
  const headers = [
    { label: "代碼", value: (row) => row.code },
    { label: "系統", value: (row) => row.system },
    { label: "說明", value: (row) => row.description },
    { label: "嚴重度", value: (row) => row.severity },
    { label: "症狀", value: (row) => row.symptoms },
    { label: "可能原因", value: (row) => row.possible_causes },
    { label: "診斷", value: (row) => row.diagnosis },
    { label: "建議修復", value: (row) => row.fixes }
  ];
  content.innerHTML = `
    ${selectDetails({
      title: "OBD 代碼",
      selectKey: "obd",
      rows: codes,
      label: (row) => `${row.code} / ${row.description}`,
      headers,
      placeholder: "選擇 OBD 代碼"
    })}
  `;
}

function renderManual() {
  const pages = (state.data.manual.pages || []).filter(matchesManualPage).slice(0, 80);
  const officialPdfUrl = state.data.manual.official_pdf_url || "https://www.suzukimanuals.com.au/assets/Owners-Manuals/Jimny-5dr-99011M80T01-01E-v2.pdf";
  const headers = [
    { label: "頁碼", value: (row) => `第 ${row.page} 頁` },
    { label: "標題", value: (row) => row.title },
    { label: "中文關鍵字", value: (row) => row.zh_keywords },
    { label: "手冊文字內容", value: (row) => row.text },
    {
      label: "原廠 PDF",
      html: true,
      value: (row) => `<a href="${officialPdfUrl}#page=${row.page}" target="_blank" rel="noopener">開啟 Suzuki 原廠 PDF</a>`
    }
  ];

  content.innerHTML = `
    <section class="select-section">
      <h2>維修手冊</h2>
      <div class="empty">可用中文或英文搜尋，例如：煞車、機油、扭力、保險絲、冷卻、battery、brake、P0300。搜尋使用本機索引，完整 PDF 會開啟 Suzuki 原廠公開連結。</div>
    </section>
    ${selectDetails({
      title: "搜尋結果",
      selectKey: "manual",
      rows: pages,
      label: (row) => `第 ${row.page} 頁 / ${row.title}`,
      headers,
      placeholder: pages.length ? "選擇手冊頁面" : "沒有搜尋結果"
    })}
  `;
}

function renderAi() {
  content.innerHTML = `
    <section>
      <h2>AI 問答準備</h2>
      <form class="record-form" id="aiQuestionForm">
        <div class="form-grid">
          <label class="wide">
            <span>你的問題</span>
            <textarea name="question" rows="4" placeholder="例如：冷車啟動無力要先檢查什麼？">${escapeHtml(state.aiQuestion)}</textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit">產生 AI Prompt</button>
          <button type="button" class="secondary" id="copyAiPrompt"${state.aiPrompt ? "" : " disabled"}>複製 Prompt</button>
        </div>
        <p class="form-note">這個版本不會直接呼叫 AI API，會先判斷問題類型，再從維修手冊抓相關片段，整理成可貼到 Gemini 或 ChatGPT 的 Prompt。</p>
      </form>
    </section>
    <section>
      <h2>相關手冊片段</h2>
      ${renderAiSources(state.aiSources)}
    </section>
    <section>
      <h2>可複製 Prompt</h2>
      ${
        state.aiPrompt
          ? `<textarea class="prompt-output" readonly rows="18">${escapeHtml(state.aiPrompt)}</textarea>`
          : `<div class="empty">輸入問題後，這裡會產生完整 Prompt。</div>`
      }
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
    obd: renderObd,
    manual: renderManual,
    ai: renderAi
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
  state.selected = {};
  render();
});

content.addEventListener("change", (event) => {
  const selectKey = event.target.dataset.selectKey;
  if (!selectKey) return;
  state.selected[selectKey] = event.target.value;
  render();
});

content.addEventListener("submit", (event) => {
  if (event.target.id === "aiQuestionForm") {
    event.preventDefault();
    const formData = new FormData(event.target);
    state.aiQuestion = String(formData.get("question") || "").trim();
    state.aiSources = findManualSources(state.aiQuestion);
    state.aiPrompt = buildAiPrompt(state.aiQuestion, state.aiSources);
    render();
    return;
  }

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

  if (event.target.id === "copyAiPrompt" && state.aiPrompt) {
    navigator.clipboard.writeText(state.aiPrompt);
    event.target.textContent = "已複製";
  }
});

loadData();
