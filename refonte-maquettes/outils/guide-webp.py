# Passe les captures du Guide (PNG produits par captures-guide.mjs, dans
# %TEMP%\compyo-guide-png) en WebP dans public/guide/, et retire les
# images qui ne servent plus (absentes de lib/guide/captures.json).
#
#   python refonte-maquettes/outils/guide-webp.py
import json
import os
import tempfile

from PIL import Image

RACINE = os.getcwd()
SOURCE = os.path.join(tempfile.gettempdir(), "compyo-guide-png")
CIBLE = os.path.join(RACINE, "public", "guide")
captures = json.load(open(os.path.join(RACINE, "lib", "guide", "captures.json"), encoding="utf-8"))

attendus = set()
for ident, appareils in captures.items():
    for appareil in appareils:
        for suffixe in ("", "-clair"):
            nom = f"{ident}-{appareil}{suffixe}"
            attendus.add(nom + ".webp")
            png = os.path.join(SOURCE, nom + ".png")
            if not os.path.exists(png):
                print("manque", png)
                continue
            Image.open(png).convert("RGB").save(os.path.join(CIBLE, nom + ".webp"), "WEBP", quality=82, method=6)

for f in os.listdir(CIBLE):
    if f.endswith(".webp") and f not in attendus:
        os.remove(os.path.join(CIBLE, f))
        print("retiré", f)
total = sum(os.path.getsize(os.path.join(CIBLE, f)) for f in os.listdir(CIBLE))
print(len(attendus), "images,", round(total / 1024), "Ko")
