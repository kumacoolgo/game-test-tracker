/**
 * Game Test Tracker - Frontend
 * 极简测试记录工具
 */

const API = "/api";

// ─── State ─────────────────────────────────────────────────────────────────

let tasks = [];
let selectedId = null;

// ─── DOM refs ───────────────────────────────────────────────────────────────

const gridBody = document.getElementById("grid-body");
const statusMessage = document.getElementById("status-message");

const btnNew = document.getElementById("btn-new");
const btnEdit = document.getElementById("btn-edit");
const btnDelete = document.getElementById("btn-delete");
const btnUp = document.getElementById("btn-up");
const btnDown = document.getElementById("btn-down");
const btnExport = document.getElementById("btn-export");
const btnImport = document.getElementById("btn-import");
const btnMNew = document.getElementById("m-new");
const btnMEdit = document.getElementById("m-edit");
const btnMDelete = document.getElementById("m-delete");

const editModal = document.getElementById("edit-modal");
const taskForm = document.getElementById("task-form");
const modalTitle = document.getElementById("modal-title");

// ─── API helpers ────────────────────────────────────────────────────────────

async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    if (res.status === 401) {
        showStatus("需要认证 — 刷新页面并输入凭证", true);
        throw new Error("Unauthorized");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

async function loadTasks() {
    try {
        tasks = await api("GET", "/tasks");
        selectedId = null;
        updateReorderButtons();
        updateBottomBar();
        renderGrid();
    } catch (e) {
        showStatus("加载失败: " + e.message, true);
    }
}

// ─── Render ─────────────────────────────────────────────────────────────────

const isMobile = () => {
    return (
        /Mobi|Android|iPhone/i.test(navigator.userAgent) ||
        window.matchMedia("(pointer: coarse)").matches
    );
};

function renderGrid() {
    gridBody.innerHTML = "";

    if (tasks.length === 0) {
        gridBody.innerHTML = isMobile()
            ? '<div class="card-empty">暂无记录 — 点击「新建」添加</div>'
            : '<div class="grid-row empty">暂无记录 — 点击「新建」添加</div>';
        return;
    }

    if (isMobile()) {
        renderCards();
    } else {
        renderTableRows();
    }
}

function renderTableRows() {
    tasks.forEach((task, index) => {
        const row = document.createElement("div");
        row.className = "grid-row";
        row.dataset.id = task.id;

        row.innerHTML = `
            <div class="grid-cell">${index + 1}</div>
            <div class="grid-cell">${esc(task.test_name)}</div>
            <div class="grid-cell">${esc(task.publisher || "")}</div>
            <div class="grid-cell">${task.start_date || ""}</div>
            <div class="grid-cell">${task.end_date || ""}</div>
            <div class="grid-cell action-btn">Test Case</div>

            <div class="grid-cell">${esc(task.work_time || "")}</div>

            <div class="grid-cell">${esc(task.income1 || "")}</div>
            <div class="grid-cell">${task.received_date1 || ""}</div>

            <div class="grid-cell">${esc(task.payment || "")}</div>
            <div class="grid-cell">${esc(task.income2 || "")}</div>
            <div class="grid-cell">${task.received_date2 || ""}</div>
        `;

        row.querySelector(".action-btn").addEventListener("click", () => {
            toggleDetailDesktop(row, task);
        });

        row.addEventListener("click", (e) => {
            if (!e.target.classList.contains("action-btn")) {
                selectRow(task.id);
            }
        });

        gridBody.appendChild(row);
    });
}

function renderCards() {
    gridBody.innerHTML = "";

    tasks.forEach((task, index) => {
        const card = document.createElement("div");
        card.className = "card-item" + (selectedId === task.id ? " selected" : "");
        card.dataset.id = task.id;

        card.innerHTML = `
            <div class="card-main">
                <div class="card-title">${esc(task.test_name)}</div>

                <div class="card-row">
                    <span>📦 ${esc(task.publisher || "—")}</span>
                    <span>⏱ ${esc(task.work_time || "—")}</span>
                </div>

                <div class="card-income">
                    💰 ${esc(task.income1 || "—")}
                </div>
            </div>

            <div class="card-expand hidden">
                ${detailItemCard("Test Case", task.test_case)}
                ${detailItemCard("Test Result", task.test_result)}
                ${detailItemCard("Gamepack", task.gamepack)}
            </div>
        `;

        // 点击整卡展开（App行为）
        card.addEventListener("click", () => {
            const expand = card.querySelector(".card-expand");
            expand.classList.toggle("hidden");

            // 顺便选中
            selectedId = task.id;
            updateBottomBar();
            document.querySelectorAll(".card-item").forEach(c => {
                c.classList.toggle("selected", parseInt(c.dataset.id) === selectedId);
            });
        });

        gridBody.appendChild(card);
    });
}

function toggleCardDetail(card, task) {
    const existing = card.querySelector(".card-detail");
    if (existing) {
        existing.remove();
        return;
    }
    const detail = document.createElement("div");
    detail.className = "card-detail";
    detail.innerHTML = `
        ${detailItemCard("Test Case", task.test_case)}
        ${detailItemCard("Test Result", task.test_result)}
        ${detailItemCard("Gamepack", task.gamepack)}
    `;
    detail.querySelectorAll(".value").forEach(el => {
        el.onclick = () => copyText(el.dataset.text);
    });
    card.querySelector(".card-actions").after(detail);
}

function detailItemCard(label, text) {
    return `
        <div class="detail-item">
            <div class="label">${label}</div>
            <div class="value" data-text="${escapeHtml(text || "")}">${escapeHtml(text || "—")}</div>
        </div>
    `;
}

function confirmDelete(id) {
    if (!confirm("删除这条记录？")) return;
    api("DELETE", `/tasks/${id}`).then(() => {
        selectedId = null;
        loadTasks();
        showStatus("已删除");
    }).catch(err => showStatus(err.message, true));
}

function toggleDetailDesktop(row, task) {
    if (row.nextSibling && row.nextSibling.classList.contains("detail-row")) {
        row.nextSibling.remove();
        return;
    }
    const detail = document.createElement("div");
    detail.className = "detail-row";
    detail.innerHTML = `
        ${detailItemDesktop("Test Case", task.test_case)}
        ${detailItemDesktop("Test Result", task.test_result)}
        ${detailItemDesktop("Gamepack", task.gamepack)}
    `;
    detail.querySelectorAll(".value").forEach(el => {
        el.onclick = () => copyText(el.dataset.text);
    });
    row.after(detail);
}

function detailItemDesktop(label, text) {
    return `
        <div class="detail-item">
            <div class="label">${label}</div>
            <div class="value" data-text="${escapeHtml(text || "")}">${escapeHtml(text || "")}</div>
        </div>
    `;
}



function copyText(text) {
    navigator.clipboard.writeText(text);
    showStatus("已复制");
}

function esc(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function escapeHtml(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ─── Selection ──────────────────────────────────────────────────────────────

function selectRow(id) {
    document.querySelectorAll(".detail-row, .card-detail").forEach(el => el.remove());

    selectedId = selectedId === id ? null : id;

    document.querySelectorAll(".grid-row").forEach(row => {
        row.classList.toggle("selected", parseInt(row.dataset.id) === selectedId);
    });
    document.querySelectorAll(".card-item").forEach(card => {
        card.classList.toggle("selected", parseInt(card.dataset.id) === selectedId);
    });

    updateReorderButtons();
    btnEdit.disabled = selectedId === null;
    btnDelete.disabled = selectedId === null;
    updateBottomBar();
}

function updateReorderButtons() {
    if (selectedId === null) {
        btnUp.disabled = true;
        btnDown.disabled = true;
        return;
    }
    const idx = tasks.findIndex(t => t.id === selectedId);
    btnUp.disabled = idx <= 0;
    btnDown.disabled = idx >= tasks.length - 1;
}

// ─── Modals ─────────────────────────────────────────────────────────────────

function openEditModal(task) {
    modalTitle.textContent = task ? "编辑记录" : "新建记录";

    document.getElementById("task-id").value = task ? task.id : "";

    // 基本信息
    document.getElementById("task-test-name").value = task ? (task.test_name || "") : "";
    document.getElementById("task-publisher").value = task ? (task.publisher || "") : "";

    // 时间
    document.getElementById("task-start-date").value = task && task.start_date ? task.start_date : "";
    document.getElementById("task-end-date").value = task && task.end_date ? task.end_date : "";

    // 测试内容
    document.getElementById("task-test-case").value = task ? (task.test_case || "") : "";
    document.getElementById("task-test-result").value = task ? (task.test_result || "") : "";
    document.getElementById("task-gamepack").value = task ? (task.gamepack || "") : "";

    // 工时/财务
    document.getElementById("task-work-time").value = task ? (task.work_time || "") : "";
    document.getElementById("task-income1").value = task ? (task.income1 || "") : "";
    document.getElementById("task-received-date1").value = task && task.received_date1 ? task.received_date1 : "";
    document.getElementById("task-payment").value = task ? (task.payment || "") : "";
    document.getElementById("task-income2").value = task ? (task.income2 || "") : "";
    document.getElementById("task-received-date2").value = task && task.received_date2 ? task.received_date2 : "";

    editModal.classList.add("active");
    document.getElementById("task-test-name").focus();
}

function closeEditModal() {
    editModal.classList.remove("active");
    taskForm.reset();
}

// ─── Status ─────────────────────────────────────────────────────────────────

function showStatus(msg, isError = false) {
    statusMessage.textContent = msg;
    statusMessage.style.color = isError ? "#dc3545" : "#8b949e";
    if (!isError) {
        setTimeout(() => { statusMessage.textContent = ""; }, 3000);
    }
}

// ─── Build payload from form ─────────────────────────────────────────────────

function buildPayload() {
    return {
        test_name: document.getElementById("task-test-name").value.trim(),
        publisher: document.getElementById("task-publisher").value.trim() || null,
        start_date: document.getElementById("task-start-date").value || null,
        end_date: document.getElementById("task-end-date").value || null,
        test_case: document.getElementById("task-test-case").value.trim() || null,
        test_result: document.getElementById("task-test-result").value.trim() || null,
        gamepack: document.getElementById("task-gamepack").value.trim() || null,
        work_time: document.getElementById("task-work-time").value.trim() || null,
        income1: document.getElementById("task-income1").value.trim() || null,
        received_date1: document.getElementById("task-received-date1").value || null,
        payment: document.getElementById("task-payment").value.trim() || null,
        income2: document.getElementById("task-income2").value.trim() || null,
        received_date2: document.getElementById("task-received-date2").value || null,
    };
}

// ─── Event listeners ─────────────────────────────────────────────────────────

btnNew.addEventListener("click", () => openEditModal(null));

btnEdit.addEventListener("click", () => {
    const task = tasks.find(t => t.id === selectedId);
    if (task) openEditModal(task);
});

btnDelete.addEventListener("click", async () => {
    if (!selectedId) return;
    if (!confirm("删除这条记录？")) return;
    try {
        await api("DELETE", `/tasks/${selectedId}`);
        selectedId = null;
        await loadTasks();
        showStatus("已删除");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnUp.addEventListener("click", async () => {
    if (!selectedId) return;
    try {
        await api("PUT", "/tasks/reorder", { id: selectedId, direction: "up" });
        await loadTasks();
        showStatus("已上移");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnDown.addEventListener("click", async () => {
    if (!selectedId) return;
    try {
        await api("PUT", "/tasks/reorder", { id: selectedId, direction: "down" });
        await loadTasks();
        showStatus("已下移");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnExport.addEventListener("click", () => {
    window.open("/api/export");
});

btnImport.addEventListener("click", () => {
    document.getElementById("file-import").click();
});

document.getElementById("file-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
        const res = await fetch("/api/import", { method: "POST", body: form });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const result = await res.json();
        showStatus(`导入成功: ${result.imported} 条`);
        await loadTasks();
    } catch (err) {
        showStatus("导入失败: " + err.message, true);
    }
    e.target.value = "";
});

taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("task-id").value;
    const payload = buildPayload();

    if (!payload.test_name) {
        showStatus("测试名称必填", true);
        return;
    }

    try {
        if (id) {
            await api("PUT", `/tasks/${id}`, payload);
            showStatus("已更新");
        } else {
            await api("POST", "/tasks", payload);
            showStatus("已创建");
        }
        closeEditModal();
        await loadTasks();
    } catch (err) {
        showStatus(err.message, true);
    }
});

document.getElementById("cancel-edit").addEventListener("click", closeEditModal);

editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editModal.classList.contains("active")) {
        closeEditModal();
    }
});

// ─── Init ────────────────────────────────────────────────────────────────────

loadTasks();

// ─── Mobile Bottom Bar ───────────────────────────────────────────────────────

btnMNew.addEventListener("click", () => openEditModal(null));

btnMEdit.addEventListener("click", () => {
    if (!selectedId) return showStatus("请选择记录", true);
    const task = tasks.find(t => t.id === selectedId);
    if (task) openEditModal(task);
});

btnMDelete.addEventListener("click", () => {
    if (!selectedId) return showStatus("请选择记录", true);
    confirmDelete(selectedId);
});

// Sync bottom bar disabled state with desktop toolbar
function updateBottomBar() {
    btnMEdit.disabled = selectedId === null;
    btnMDelete.disabled = selectedId === null;

    document.querySelectorAll("#bottom-bar button").forEach(btn => {
        btn.classList.remove("active");
    });

    if (selectedId) {
        btnMEdit.classList.add("active");
    }
}

// ─── Responsive ──────────────────────────────────────────────────────────────

let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
    if ((window.innerWidth < 768) !== (lastWidth < 768)) {
        lastWidth = window.innerWidth;
        renderGrid();
    }
});
