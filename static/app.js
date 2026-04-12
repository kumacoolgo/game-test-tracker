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
        renderGrid();
    } catch (e) {
        showStatus("加载失败: " + e.message, true);
    }
}

// ─── Render ─────────────────────────────────────────────────────────────────

function renderGrid() {
    gridBody.innerHTML = "";

    if (tasks.length === 0) {
        gridBody.innerHTML = '<div class="grid-row empty">暂无记录 — 点击「新建」添加</div>';
        return;
    }

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
            <div class="grid-cell">${esc(task.payment || "")}</div>
            <div class="grid-cell">${esc(task.income || "")}</div>
            <div class="grid-cell">${task.received_date || ""}</div>
        `;

        row.querySelector(".action-btn").addEventListener("click", () => {
            toggleDetail(row, task);
        });

        row.addEventListener("click", (e) => {
            if (!e.target.classList.contains("action-btn")) {
                selectRow(task.id);
            }
        });

        gridBody.appendChild(row);
    });
}

function toggleDetail(row, task) {
    if (row.nextSibling && row.nextSibling.classList.contains("detail-row")) {
        row.nextSibling.remove();
        return;
    }

    const detail = document.createElement("div");
    detail.className = "detail-row";

    detail.innerHTML = `
        ${detailItem("Test Case", task.test_case)}
        ${detailItem("Test Result", task.test_result)}
        ${detailItem("Gamepack", task.gamepack)}
    `;

    row.after(detail);
}

function detailItem(label, text) {
    return `
        <div class="detail-item">
            <div class="label">${label}</div>
            <div class="value" onclick="copyText('${escapeHtml(text || "")}')">
                ${escapeHtml(text || "")}
            </div>
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
    // Close any open detail rows first
    document.querySelectorAll(".detail-row").forEach(el => el.remove());

    selectedId = selectedId === id ? null : id;

    document.querySelectorAll(".grid-row").forEach(row => {
        row.classList.toggle("selected", parseInt(row.dataset.id) === selectedId);
    });

    updateReorderButtons();
    btnEdit.disabled = selectedId === null;
    btnDelete.disabled = selectedId === null;
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
    document.getElementById("task-payment").value = task ? (task.payment || "") : "";
    document.getElementById("task-income").value = task ? (task.income || "") : "";
    document.getElementById("task-received-date").value = task && task.received_date ? task.received_date : "";

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
        payment: document.getElementById("task-payment").value.trim() || null,
        income: document.getElementById("task-income").value.trim() || null,
        received_date: document.getElementById("task-received-date").value || null,
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
