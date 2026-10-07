from __future__ import annotations

import re
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


SOURCE = Path(r"C:\Users\devan\Documents\MAGANG_PKL\Doc Absensi Golan\Dokumen Panduan Penggunaan Golan Absen.docx")
NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = "{" + NS + "}"


def replace_term(value: str) -> str:
    value = re.sub(r"(?i)\blogbook\b", lambda match: "Laporan Kerja" if match.group(0)[0].isupper() else "laporan kerja", value)
    return value


def rewrite_document_xml(xml: bytes) -> tuple[bytes, int]:
    root = ET.fromstring(xml)
    changed = 0
    for paragraph in root.iter(W + "p"):
        text_nodes = [node for node in paragraph.iter(W + "t")]
        original = "".join(node.text or "" for node in text_nodes)
        updated = replace_term(original)
        if updated == original or not text_nodes:
            continue
        text_nodes[0].text = updated
        for node in text_nodes[1:]:
            node.text = ""
        changed += 1
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), changed


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    with zipfile.ZipFile(SOURCE, "r") as source_zip:
        entries = {info.filename: source_zip.read(info.filename) for info in source_zip.infolist()}

    changed_paragraphs = 0
    for name, content in list(entries.items()):
        if name.startswith("word/") and name.endswith(".xml"):
            entries[name], changed = rewrite_document_xml(content)
            changed_paragraphs += changed

    leftovers = []
    for name, content in entries.items():
        if name.startswith("word/") and name.endswith(".xml") and re.search(rb"log\s*-?\s*book", content, re.IGNORECASE):
            leftovers.append(name)
    if leftovers:
        raise RuntimeError(f"Logbook references remain in: {', '.join(leftovers)}")

    with tempfile.NamedTemporaryFile(prefix="golan-panduan-", suffix=".docx", dir=SOURCE.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary, "w") as output_zip:
            for name, content in entries.items():
                output_zip.writestr(name, content)
        temporary.replace(SOURCE)
    finally:
        temporary.unlink(missing_ok=True)

    print(f"Updated {SOURCE} ({changed_paragraphs} paragraphs)")


if __name__ == "__main__":
    main()
