import json
import re
from pathlib import Path

import pdfplumber


PDF_PATH = Path("docs/manual.pdf")
OUT_PATH = Path("data/manual_index.json")

ALIASES = {
    "保養": ["maintenance", "service", "inspection", "replace", "schedule"],
    "油品": ["oil", "fluid", "lubricant"],
    "機油": ["engine oil", "oil filter"],
    "變速箱油": ["transmission oil", "manual transmission oil", "gear oil"],
    "差速器": ["differential", "final gear"],
    "分動箱": ["transfer", "transfer case"],
    "扭力": ["torque", "tightening"],
    "煞車": ["brake", "braking", "brake fluid", "brake pedal"],
    "剎車": ["brake", "braking", "brake fluid", "brake pedal"],
    "冷卻": ["coolant", "cooling", "radiator"],
    "水箱": ["radiator", "coolant"],
    "水溫": ["engine coolant temperature", "temperature gauge", "overheat"],
    "過熱": ["overheat", "engine overheating", "coolant"],
    "電瓶": ["battery", "jump-start", "charging"],
    "保險絲": ["fuse", "fuses", "fuse box"],
    "輪胎": ["tire", "tyre", "tire pressure", "wheel"],
    "胎壓": ["tire pressure", "tyre pressure"],
    "雨刷": ["wiper", "washer"],
    "燈": ["light", "lamp", "headlight", "bulb"],
    "頭燈": ["headlight", "headlamp"],
    "引擎": ["engine"],
    "火星塞": ["spark plug"],
    "皮帶": ["belt", "drive belt"],
    "空調": ["air conditioning", "heater", "defroster"],
    "冷氣": ["air conditioning", "A/C"],
    "故障燈": ["malfunction indicator", "warning light"],
    "警示燈": ["warning light", "indicator light"],
    "OBD": ["diagnostic", "diagnostic connector", "DTC"],
    "診斷": ["diagnostic", "inspection", "troubleshooting"],
    "四輪傳動": ["4WD", "four-wheel drive", "transfer lever"],
    "四驅": ["4WD", "four-wheel drive", "transfer lever"],
    "雨天": ["rain", "wet"],
    "拖吊": ["towing", "tow"],
}


def normalize(text):
    return re.sub(r"\s+", " ", text or "").strip()


def guess_title(text, page_number):
    lines = [normalize(line) for line in (text or "").splitlines()]
    lines = [line for line in lines if len(line) >= 4]
    for line in lines[:8]:
        if len(line) <= 90 and not line.lower().startswith(("warning", "notice", "caution")):
            return line
    return f"Manual page {page_number}"


def matched_aliases(text):
    haystack = text.lower()
    matches = []
    for zh, terms in ALIASES.items():
        if zh.lower() in haystack or any(term.lower() in haystack for term in terms):
            matches.append(zh)
    return matches


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"Missing PDF: {PDF_PATH}")

    pages = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            raw_text = page.extract_text() or ""
            text = normalize(raw_text)
            if not text:
                continue

            pages.append(
                {
                    "page": index,
                    "title": guess_title(raw_text, index),
                    "text": text,
                    "zh_keywords": matched_aliases(text),
                }
            )

    OUT_PATH.write_text(
        json.dumps(
            {
                "schema_version": "1.0.0",
                "source_pdf": "docs/manual.pdf",
                "page_count": len(pages),
                "aliases": ALIASES,
                "pages": pages,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {OUT_PATH} with {len(pages)} searchable pages")


if __name__ == "__main__":
    main()
