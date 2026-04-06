const canvas = document.getElementById("meme-canvas");
const ctx = canvas.getContext("2d");
const dropZone = document.getElementById("drop-zone");
let bgImage = null;
let texts = [];
let selectedText = null;
let dragging = false,
  dragOffX = 0,
  dragOffY = 0;
let currentAlign = "center";
document.getElementById("text-content").addEventListener("input", livePreview);
document.getElementById("font-size").addEventListener("input", livePreview);
document.getElementById("font-family").addEventListener("change", livePreview);

let previewText = null;

function livePreview() {
  const content = document.getElementById("text-content").value.trim();

  if (previewText) {
    texts = texts.filter((t) => t.id !== previewText.id);
    previewText = null;
  }

  if (!content) {
    redraw();
    return;
  }

  previewText = {
    id: "__preview__",
    text: content,
    x: canvas.width / 2,
    y: texts.length === 0 ? 50 : canvas.height - 50,
    size: parseInt(document.getElementById("font-size").value) || 42,
    font: document.getElementById("font-family").value,
    color: document.getElementById("text-color").value,
    strokeColor: document.getElementById("stroke-color").value,
    strokeWidth: document.getElementById("stroke-width").value,
    align: currentAlign,
  };

  texts.push(previewText);
  redraw();
}
const swatches = document.querySelectorAll(".color-swatch");
document.getElementById("stroke-width").addEventListener("input", (e) => {
  document.getElementById("stroke-val").textContent = e.target.value + "px";
  redraw();
});
document
  .getElementById("text-color")
  .addEventListener("input", (e) => redraw());
document
  .getElementById("stroke-color")
  .addEventListener("input", (e) => redraw());

function setTextColor(hex) {
  document.getElementById("text-color").value = hex;
  swatches.forEach((s) => s.classList.remove("active"));
  event.target.classList.add("active");
  if (selectedText) {
    selectedText.color = hex;
    redraw();
  }
}

function setAlign(a) {
  currentAlign = a;
  ["left", "center", "right"].forEach((x) => {
    document.getElementById("align-" + x).className =
      "btn" + (x === a ? " btn-primary" : "");
  });
  if (selectedText) {
    selectedText.align = a;
    redraw();
  }
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  texts.forEach((t, i) => {
    const sz = t.size || 42;
    ctx.font = `900 ${sz}px ${t.font || "Impact, sans-serif"}`;
    ctx.textAlign = t.align || "center";
    ctx.textBaseline = "middle";
    const sw = parseInt(t.strokeWidth || 3);
    if (sw > 0) {
      ctx.strokeStyle = t.strokeColor || "#000";
      ctx.lineWidth = sw * 2;
      ctx.lineJoin = "round";
      wrapText(ctx, t.text, t.x, t.y, canvas.width - 40, sz * 1.3, true);
    }
    ctx.fillStyle = t.color || "#fff";
    wrapText(ctx, t.text, t.x, t.y, canvas.width - 40, sz * 1.3, false);
    if (t === selectedText) {
      const metrics = ctx.measureText(t.text);
      ctx.strokeStyle = "rgba(100,150,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        t.x - metrics.width / 2 - 6,
        t.y - sz / 2 - 6,
        metrics.width + 12,
        sz + 12
      );
      ctx.setLineDash([]);
    }
  });
}

function wrapText(ctx, text, x, y, maxW, lineH, stroke) {
  const words = text.split(" ");
  let line = "",
    lines = [];
  for (let w of words) {
    const test = line + (line ? " " : "") + w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  lines.push(line);
  const total = lines.length * lineH;
  lines.forEach((l, i) => {
    const ly = y - total / 2 + i * lineH + lineH / 2;
    if (stroke) ctx.strokeText(l, x, ly);
    else ctx.fillText(l, x, ly);
  });
}

function addText() {
  const content = document.getElementById("text-content").value.trim();
  if (!content) {
    showToast("Entrez du texte d'abord !");
    return;
  }

  if (previewText) {
    previewText.id = Date.now();
    selectedText = previewText;
    previewText = null;
  } else {
    const t = {
      id: Date.now(),
      text: content,
      x: canvas.width / 2,
      y: texts.length === 0 ? 50 : canvas.height - 50,
      size: parseInt(document.getElementById("font-size").value) || 42,
      font: document.getElementById("font-family").value,
      color: document.getElementById("text-color").value,
      strokeColor: document.getElementById("stroke-color").value,
      strokeWidth: document.getElementById("stroke-width").value,
      align: currentAlign,
    };
    texts.push(t);
    selectedText = t;
  }

  renderTextsList();
  redraw();
  document.getElementById("text-content").value = "";
  previewText = null;
}
function renderTextsList() {
  const list = document.getElementById("texts-list");
  if (!texts.length) {
    list.innerHTML =
      '<div style="font-size:12px;color:var(--color-text-secondary);text-align:center;padding:8px">Aucun texte ajouté</div>';
    return;
  }
  list.innerHTML = texts
    .map(
      (t) => `
    <div class="text-item ${
      t === selectedText ? "selected" : ""
    }" onclick="selectText(${t.id})">
      <div class="text-item-label">${t.text.substring(0, 30)}${
        t.text.length > 30 ? "..." : ""
      }</div>
      <span class="text-item-del" onclick="event.stopPropagation();deleteText(${
        t.id
      })">×</span>
    </div>
  `
    )
    .join("");
}

function selectText(id) {
  selectedText = texts.find((t) => t.id === id) || null;
  if (selectedText) {
    document.getElementById("text-content").value = selectedText.text;
    document.getElementById("font-size").value = selectedText.size;
    document.getElementById("font-family").value = selectedText.font;
    document.getElementById("text-color").value = selectedText.color;
    document.getElementById("stroke-color").value = selectedText.strokeColor;
    document.getElementById("stroke-width").value = selectedText.strokeWidth;
    document.getElementById("stroke-val").textContent =
      selectedText.strokeWidth + "px";
  }
  renderTextsList();
  redraw();
}

function deleteText(id) {
  texts = texts.filter((t) => t.id !== id);
  if (selectedText && selectedText.id === id) selectedText = null;
  renderTextsList();
  redraw();
}

function resetCanvas() {
  bgImage = null;
  texts = [];
  selectedText = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dropZone.style.display = "flex";
  renderTextsList();
  redraw();
}

function downloadMeme() {
  if (!bgImage && !texts.length) {
    showToast("Ajoutez une image ou du texte !");
    return;
  }
  const sel = selectedText;
  selectedText = null;
  redraw();
  const link = document.createElement("a");
  link.download = "meme-" + Date.now() + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  selectedText = sel;
  redraw();
  showToast("Mème téléchargé !");
}

async function shareMeme() {
  if (!bgImage && !texts.length) {
    showToast("Ajoutez une image ou du texte !");
    return;
  }
  const sel = selectedText;
  selectedText = null;
  redraw();
  canvas.toBlob(async (blob) => {
    const file = new File([blob], "meme.png", { type: "image/png" });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Mon Mème",
          text: "Regardez ce mème !",
        });
      } catch (e) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
    selectedText = sel;
    redraw();
  });
}

