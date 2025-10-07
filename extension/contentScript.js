const OVERLAY_ID = "selection-translator-overlay";
let lastSelectionRect = null;
let lastSelectedText = "";
let overlayElement = null;

function updateSelectionMetadata() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const text = selection.toString().trim();
  if (!text) {
    return;
  }

  lastSelectedText = text;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect && rect.width !== 0 && rect.height !== 0) {
    lastSelectionRect = rect;
  }
}

document.addEventListener("mouseup", () => {
  setTimeout(updateSelectionMetadata, 0);
});

document.addEventListener("keyup", (event) => {
  if (event.key === "Shift" || event.key === "Control" || event.key === "Alt") {
    return;
  }
  setTimeout(updateSelectionMetadata, 0);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_TRANSLATION") {
    const { originalText, translation } = message.payload;
    showOverlay({ originalText, translation, isError: false });
  }

  if (message.type === "TRANSLATION_ERROR") {
    showOverlay({
      originalText: lastSelectedText,
      translation: message.message,
      isError: true
    });
  }
});

function showOverlay({ originalText, translation, isError }) {
  ensureOverlayExists();

  overlayElement.classList.toggle("selection-translator__error", Boolean(isError));

  const originalTextElement = overlayElement.querySelector(".selection-translator__original");
  const translationElement = overlayElement.querySelector(".selection-translator__translation");

  originalTextElement.textContent = originalText || "";
  translationElement.textContent = translation;

  positionOverlay();
  overlayElement.classList.add("selection-translator--visible");
}

function ensureOverlayExists() {
  if (overlayElement) {
    return;
  }

  overlayElement = document.createElement("div");
  overlayElement.id = OVERLAY_ID;
  overlayElement.className = "selection-translator";
  overlayElement.innerHTML = `
    <div class="selection-translator__header">
      <span class="selection-translator__title">Перевод</span>
      <button class="selection-translator__close" type="button" aria-label="Закрыть перевод">×</button>
    </div>
    <div class="selection-translator__body">
      <div class="selection-translator__label">Исходный текст</div>
      <div class="selection-translator__original"></div>
      <div class="selection-translator__label">Перевод</div>
      <div class="selection-translator__translation"></div>
    </div>
  `;

  const closeButton = overlayElement.querySelector(".selection-translator__close");
  closeButton.addEventListener("click", () => {
    overlayElement.classList.remove("selection-translator--visible");
  });

  document.documentElement.appendChild(overlayElement);
}

function positionOverlay() {
  if (!overlayElement) {
    return;
  }

  const { innerWidth, innerHeight } = window;
  const padding = 12;
  let top = padding;
  let left = padding;

  if (lastSelectionRect) {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    top = lastSelectionRect.bottom + scrollY + padding;
    left = lastSelectionRect.left + scrollX;
  }

  const overlayRect = overlayElement.getBoundingClientRect();
  const overlayWidth = overlayRect.width || 260;
  const overlayHeight = overlayRect.height || 120;

  if (left + overlayWidth + padding > innerWidth + window.scrollX) {
    left = innerWidth + window.scrollX - overlayWidth - padding;
  }

  if (top + overlayHeight + padding > innerHeight + window.scrollY) {
    top = innerHeight + window.scrollY - overlayHeight - padding;
  }

  overlayElement.style.top = `${Math.max(padding, top)}px`;
  overlayElement.style.left = `${Math.max(padding, left)}px`;
}
