# naireader
Chrome extension for manga reading with translation. Takes latest image from clipboard and displays a popup of the image with translations.
## How to use
1. Install fastapi with pip and run command line in nai_server and run the command `fastapi run server.py`
2. Load extension to chrome in chrome://extensions
3. Remember to replace your DeepL API key in server.py
4. Copy image to clipboard and use the extension through extension popup
## Libraries & models
This extension uses 3 models:
- manga-ocr for text recognition: https://github.com/kha-white/manga-ocr
- model trained by me to recognize speech bubbles using yolov11
- DeepL translation
