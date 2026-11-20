(() => {
"use strict";
const $ = id => document.getElementById(id);
const KEY = "tlbb-ai-manager-bank-v1";
let bank = [];
let selectedImageUrl = "";
let ocrWorker = null;
let workerLanguage = "";
let ocrBusy = false;

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
function tokens(s) { return norm(s).split(" ").filter(w => w.length > 1); }
function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  A.forEach(x => { if (B.has(x)) intersection++; });
  return Math.max((2 * intersection) / (A.size + B.size),
                  (intersection / Math.min(A.size, B.size)) * 0.82);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(bank));
    $("questionStat").textContent = bank.length;
    render();
  } catch (_) {
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
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
    $("ocrMessage").textContent = "Định dạng chưa hỗ trợ. Hãy chọn PNG, JPG hoặc WEBP."; return;
  }
  if (f.size > 12 * 1024 * 1024) {
    $("ocrMessage").textContent = "Ảnh lớn hơn 12 MB. Hãy cắt nhỏ hoặc nén ảnh rồi thử lại."; return;
  }
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = URL.createObjectURL(f);
  $("preview").src = selectedImageUrl; $("preview").hidden = false;
  $("previewEmpty").hidden = true;
  $("ocrConfidence").textContent = "Độ tin cậy OCR: --";
  $("ocrDuration").textContent = "";
  $("ocrMessage").textContent = "Đã chọn ảnh. Có thể chạy OCR nâng cao.";
};

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = source instanceof Blob ? URL.createObjectURL(source) : source;
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh.")); };
    img.src = url;
  });
}
async function makeVariant(file, mode) {
  const img = await loadImage(file);
  const maxSide = 2200;
  const scale = Math.min(3, Math.max(1, maxSide / Math.max(img.width, img.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (mode !== "original") {
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = frame.data;
    // Luminance and contrast enhancement. Preserve dark/light polarity for game UI.
    const values = [];
    for (let i = 0; i < px.length; i += 4) {
      const gray = 0.2126 * px[i] + 0.7152 * px[i+1] + 0.0722 * px[i+2];
      values.push(gray);
    }
    let min = 255, max = 0;
    for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
    const range = Math.max(40, max - min);
    for (let p = 0, j = 0; p < px.length; p += 4, j++) {
      let v = (values[j] - min) * (255 / range);
      if (mode === "threshold") v = v >= 145 ? 255 : 0;
      px[p] = px[p+1] = px[p+2] = v;
      px[p+3] = 255;
    }
    ctx.putImageData(frame, 0, 0);
  }
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Không xử lý được ảnh.")), "image/png");
  });
}
async function getWorker(lang) {
  if (!window.Tesseract) throw new Error("Thư viện OCR chưa tải. Kiểm tra Internet và tải lại trang.");
  if (ocrWorker && workerLanguage === lang) return ocrWorker;
  if (ocrWorker) { await ocrWorker.terminate(); ocrWorker = null; workerLanguage = ""; }
  $("ocrMessage").textContent = "Đang khởi tạo OCR và tải dữ liệu ngôn ngữ...";
  // Tesseract.js v5: worker initializes the requested language during creation.
  ocrWorker = await Tesseract.createWorker(lang, 1, {
    logger: m => {
      if (m.status) {
        const pct = m.progress != null ? " · " + Math.round(m.progress * 100) + "%" : "";
        $("ocrMessage").textContent = "OCR: " + m.status + pct;
      }
    }
  });
  workerLanguage = lang;
  return ocrWorker;
}
function psmValue(mode) {
  if (mode === "block") return "6";
  if (mode === "sparse") return "11";
  if (mode === "line") return "7";
  return "6";
}
$("runOcrBtn").onclick = async () => {
  const file = $("imageInput").files && $("imageInput").files[0];
  if (!file) { $("ocrMessage").textContent = "Hãy chọn ảnh trước."; return; }
  if (ocrBusy) return;
  ocrBusy = true;
  const btn = $("runOcrBtn");
  btn.disabled = true;
  $("ocrStat").textContent = "Đang chạy";
  $("ocrConfidence").textContent = "Độ tin cậy OCR: đang xử lý...";
  const started = performance.now();
  try {
    const lang = $("ocrLang").value;
    const mode = $("ocrMode").value;
    const psm = $("psmMode").value;
    const worker = await getWorker(lang);
    const variants = mode === "auto" ? ["enhance", "threshold", "original"] : [mode];
    const psmList = psm === "auto" ? ["6", "11"] : [psmValue(psm)];
    let best = null, attempts = 0;
    const total = variants.length * psmList.length;
    for (const variant of variants) {
      const image = await makeVariant(file, variant);
      for (const pageMode of psmList) {
        attempts++;
        $("ocrMessage").textContent = `Đang nhận diện ${attempts}/${total}: ${variant === "enhance" ? "tăng tương phản" : variant === "threshold" ? "đen trắng" : "ảnh gốc"}...`;
        await worker.setParameters({
          tessedit_pageseg_mode: pageMode,
          preserve_interword_spaces: "1"
        });
        const result = await worker.recognize(image);
        const text = (result.data.text || "").trim();
        const confidence = Number(result.data.confidence || 0);
        const quality = confidence + Math.min(text.length, 500) / 100;
        if (text && (!best || quality > best.quality)) {
          best = { text, confidence, quality, variant, pageMode };
        }
        if (best && best.confidence >= 88 && best.text.length > 12) break;
      }
      if (best && best.confidence >= 88 && best.text.length > 12) break;
    }
    if (best) {
      $("ocrText").value = best.text;
      $("ocrConfidence").textContent = "Độ tin cậy OCR: " + Math.round(best.confidence) + "%";
      $("ocrMessage").textContent = `Hoàn tất · ${best.variant} · chế độ chữ ${best.pageMode}. Vui lòng soát lại dấu và ký tự trước khi tra cứu.`;
    } else {
      $("ocrText").value = "";
      $("ocrConfidence").textContent = "Độ tin cậy OCR: --";
      $("ocrMessage").textContent = "Không nhận diện được chữ. Hãy chọn ảnh rõ hơn hoặc cắt sát khung hội thoại.";
    }
    $("ocrDuration").textContent = ((performance.now() - started) / 1000).toFixed(1) + " giây";
    $("ocrStat").textContent = "Sẵn sàng";
  } catch (e) {
    $("ocrMessage").textContent = "OCR gặp lỗi: " + (e && e.message ? e.message : String(e));
    $("ocrStat").textContent = "Có lỗi";
  } finally {
    btn.disabled = false;
    ocrBusy = false;
  }
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
    $("answerNote").textContent = "Câu gần nhất: " + best.question + " · NPC: " + (best.npc || "Không rõ") + ". Điểm này là độ tương đồng văn bản, không phải xác suất đáp án đúng.";
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
window.addEventListener("beforeunload", () => {
  if (ocrWorker) ocrWorker.terminate();
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
});
$("questionStat").textContent = bank.length;
render();
})();