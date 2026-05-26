const PENDING_KEY = "polycli_pending";

// 診療科のフォールバック（APIが取れないときに使う）
const DEPT_FALLBACK = [
  "呼吸器内科", "産婦人科", "小児科",
  "消化器外科", "心臓血管外科", "消化器内科", "循環器内科",
];

// 今日の日付をデフォルト値にセット
const dateInput = document.getElementById("date");
dateInput.value = new Date().toISOString().split("T")[0];

// ----------------------------------------
// 診療科の選択肢を描画
// ----------------------------------------
function renderDepartments(departments) {
  const select = document.getElementById("dept");
  select.innerHTML = '<option value="">未選択</option>';
  departments.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

async function loadDepartments() {
  const cached = localStorage.getItem("polycli_departments");

  // キャッシュがあればまず即時表示
  if (cached) renderDepartments(JSON.parse(cached));

  try {
    const res = await fetch("/api/get-departments");
    const { departments } = await res.json();
    localStorage.setItem("polycli_departments", JSON.stringify(departments));
    renderDepartments(departments);
  } catch {
    // APIが取れなかった場合：キャッシュ or ハードコードにフォールバック
    if (!cached) renderDepartments(DEPT_FALLBACK);
  }
}

loadDepartments();

// ----------------------------------------
// トースト通知
// ----------------------------------------
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast" + (isError ? " error" : "");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// ----------------------------------------
// オフライン保存（localStorage）
// ----------------------------------------
function getPending() {
  return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
}

function addPending(payload) {
  const list = getPending();
  list.push({ ...payload, _savedAt: new Date().toISOString() });
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

function clearPending(sentItems) {
  const remaining = getPending().filter(
    (item) => !sentItems.some((s) => s._savedAt === item._savedAt)
  );
  localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
}

// ----------------------------------------
// オンライン復帰時に未送信分を自動同期
// ----------------------------------------
async function syncPending() {
  const pending = getPending();
  if (pending.length === 0) return;

  const succeeded = [];
  for (const item of pending) {
    try {
      const res = await fetch("/api/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) succeeded.push(item);
    } catch {
      break; // まだオフラインなら中断
    }
  }

  if (succeeded.length > 0) {
    clearPending(succeeded);
    showToast(`✅ オフライン保存分 ${succeeded.length}件 を同期しました`);
  }
}

window.addEventListener("online", syncPending);
document.addEventListener("DOMContentLoaded", () => {
  if (navigator.onLine) syncPending();
});

// ----------------------------------------
// フォーム送信
// ----------------------------------------
document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;

  const payload = {
    name:   document.getElementById("name").value.trim(),
    dept:   document.getElementById("dept").value,
    memo:   document.getElementById("memo").value.trim(),
    report: document.getElementById("report").value.trim(),
    cbt:    document.getElementById("cbt").value.trim(),
    date:   document.getElementById("date").value,
  };

  // オフライン時はローカルに保存して終了
  if (!navigator.onLine) {
    addPending(payload);
    showToast("📥 オフラインで保存しました。オンライン復帰時に自動送信されます");
    e.target.reset();
    dateInput.value = new Date().toISOString().split("T")[0];
    btn.disabled = false;
    return;
  }

  btn.textContent = "送信中…";

  try {
    const res = await fetch("/api/add-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    showToast("✅ Notionに追加しました！");
    e.target.reset();
    dateInput.value = new Date().toISOString().split("T")[0];

  } catch (err) {
    // 送信失敗時もローカルに退避
    addPending(payload);
    showToast("📥 送信失敗。ローカルに保存しました", true);
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Notionに追加する";
  }
});
