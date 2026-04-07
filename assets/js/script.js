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
let previewText = null;

// ── RESIZE STATE ──────────────────────────────────────────────────
let resizing = false;
let resizeHandle = null; // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
let resizeStartPos = null;
let resizeStartSize = null;
const HANDLE_R = 6; // hit-radius for handles

// ── LIVE PREVIEW LISTENERS ────────────────────────────────────────
document.getElementById("text-content").addEventListener("input", livePreview);
document.getElementById("font-size").addEventListener("input", livePreview);
document.getElementById("font-family").addEventListener("change", livePreview);

document.getElementById("text-color").addEventListener("input", (e) => {
  if (previewText) previewText.color = e.target.value;
  if (selectedText && selectedText !== previewText)
    selectedText.color = e.target.value;
  redraw();
});

document.getElementById("stroke-color").addEventListener("input", (e) => {
  if (previewText) previewText.strokeColor = e.target.value;
  if (selectedText && selectedText !== previewText)
    selectedText.strokeColor = e.target.value;
  redraw();
});

document.getElementById("stroke-width").addEventListener("input", (e) => {
  document.getElementById("stroke-val").textContent = e.target.value + "px";
  if (previewText) previewText.strokeWidth = e.target.value;
  if (selectedText && selectedText !== previewText)
    selectedText.strokeWidth = e.target.value;
  redraw();
});

// ── LIVE PREVIEW ──────────────────────────────────────────────────
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
    y:
      texts.filter((t) => t.id !== "__preview__").length === 0
        ? 50
        : canvas.height - 50,
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

// ── COLOR SWATCHES ────────────────────────────────────────────────
const swatches = document.querySelectorAll(".color-swatch");

function setTextColor(hex) {
  document.getElementById("text-color").value = hex;
  swatches.forEach((s) => s.classList.remove("active"));
  event.target.classList.add("active");
  if (previewText) previewText.color = hex;
  if (selectedText && selectedText !== previewText) selectedText.color = hex;
  redraw();
}

// ── ALIGNMENT ─────────────────────────────────────────────────────
function setAlign(a) {
  currentAlign = a;
  ["left", "center", "right"].forEach((x) => {
    document.getElementById("align-" + x).className =
      "btn" + (x === a ? " btn-primary" : "");
  });
  if (previewText) previewText.align = a;
  if (selectedText && selectedText !== previewText) selectedText.align = a;
  redraw();
}

// ── HELPERS: bounding box ─────────────────────────────────────────
function getTextBounds(t) {
  const sz = t.size || 42;
  ctx.font = `900 ${sz}px ${t.font || "Impact, sans-serif"}`;
  const lines = getWrappedLines(ctx, t.text, canvas.width - 40);
  const lineH = sz * 1.3;
  const totalH = lines.length * lineH;
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  let bx;
  if ((t.align || "center") === "center") bx = t.x - maxW / 2;
  else if (t.align === "left") bx = t.x;
  else bx = t.x - maxW;
  return { x: bx - 8, y: t.y - totalH / 2 - 8, w: maxW + 16, h: totalH + 16 };
}

function getWrappedLines(ctx, text, maxW) {
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
  return lines;
}

// ── HANDLES ───────────────────────────────────────────────────────
function getHandles(b) {
  return {
    nw: { x: b.x, y: b.y },
    n: { x: b.x + b.w / 2, y: b.y },
    ne: { x: b.x + b.w, y: b.y },
    e: { x: b.x + b.w, y: b.y + b.h / 2 },
    se: { x: b.x + b.w, y: b.y + b.h },
    s: { x: b.x + b.w / 2, y: b.y + b.h },
    sw: { x: b.x, y: b.y + b.h },
    w: { x: b.x, y: b.y + b.h / 2 },
  };
}

function hitHandle(pos, b) {
  const handles = getHandles(b);
  for (const [name, h] of Object.entries(handles)) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= HANDLE_R + 4) return name;
  }
  return null;
}

