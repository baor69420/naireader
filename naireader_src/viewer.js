const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lines = [];
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            lines.push(line);
            line = words[i] + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(x, y, maxWidth, lines.length * lineHeight + 8);
    ctx.fillStyle = "white";
    lines.forEach((l, i) => {
        ctx.fillText(l, x + 4, y + (i + 1) * lineHeight);
    });
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "RENDER_TRANSLATION") return;

    const { imageDataUrl, results } = msg;

    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        results.forEach(r => {
            const { x1, y1, x2, y2 } = r.box;
            ctx.font = "14px sans-serif";
            drawWrappedText(ctx, r.translatedText, x1, Math.max(4, y1 - 60), x2 - x1, 16);
        });
    };

    img.src = imageDataUrl;
});
