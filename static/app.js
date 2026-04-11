/**
 * Game Test Tracker - Frontend Logic
 * Handles auth, CRUD, row selection, and reorder (up/down).
 */

const API = "/api";

// ─── State ─────────────────────────────────────────────────────────────────

let tasks = [];
let selectedId = null;
let isLoggedIn = false;

// ─── DOM refs ─────────────────────────────────────────────────────────────

const loginModal = document.getElementById("login-modal");
const editModal = document.getElementById("edit-modal");
const gridBody = document.getElementById("grid-body");
const statusMessage = document.getElementById("status-message");

const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const btnNew = document.getElementById("btn-new");
const btnEdit = document.getElementById("btn-edit");
const btnDelete = document.getElementById("btn-delete");
const btnUp = document.getElementById("btn-up");
const btnDown = document.getElementById("btn-down");
const usernameDisplay = document.getElementById("username-display");

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const taskForm = document.getElementById("task-form");
const modalTitle = document.getElementById("modal-title");

// ─── Auth ─────────────────────────────────────────────────────────────────

async function checkSession() {
    const res = await fetch(`${API}/me`);
    const data = await res.json();
    if (data.username) {
        isLoggedIn = true;
        showAuth(data.username);
        await loadTasks();
    }
}

function showAuth(username) {
    btnLogin.style.display = "none";
    btnLogout.style.display = "inline-block";
    usernameDisplay.textContent = username;
    setButtonsEnabled(true);
}

function setButtonsEnabled(enabled) {
    btnNew.disabled = !enabled;
    btnEdit.disabled = !enabled;
    btnDelete.disabled = !enabled;
    btnUp.disabled = !enabled;
    btnDown.disabled = !enabled;
}

function clearAuth() {
    isLoggedIn = false;
    selectedId = null;
    tasks = [];
    btnLogin.style.display = "inline-block";
    btnLogout.style.display = "none";
    usernameDisplay.textContent = "";
    setButtonsEnabled(false);
    renderGrid();
}

// ─── API helpers ───────────────────────────────────────────────────────────

async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
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
        showStatus("Failed to load tasks: " + e.message);
    }
}

async function createTask(fields) {
    await api("POST", "/tasks", fields);
    await loadTasks();
}

async function updateTask(id, fields) {
    await api("PUT", `/tasks/${id}`, fields);
    await loadTasks();
}

async function deleteTask(id) {
    await api("DELETE", `/tasks/${id}`);
    selectedId = null;
    await loadTasks();
}

async function reorderTask(id, direction) {
    await api("PUT", "/tasks/reorder", { id, direction });
    await loadTasks();
}

// ─── Render ────────────────────────────────────────────────────────────────

function renderGrid() {
    gridBody.innerHTML = "";

    if (tasks.length === 0) {
        gridBody.innerHTML = '<div class="grid-row" style="justify-content:center;color:#666">No tasks yet</div>';
        return;
    }

    tasks.forEach((task, index) => {
        const row = document.createElement("div");
        row.className = "grid-row" + (task.id === selectedId ? " selected" : "");
        row.dataset.id = task.id;

        row.innerHTML = `
            <div class="grid-cell col-id">${task.id}</div>
            <div class="grid-cell col-title">${esc(task.title)}</div>
            <div class="grid-cell col-status status-${task.status}">${task.status.replace("_", " ")}</div>
            <div class="grid-cell col-priority priority-${task.priority}">${task.priority}</div>
            <div class="grid-cell col-order">${index + 1}</div>
        `;

        row.addEventListener("click", () => selectRow(task.id));
        gridBody.appendChild(row);
    });
}

function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
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
    if (!isLoggedIn || selectedId === null) {
        btnUp.disabled = true;
        btnDown.disabled = true;
        return;
    }

    const idx = tasks.findIndex(t => t.id === selectedId);
    btnUp.disabled = idx <= 0;
    btnDown.disabled = idx >= tasks.length - 1;
}

// ─── Modals ───────────────────────────────────────────────────────────────

function openLoginModal() {
    loginError.textContent = "";
    loginModal.classList.add("active");
    document.getElementById("login-username").focus();
}

function closeLoginModal() {
    loginModal.classList.remove("active");
    loginForm.reset();
    loginError.textContent = "";
}

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

// Auth
btnLogin.addEventListener("click", openLoginModal);
btnLogout.addEventListener("click", async () => {
    await api("POST", "/logout");
    clearAuth();
    showStatus("Logged out");
});

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    try {
        const data = await api("POST", "/login", { username, password });
        isLoggedIn = true;
        closeLoginModal();
        showAuth(data.username);
        showStatus("Logged in as " + data.username);
    } catch (err) {
        loginError.textContent = err.message;
    }
});

document.getElementById("cancel-edit").addEventListener("click", closeEditModal);

// Toolbar buttons
btnNew.addEventListener("click", () => openEditModal(null));
btnEdit.addEventListener("click", () => {
    const task = tasks.find(t => t.id === selectedId);
    if (task) openEditModal(task);
});

btnDelete.addEventListener("click", async () => {
    if (!selectedId) return;
    if (!confirm("Delete this task?")) return;
    try {
        await deleteTask(selectedId);
        showStatus("Task deleted");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnUp.addEventListener("click", async () => {
    if (!selectedId) return;
    try {
        await reorderTask(selectedId, "up");
        showStatus("Moved up");
    } catch (err) {
        showStatus(err.message, true);
    }
});

btnDown.addEventListener("click", async () => {
    if (!selectedId) return;
    try {
        await reorderTask(selectedId, "down");
        showStatus("Moved down");
    } catch (err) {
        showStatus(err.message, true);
    }
});

// Task form submit
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
            await updateTask(parseInt(id), fields);
            showStatus("Task updated");
        } else {
            await createTask(fields);
            showStatus("Task created");
        }
        closeEditModal();
    } catch (err) {
        showStatus(err.message, true);
    }
});

// Close modals on backdrop click
loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) closeLoginModal();
});
editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
});

// ─── Init ──────────────────────────────────────────────────────────────────

checkSession();