// ── REDRAW ────────────────────────────────────────────────────────
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  texts.forEach((t) => {
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
      const b = getTextBounds(t);
      ctx.strokeStyle = "rgba(100,150,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);

      const handles = getHandles(b);
      for (const h of Object.values(handles)) {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "rgba(100,150,255,1)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, HANDLE_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}

// ── WRAP TEXT ─────────────────────────────────────────────────────
function wrapText(ctx, text, x, y, maxW, lineH, stroke) {
  const lines = getWrappedLines(ctx, text, maxW);
  const total = lines.length * lineH;
  lines.forEach((l, i) => {
    const ly = y - total / 2 + i * lineH + lineH / 2;
    if (stroke) ctx.strokeText(l, x, ly);
    else ctx.fillText(l, x, ly);
  });
}

// ── ADD TEXT ──────────────────────────────────────────────────────
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

// ── TEXTS LIST ────────────────────────────────────────────────────
function renderTextsList() {
  const list = document.getElementById("texts-list");
  const permanentTexts = texts.filter((t) => t.id !== "__preview__");
  if (!permanentTexts.length) {
    list.innerHTML =
      '<div style="font-size:12px;color:var(--color-text-secondary);text-align:center;padding:8px">Aucun texte ajouté</div>';
    return;
  }
  list.innerHTML = permanentTexts
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

// ── SELECT / DELETE ───────────────────────────────────────────────
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

// ── RESET ─────────────────────────────────────────────────────────
function resetCanvas() {
  texts = [];
  selectedText = null;
  previewText = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderTextsList();
  redraw();
}

function resetAllCanvas() {
  bgImage = null;
  texts = [];
  selectedText = null;
  previewText = null;
  canvas.width = 520;
  canvas.height = 400;
  dropZone.style.display = "flex";
  document.getElementById("file-input").value = "";
  renderTextsList();
  redraw();
}

// ── DOWNLOAD ──────────────────────────────────────────────────────
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

// ── SHARE / COPY (desktop fix) ────────────────────────────────────
// async function shareMeme() {
//   if (!bgImage && !texts.length) {
//     showToast("Ajoutez une image ou du texte !");
//     return;
//   }

//   const sel = selectedText;
//   selectedText = null;
//   redraw();

//   // 1. Mobile Share (Works for you)
//   if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
//     try {
//       const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
//       const file = new File([blob], "meme.png", { type: "image/png" });
//       await navigator.share({ files: [file], title: "Mon Mème" });
//       restoreSelection(sel);
//       return;
//     } catch (e) {
//       if (e.name === "AbortError") {
//         restoreSelection(sel);
//         return;
//       }
//     }
//   }

//   // 2. Desktop Clipboard (The "Correct" way for 2026)
//   if (navigator.clipboard && window.ClipboardItem) {
//     try {
//       // Create the item IMMEDIATELY to satisfy browser security
//       const item = new ClipboardItem({
//         "image/png": new Promise((resolve, reject) => {
//           canvas.toBlob((blob) => {
//             if (blob) resolve(blob);
//             else reject(new Error("Canvas toBlob failed"));
//           }, "image/png");
//         }),
//       });

//       await navigator.clipboard.write([item]);
//       showToast("✅ Image copiée ! Collez avec Ctrl+V");
//     } catch (err) {
//       console.error("Clipboard failed:", err);
//       // If it fails (likely CORS or Firefox), fallback to download
//       downloadFallback();
//     }
//   } else {
//     downloadFallback();
//   }

//   restoreSelection(sel);
// }
async function shareMeme() {
  if (!bgImage && !texts.length) {
    showToast("Ajoutez une image ou du texte !");
    return;
  }

  // Masquer la sélection pour le rendu
  const sel = selectedText;
  selectedText = null;
  redraw();

  showToast("Génération du lien... ⏳");

  try {
    // 1. Convertir le canvas en Blob
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    // 2. Préparer l'envoi vers ImgBB
    const API_KEY = "85c601498fa4de1b93356d30c9ea4bf4"; // <--- METS TA CLÉ ICI
    const formData = new FormData();
    formData.append("image", blob);

    // 3. Appel API
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${API_KEY}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (data.success) {
      const shareUrl = data.data.url; // Le lien direct vers l'image

      // 4. Partage Native (Mobile) ou Presse-papier (Desktop)
      if (navigator.share) {
        await navigator.share({
          title: "Mon super Mème",
          text: "Regarde le mème que je viens de créer !",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast("✅ Lien copié ! Partagez-le où vous voulez.");
      }
    } else {
      throw new Error(data.error.message);
    }
  } catch (err) {
    console.error("Erreur détaillée:", err);
    showToast("Erreur : Impossible de créer le lien.");
  } finally {
    restoreSelection(sel);
  }
}
function downloadFallback() {
  try {
    const link = document.createElement("a");
    link.download = "meme.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Copie bloquée : Image téléchargée.");
  } catch (e) {
    showToast("Erreur : L'image provient d'un autre site (CORS).");
  }
}
function restoreSelection(sel) {
  selectedText = sel;
  redraw();
}

// ── LOAD IMAGE ────────────────────────────────────────────────────
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

// ── DRAG & DROP FILE ──────────────────────────────────────────────
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

// ── CANVAS COORDINATES ────────────────────────────────────────────
function getCanvasPos(e) {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
}

// ── CURSOR ────────────────────────────────────────────────────────
const HANDLE_CURSORS = {
  nw: "nw-resize",
  n: "n-resize",
  ne: "ne-resize",
  e: "e-resize",
  se: "se-resize",
  s: "s-resize",
  sw: "sw-resize",
  w: "w-resize",
};

// ── EVENTS ────────────────────────────────────────────────────────
canvas.addEventListener("mousedown", (e) => startDrag(getCanvasPos(e)));
canvas.addEventListener("mousemove", (e) => {
  const pos = getCanvasPos(e);
  if (dragging || resizing) {
    moveDrag(pos);
    return;
  }
  if (selectedText) {
    const b = getTextBounds(selectedText);
    const h = hitHandle(pos, b);
    canvas.style.cursor = h ? HANDLE_CURSORS[h] : "default";
  } else {
    canvas.style.cursor = "default";
  }
});
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mouseleave", endDrag);

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startDrag(getCanvasPos(e));
  },
  { passive: false }
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    moveDrag(getCanvasPos(e));
  },
  { passive: false }
);
canvas.addEventListener("touchend", endDrag);

function endDrag() {
  dragging = false;
  resizing = false;
  resizeHandle = null;
}

// ── START DRAG OR RESIZE ──────────────────────────────────────────
function startDrag(pos) {
  // 1. Check resize handle on selected text first
  if (selectedText) {
    const b = getTextBounds(selectedText);
    const h = hitHandle(pos, b);
    if (h) {
      resizing = true;
      resizeHandle = h;
      resizeStartPos = { ...pos };
      resizeStartSize = selectedText.size || 42;
      return;
    }
  }

  // 2. Hit-test all texts for drag
  let hit = null;
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    const b = getTextBounds(t);
    if (
      pos.x >= b.x &&
      pos.x <= b.x + b.w &&
      pos.y >= b.y &&
      pos.y <= b.y + b.h
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

// ── MOVE ──────────────────────────────────────────────────────────
function moveDrag(pos) {
  if (resizing && selectedText) {
    const dx = pos.x - resizeStartPos.x;
    const dy = pos.y - resizeStartPos.y;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const newSize = Math.max(10, Math.min(120, resizeStartSize + delta * 0.4));
    selectedText.size = Math.round(newSize);
    document.getElementById("font-size").value = selectedText.size;
    redraw();
    return;
  }
  if (!dragging || !selectedText) return;
  selectedText.x = Math.max(20, Math.min(canvas.width - 20, pos.x - dragOffX));
  selectedText.y = Math.max(20, Math.min(canvas.height - 20, pos.y - dragOffY));
  redraw();
}

// ── TEMPLATES ─────────────────────────────────────────────────────
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
  previewText = null;
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

// ── TOAST ─────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ── INIT ──────────────────────────────────────────────────────────
redraw();
