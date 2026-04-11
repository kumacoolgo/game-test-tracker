/**
 * Game Test Tracker - Frontend
 * Auth is handled entirely by the browser via HTTP Basic Auth.
 * No login page, no token management.
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
        gridBody.innerHTML = '<div class="grid-row empty">No tasks — click New to add one</div>';
        return;
    }

    tasks.forEach((task, index) => {
        const row = document.createElement("div");
        row.className = "grid-row" + (task.id === selectedId ? " selected" : "");
        row.dataset.id = task.id;

        row.innerHTML = `
            <div class="grid-cell col-id">${task.id}</div>
            <div class="grid-cell col-title">${esc(task.title)}</div>
            <div class="grid-cell col-status status-${task.status}">${task.status.replace(/_/g, ' ')}</div>
            <div class="grid-cell col-priority priority-${task.priority}">${task.priority}</div>
            <div class="grid-cell col-order">${index + 1}</div>
        `;

        row.addEventListener("click", () => selectRow(task.id));
        gridBody.appendChild(row);
    });
}

function esc(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
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
    modalTitle.textContent = task ? "Edit Task" : "New Task";
    document.getElementById("task-id").value = task ? task.id : "";
    document.getElementById("task-title").value = task ? task.title : "";
    document.getElementById("task-desc").value = task ? (task.description || "") : "";
    document.getElementById("task-status").value = task ? task.status : "pending";
    document.getElementById("task-priority").value = task ? task.priority : "medium";
    editModal.classList.add("active");
    document.getElementById("task-title").focus();
}

function closeEditModal() {
    editModal.classList.remove("active");
    taskForm.reset();
}

// ─── Status ────────────────────────────────────────────────────────────────

function showStatus(msg, isError = false) {
    statusMessage.textContent = msg;
    statusMessage.style.color = isError ? "#dc3545" : "#888";
    if (!isError) {
        setTimeout(() => { statusMessage.textContent = ""; }, 3000);
    }
}

// ─── Event listeners ───────────────────────────────────────────────────────

btnNew.addEventListener("click", () => openEditModal(null));

btnEdit.addEventListener("click", () => {
    const task = tasks.find(t => t.id === selectedId);
    if (task) openEditModal(task);
});

btnDelete.addEventListener("click", async () => {
    if (!selectedId) return;
    if (!confirm("Delete this task?")) return;
    try {
        await api("DELETE", `/tasks/${selectedId}`);
        selectedId = null;
        await loadTasks();
        showStatus("Task deleted");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnUp.addEventListener("click", async () => {
    if (!selectedId) return;
    try {
        await api("PUT", "/tasks/reorder", { id: selectedId, direction: "up" });
        await loadTasks();
        showStatus("Moved up");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnDown.addEventListener("click", async () => {
    if (!selectedId) return;
    try {
        await api("PUT", "/tasks/reorder", { id: selectedId, direction: "down" });
        await loadTasks();
        showStatus("Moved down");
    } catch (err) {
        showStatus(err.message, true);
    }
});

taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("task-id").value;
    const fields = {
        title: document.getElementById("task-title").value.trim(),
        description: document.getElementById("task-desc").value.trim(),
        status: document.getElementById("task-status").value,
        priority: document.getElementById("task-priority").value,
    };
    if (!fields.title) {
        showStatus("Title required", true);
        return;
    }
    try {
        if (id) {
            await api("PUT", `/tasks/${id}`, fields);
            showStatus("Task updated");
        } else {
            await api("POST", "/tasks", fields);
            showStatus("Task created");
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

// ─── Init ──────────────────────────────────────────────────────────────────

loadTasks();
