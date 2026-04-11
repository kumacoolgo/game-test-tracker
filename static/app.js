/**
 * Game Test Tracker - Frontend
 * Auth: browser HTTP Basic Auth (no login page, no token)
 */

const API = "/api";

// ─── State ─────────────────────────────────────────────────────────────────

let tasks = [];
let selectedId = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────

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

// ─── API helpers ───────────────────────────────────────────────────────────

async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    if (res.status === 401) {
        showStatus("Authentication required — reload and enter credentials", true);
        throw new Error("Unauthorized");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

async function loadTasks() {
    try {
        tasks = await api("GET", "/tasks");
        selectedId = null;
        updateReorderButtons();
        renderGrid();
    } catch (e) {
        showStatus("Failed to load: " + e.message, true);
    }
}

// ─── Render ────────────────────────────────────────────────────────────────

function renderGrid() {
    gridBody.innerHTML = "";

    if (tasks.length === 0) {
        gridBody.innerHTML = '<div class="grid-row empty">暂无记录 — 点击「新建」添加</div>';
        return;
    }

    tasks.forEach((task, index) => {
        const row = document.createElement("div");
        row.className = "grid-row" + (task.id === selectedId ? " selected" : "");
        row.dataset.id = task.id;

        row.innerHTML = `
            <div class="grid-cell col-id">${index + 1}</div>
            <div class="grid-cell col-name">${esc(task.task_name)}</div>
            <div class="grid-cell col-game">${esc(task.game_title || "—")}</div>
            <div class="grid-cell col-reward">¥${fmt(task.reward_amount)}</div>
            <div class="grid-cell col-cost">¥${fmt(task.payment_cost)}</div>
            <div class="grid-cell col-profit">¥${fmt(task.profit)}</div>
            <div class="grid-cell col-received">${task.payment_received_date || "未到账"}</div>
        `;

        row.addEventListener("click", () => selectRow(task.id));
        row.addEventListener("dblclick", () => {
            selectedId = task.id;
            selectRow(task.id);
            openEditModal(task);
        });
        gridBody.appendChild(row);
    });
}

function esc(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function fmt(val) {
    if (val == null || val === "") return "0";
    const n = parseFloat(val);
    return isNaN(n) ? "0" : n.toFixed(2);
}

// ─── Selection ─────────────────────────────────────────────────────────────

function selectRow(id) {
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

// ─── Modals ───────────────────────────────────────────────────────────────

function openEditModal(task) {
    modalTitle.textContent = task ? "编辑记录" : "新建记录";

    document.getElementById("task-id").value = task ? task.id : "";

    // 基本信息
    document.getElementById("task-name").value = task ? (task.task_name || "") : "";
    document.getElementById("task-publisher").value = task ? (task.publisher || "") : "";
    document.getElementById("task-game-title").value = task ? (task.game_title || "") : "";
    document.getElementById("task-gamepack-url").value = task ? (task.gamepack_url || "") : "";

    // 时间
    document.getElementById("task-start-date").value = task && task.start_date ? task.start_date : "";
    document.getElementById("task-end-date").value = task && task.end_date ? task.end_date : "";
    document.getElementById("task-total-testing-time").value =
        task && task.total_testing_time != null ? task.total_testing_time : "";

    // 测试
    document.getElementById("task-test-cases").value = task ? (task.test_cases || "") : "";
    document.getElementById("task-test-results").value = task ? (task.test_results || "") : "";

    // 财务
    document.getElementById("task-reward-amount").value =
        task && task.reward_amount != null ? task.reward_amount : "";
    document.getElementById("task-payment-cost").value =
        task && task.payment_cost != null ? task.payment_cost : "";
    document.getElementById("task-payment-received-date").value =
        task && task.payment_received_date ? task.payment_received_date : "";

    editModal.classList.add("active");
    document.getElementById("task-name").focus();
}

function closeEditModal() {
    editModal.classList.remove("active");
    taskForm.reset();
}

// ─── Status ────────────────────────────────────────────────────────────────

function showStatus(msg, isError = false) {
    statusMessage.textContent = msg;
    statusMessage.style.color = isError ? "#dc3545" : "#8b949e";
    if (!isError) {
        setTimeout(() => { statusMessage.textContent = ""; }, 3000);
    }
}

// ─── Build payload from form ───────────────────────────────────────────────

function buildPayload() {
    return {
        task_name: document.getElementById("task-name").value.trim(),
        publisher: document.getElementById("task-publisher").value.trim() || null,
        game_title: document.getElementById("task-game-title").value.trim() || null,
        gamepack_url: document.getElementById("task-gamepack-url").value.trim() || null,
        start_date: document.getElementById("task-start-date").value || null,
        end_date: document.getElementById("task-end-date").value || null,
        total_testing_time: parseFloat(document.getElementById("task-total-testing-time").value) || null,
        test_cases: document.getElementById("task-test-cases").value.trim() || null,
        test_results: document.getElementById("task-test-results").value.trim() || null,
        reward_amount: parseFloat(document.getElementById("task-reward-amount").value) || 0,
        payment_cost: parseFloat(document.getElementById("task-payment-cost").value) || 0,
        payment_received_date: document.getElementById("task-payment-received-date").value || null,
    };
}

// ─── Event listeners ───────────────────────────────────────────────────────

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

    if (!payload.task_name) {
        showStatus("任务名称必填", true);
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

// Esc closes modal
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editModal.classList.contains("active")) {
        closeEditModal();
    }
});

// ─── Init ──────────────────────────────────────────────────────────────────

loadTasks();
