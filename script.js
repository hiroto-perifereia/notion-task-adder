// 今日の日付をデフォルト値にセット
const dateInput = document.getElementById("date");
dateInput.value = new Date().toISOString().split("T")[0];

// 診療科の選択肢をNotionから動的取得
async function loadDepartments() {
  const select = document.getElementById("dept");
  try {
    const res = await fetch("/api/get-departments");
    const { departments } = await res.json();

    select.innerHTML = '<option value="">未選択</option>';
    departments.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (err) {
    select.innerHTML = '<option value="">取得失敗（手動入力不可）</option>';
    console.error("診療科取得エラー:", err);
  }
}

loadDepartments();

// トースト通知
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast" + (isError ? " error" : "");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// フォーム送信
document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "送信中…";

  const payload = {
    name:   document.getElementById("name").value.trim(),
    dept:   document.getElementById("dept").value,
    memo:   document.getElementById("memo").value.trim(),
    report: document.getElementById("report").value.trim(),
    cbt:    document.getElementById("cbt").value.trim(),
    date:   document.getElementById("date").value,
  };

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

    // フォームをリセット（日付は今日のまま）
    e.target.reset();
    dateInput.value = new Date().toISOString().split("T")[0];

  } catch (err) {
    console.error(err);
    showToast("❌ エラー: " + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Notionに追加する";
  }
});
