from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from ultralytics import YOLO
from manga_ocr import MangaOcr
from PIL import Image
import io
import deepl

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

mocr = MangaOcr()

model = YOLO("model.pt")

auth_key = "YOUR_API_KEY"
deepl_client = deepl.DeepLClient(auth_key)

class Detection(BaseModel):
    id: int
    x_c: float
    y_c: float
    w: float
    h: float
    conf: float


@app.post("/detect_bubbles")
async def detect_bubbles(file: UploadFile = File(...), conf_thresh: float = 0.3):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_w, img_h = image.size
    results = model(image)
    detections: List[Detection] = []
    for r in results:
        for box in r.boxes.data.tolist():
            x1, y1, x2, y2, conf, cls = box
            if conf < conf_thresh:
                continue
            box_w = (x2 - x1)
            box_h = (y2 - y1)
            x_c = (x1 + x2) / 2 / img_w
            y_c = (y1 + y2) / 2 / img_h
            w_norm = box_w / img_w
            h_norm = box_h / img_h
            detections.append(
                Detection(
                    id=int(cls),
                    x_c=x_c,
                    y_c=y_c,
                    w=w_norm,
                    h=h_norm,
                    conf=float(conf)
                )
            )
    return {"boxes": detections}

@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))
    file.close()
    text = mocr(image)
    return {"text": text}
@app.post("/translate")
async def translate(text: str = Body(...,embed=True)):
    result = deepl_client.translate_text(text, target_lang="EN-US")
    print(result.text)
    return {"translation": result.text}