async function copyToClipboard() {
  try {
    canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showToast("Image copiée dans le presse-papiers !");
    });
  } catch (e) {
    showToast('Utilisez "Télécharger" pour sauvegarder !');
  }
}

function loadImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      bgImage = img;
      const ratio = img.width / img.height;
      canvas.width = Math.min(img.width, 600);
      canvas.height = canvas.width / ratio;
      dropZone.style.display = "none";
      redraw();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById("file-input").addEventListener("change", (e) => {
  if (e.target.files[0]) loadImageFromFile(e.target.files[0]);
});

dropZone.addEventListener("click", () =>
  document.getElementById("file-input").click()
);

const wrap = document.getElementById("canvas-wrap");
wrap.addEventListener("dragover", (e) => {
  e.preventDefault();
  wrap.style.outline = "2px solid #4af";
});
wrap.addEventListener("dragleave", () => {
  wrap.style.outline = "";
});
wrap.addEventListener("drop", (e) => {
  e.preventDefault();
  wrap.style.outline = "";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) loadImageFromFile(file);
});

function getCanvasPos(e) {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
}

canvas.addEventListener("mousedown", (e) => startDrag(getCanvasPos(e)));
canvas.addEventListener("mousemove", (e) => moveDrag(getCanvasPos(e)));
canvas.addEventListener("mouseup", () => (dragging = false));
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startDrag(getCanvasPos(e));
});
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  moveDrag(getCanvasPos(e));
});
canvas.addEventListener("touchend", () => (dragging = false));

function startDrag(pos) {
  let hit = null;
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    const sz = t.size || 42;
    ctx.font = `900 ${sz}px ${t.font}`;
    const w = ctx.measureText(t.text).width;
    if (
      Math.abs(pos.x - t.x) < w / 2 + 20 &&
      Math.abs(pos.y - t.y) < sz / 2 + 10
    ) {
      hit = t;
      break;
    }
  }
  if (hit) {
    selectedText = hit;
    dragging = true;
    dragOffX = pos.x - hit.x;
    dragOffY = pos.y - hit.y;
    renderTextsList();
    redraw();
  } else {
    selectedText = null;
    renderTextsList();
    redraw();
  }
}

function moveDrag(pos) {
  if (!dragging || !selectedText) return;
  selectedText.x = Math.max(20, Math.min(canvas.width - 20, pos.x - dragOffX));
  selectedText.y = Math.max(20, Math.min(canvas.height - 20, pos.y - dragOffY));
  redraw();
}

function applyTemplate(type) {
  const tpls = {
    drake: [
      { text: "Ce que je veux éviter", y: 0.25 },
      { text: "Ce que je fais quand même", y: 0.75 },
    ],
    distracted: [
      { text: "Chose intéressante", y: 0.5 },
      { text: "Ma tâche principale", y: 0.85 },
    ],
    "two-buttons": [
      { text: "Option A", y: 0.3 },
      { text: "Option B", y: 0.7 },
    ],
    "this-is-fine": [
      { text: "Tout va bien", y: 0.15 },
      { text: "(Intérieurement)", y: 0.85 },
    ],
    "change-my-mind": [
      { text: "Mon opinion controversée", y: 0.2 },
      { text: "Change my mind", y: 0.8 },
    ],
    "expanding-brain": [
      { text: "Idée normale", y: 0.15 },
      { text: "GRANDE IDÉE", y: 0.85 },
    ],
  };
  if (!tpls[type]) return;
  texts = [];
  tpls[type].forEach((tp) => {
    texts.push({
      id: Date.now() + Math.random(),
      text: tp.text,
      x: canvas.width / 2,
      y: canvas.height * tp.y,
      size: 38,
      font: "Impact, sans-serif",
      color: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 3,
      align: "center",
    });
  });
  selectedText = null;
  renderTextsList();
  redraw();
  showToast("Modèle appliqué ! Cliquez sur les textes pour les modifier.");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

redraw();
