const MENU_ID = "selection-translator";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Перевести на русский",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || info.menuItemId !== MENU_ID) {
    return;
  }

  const selectedText = (info.selectionText || "").trim();
  if (!selectedText) {
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATION_ERROR",
      message: "Не удалось получить выделенный текст."
    });
    return;
  }

  try {
    const translation = await translateText(selectedText);
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_TRANSLATION",
      payload: {
        originalText: selectedText,
        translation
      }
    });
  } catch (error) {
    console.error("Translation error", error);
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATION_ERROR",
      message: "Ошибка перевода. Попробуйте позже."
    });
  }
});

async function translateText(text) {
  const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
  endpoint.searchParams.set("client", "gtx");
  endpoint.searchParams.set("sl", "en");
  endpoint.searchParams.set("tl", "ru");
  endpoint.searchParams.set("dt", "t");
  endpoint.searchParams.set("q", text);

  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    throw new Error(`Translation request failed: ${response.status}`);
  }

  const data = await response.json();
  const [firstVariant] = data;
  if (!Array.isArray(firstVariant)) {
    throw new Error("Unexpected translation response format");
  }

  const translatedText = firstVariant.map((item) => item[0]).join("");
  return translatedText.trim();
}
