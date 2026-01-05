const status = document.getElementById("status");

function blobToDataURL(blob) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

document.getElementById("ocr").addEventListener("click", async () => {
  status.textContent = "Reading clipboard…";

  try {
    const items = await navigator.clipboard.read();
    const item = items.find(i =>
      i.types.some(t => t.startsWith("image/"))
    );

    if (!item) {
      status.textContent = "No image found in clipboard.";
      return;
    }

    const type = item.types.find(t => t.startsWith("image/"));
    const blob = await item.getType(type);

    status.textContent = "Sending image for detection…";
    const detectForm = new FormData();
    detectForm.append("file", blob, "clipboard.png");

    const detectRes = await fetch("http://127.0.0.1:8000/detect_bubbles", {
      method: "POST",
      body: detectForm
    });
    if (!detectRes.ok) {
      status.textContent = "Bubble detection error";
      return;
    }
    const { boxes } = await detectRes.json();

    const imgBitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgBitmap, 0, 0);

    let combinedText = [];
    let ocrResults = [];

    for (const box of boxes) {
      const x1 = (box.x_c - box.w / 2) * imgBitmap.width;
      const y1 = (box.y_c - box.h / 2) * imgBitmap.height;
      const w = box.w * imgBitmap.width;
      const h = box.h * imgBitmap.height;

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = w;
      cropCanvas.height = h;
      const cropCtx = cropCanvas.getContext("2d");
      cropCtx.drawImage(canvas, x1, y1, w, h, 0, 0, w, h);

      const cropBlob = await new Promise(resolve =>
        cropCanvas.toBlob(resolve, "image/png")
      );

      status.textContent = "OCR speech bubble…";
      const ocrForm = new FormData();
      ocrForm.append("file", cropBlob, "crop.png");

      const ocrRes = await fetch("http://127.0.0.1:8000/ocr", {
        method: "POST",
        body: ocrForm
      });
      if (ocrRes.ok) {
        const { text } = await ocrRes.json();
        const trimmed = text.trim();
        combinedText.push(trimmed);

        const transRes = await fetch("http://127.0.0.1:8000/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: text.trim() })
        });
        if (transRes.ok) {
          const { translation } = await transRes.json();
          ocrResults.push({
            id: box.id,
            box: {
              x1: x1,
              y1: y1,
              x2: x1 + w,
              y2: y1 + h
            },
            originalText: trimmed,
            translatedText: translation,
            confidence: box.conf
          });
        }
      }
    }
    const imageDataUrl = await blobToDataURL(blob);
    chrome.tabs.create({
      url: chrome.runtime.getURL("viewer.html")
    }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.sendMessage(tab.id, {
            type: "RENDER_TRANSLATION",
            imageDataUrl,
            results: ocrResults
          });
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
    status.textContent = "Done!";
  } catch (err) {
    console.error(err);
    status.textContent = "OCR failed. Is the server running?";
  }
});
