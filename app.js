(() => {
"use strict";
const $ = id => document.getElementById(id);
const KEY = "tlbb-ai-manager-bank-v1";
let bank = [];
let selectedImageUrl = "";
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
  bank = Array.isArray(saved) ? saved.filter(x => x && x.question && x.answer) : [];
} catch (_) { bank = []; }

function norm(s) {
  return String(s || "").toLocaleLowerCase("vi")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ").trim();
}
function tokens(s) {
  return norm(s).split(" ").filter(w => w.length > 1);
}
function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  A.forEach(x => { if (B.has(x)) intersection++; });
  const dice = (2 * intersection) / (A.size + B.size);
  const coverage = intersection / Math.min(A.size, B.size);
  return Math.max(dice, coverage * 0.82);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(bank));
    $("questionStat").textContent = bank.length;
    render();
  } catch (e) {
    $("ocrMessage").textContent = "Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.";
  }
}
function render() {
  const box = $("questionList");
  box.replaceChildren();
  const q = norm($("bankSearch").value);
  const rows = bank.filter(x => norm(`${x.question} ${x.answer} ${x.npc || ""}`).includes(q));
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty"; empty.textContent = "Chưa có câu hỏi phù hợp.";
    box.append(empty); return;
  }
  rows.forEach(x => {
    const d = document.createElement("div"); d.className = "question";
    const del = document.createElement("button"); del.textContent = "Xóa";
    del.onclick = () => {
      if (confirm("Bạn có chắc muốn xóa câu hỏi này?")) {
        bank = bank.filter(y => y.id !== x.id); save();
      }
    };
    const b = document.createElement("b"); b.textContent = x.question;
    const p = document.createElement("p"); p.textContent = "Đáp án: " + x.answer;
    const s = document.createElement("small"); s.textContent = "NPC: " + (x.npc || "Chưa phân loại");
    d.append(del, b, p, s); box.append(d);
  });
}
for (let i = 1; i <= 15; i++) {
  const l = document.createElement("label"); l.className = "account";
  const span = document.createElement("span");
  const b = document.createElement("b"); b.textContent = "Account " + String(i).padStart(2, "0");
  const small = document.createElement("small"); small.textContent = "Chưa kết nối";
  span.append(b, small);
  const input = document.createElement("input"); input.type = "checkbox";
  input.onchange = e => {
    small.textContent = e.target.checked ? "Đang hoạt động" : "Chưa kết nối";
    $("activeStat").textContent = document.querySelectorAll(".account input:checked").length;
  };
  l.append(span, input); $("accountGrid").append(l);
}
$("saveQuestionBtn").onclick = () => {
  const question = $("newQuestion").value.trim(), answer = $("newAnswer").value.trim();
  if (!question || !answer) { $("ocrMessage").textContent = "Cần nhập câu hỏi và đáp án."; return; }
  bank.unshift({ id: String(Date.now()), question, answer, npc: $("newNpc").value.trim() });
  $("newQuestion").value = $("newAnswer").value = $("newNpc").value = "";
  save(); $("ocrMessage").textContent = "Đã lưu câu hỏi.";
};
$("bankSearch").oninput = render;
$("imageInput").onchange = e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = URL.createObjectURL(f);
  $("preview").src = selectedImageUrl; $("preview").hidden = false;
  $("previewEmpty").hidden = true;
  $("ocrMessage").textContent = "Đã chọn ảnh. Nhấn Chạy OCR ảnh.";
};
function preprocess(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(2.5, Math.max(1, 1600 / img.width));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < data.data.length; i += 4) {
          const gray = 0.299 * data.data[i] + 0.587 * data.data[i+1] + 0.114 * data.data[i+2];
          const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
          data.data[i] = data.data[i+1] = data.data[i+2] = contrast;
        }
        ctx.putImageData(data, 0, 0);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob); else reject(new Error("Không xử lý được ảnh."));
        }, "image/png");
      } catch (err) { URL.revokeObjectURL(url); reject(err); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh.")); };
    img.src = url;
  });
}
$("runOcrBtn").onclick = async () => {
  const file = $("imageInput").files && $("imageInput").files[0];
  if (!file) { $("ocrMessage").textContent = "Hãy chọn ảnh trước."; return; }
  if (!window.Tesseract) { $("ocrMessage").textContent = "Không tải được thư viện OCR. Kiểm tra kết nối Internet rồi tải lại trang."; return; }
  const btn = $("runOcrBtn"); btn.disabled = true; $("ocrStat").textContent = "Đang chạy";
  try {
    let input = file;
    if ($("preprocessToggle").checked) {
      $("ocrMessage").textContent = "Đang tăng kích thước và tương phản ảnh...";
      input = await preprocess(file);
    }
    const lang = $("ocrLang").value;
    $("ocrMessage").textContent = "Đang tải dữ liệu ngôn ngữ OCR...";
    const result = await Tesseract.recognize(input, lang, {
      logger: m => {
        if (m.status) $("ocrMessage").textContent = m.status + (m.progress != null ? " · " + Math.round(m.progress * 100) + "%" : "");
      }
    });
    $("ocrText").value = (result.data.text || "").trim();
    $("ocrMessage").textContent = $("ocrText").value ? "OCR hoàn tất. Hãy kiểm tra và sửa chữ sai trước khi tra cứu." : "OCR chưa đọc được chữ. Hãy thử ảnh rõ hơn hoặc bỏ chọn tăng tương phản.";
    $("ocrStat").textContent = "Sẵn sàng";
  } catch (e) {
    $("ocrMessage").textContent = "OCR lỗi: " + (e.message || e);
    $("ocrStat").textContent = "Có lỗi";
  } finally { btn.disabled = false; }
};
$("searchBtn").onclick = () => {
  const q = $("ocrText").value.trim();
  if (!q) { $("ocrMessage").textContent = "Hãy nhập hoặc nhận diện câu hỏi trước."; return; }
  $("answerEmpty").hidden = true; $("answerResult").hidden = false;
  let best = null, sc = 0;
  bank.forEach(x => {
    const n = similarity(q, x.question);
    if (n > sc) { sc = n; best = x; }
  });
  $("confidence").textContent = Math.round(sc * 100) + "%";
  $("meterFill").style.width = Math.round(sc * 100) + "%";
  if (best && sc >= 0.28) {
    $("answerText").textContent = best.answer;
    $("answerNote").textContent = "Câu gần nhất: " + best.question + " · NPC: " + (best.npc || "Không rõ") + ". Đây là điểm tương đồng văn bản, không phải xác suất đáp án đúng.";
  } else {
    $("answerText").textContent = "Chưa tìm thấy đáp án phù hợp";
    $("answerNote").textContent = "Hãy kiểm tra lại OCR hoặc bổ sung câu hỏi vào ngân hàng local.";
  }
};
$("exportBtn").onclick = () => {
  const payload = { version: 1, exportedAt: new Date().toISOString(), questions: bank };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = "tlbb-question-bank.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async e => {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    const rows = Array.isArray(j) ? j : j.questions;
    if (!Array.isArray(rows)) throw new Error("Thiếu danh sách questions");
    let added = 0;
    rows.forEach(x => {
      if (x && typeof x.question === "string" && typeof x.answer === "string" && x.question.trim() && x.answer.trim()) {
        bank.push({ id: String(Date.now()) + "-" + added, question: x.question.trim(), answer: x.answer.trim(), npc: String(x.npc || "") }); added++;
      }
    });
    save(); $("ocrMessage").textContent = "Đã nhập " + added + " câu hỏi.";
  } catch (_) { alert("Tệp JSON không hợp lệ hoặc sai cấu trúc."); }
  e.target.value = "";
};
$("questionStat").textContent = bank.length;
render();
})();