from __future__ import annotations

import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


SOURCE = Path(r"C:\Users\devan\Documents\MAGANG_PKL\Doc Absensi Golan\Dokumen Alur Sistem Golan Absen - Revisi Laporan Kerja.docx")
OUTPUT = SOURCE.with_suffix(".md")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{" + NS["w"] + "}"


def text_of(element: ET.Element) -> str:
    parts: list[str] = []
    for node in element.iter():
        if node.tag == W + "t":
            parts.append(node.text or "")
        elif node.tag in (W + "br", W + "cr"):
            parts.append("\n")
        elif node.tag == W + "tab":
            parts.append("\t")
    return "".join(parts)


def paragraph_text(paragraph: ET.Element) -> str:
    return text_of(paragraph).strip()


def numbering_formats(numbering_root: ET.Element) -> dict[str, str]:
    abstract_formats: dict[str, str] = {}
    for abstract in numbering_root.findall("w:abstractNum", NS):
        abstract_id = abstract.get(W + "abstractNumId", "")
        level = abstract.find("w:lvl", NS)
        fmt = level.find("w:numFmt", NS) if level is not None else None
        abstract_formats[abstract_id] = fmt.get(W + "val", "bullet") if fmt is not None else "bullet"

    formats: dict[str, str] = {}
    for num in numbering_root.findall("w:num", NS):
        num_id = num.get(W + "numId", "")
        abstract_id = num.find("w:abstractNumId", NS)
        if abstract_id is not None:
            formats[num_id] = abstract_formats.get(abstract_id.get(W + "val", ""), "bullet")
    return formats


def heading_level(text: str) -> int | None:
    if text in {"DOKUMEN ALUR SISTEM", "INFORMASI ABSENSI GOLAN"}:
        return 1 if text == "DOKUMEN ALUR SISTEM" else 2
    if re.match(r"^\d+\.\s+\d+\s", text):
        return 2
    if re.match(r"^\d+\.\d+\.\d+\s", text):
        return 3
    if re.match(r"^\d+\.\d+\s", text):
        return 2
    if re.match(r"^\d+\.\s+", text):
        return 1
    return None


def markdown_table(table: ET.Element) -> list[str]:
    rows: list[list[str]] = []
    for row in table.findall("w:tr", NS):
        cells: list[str] = []
        for cell in row.findall("w:tc", NS):
            paragraphs = [paragraph_text(p) for p in cell.findall("w:p", NS)]
            paragraphs = [p for p in paragraphs if p]
            value = "<br>".join(paragraphs).replace("|", r"\|")
            cells.append(value)
        if cells:
            rows.append(cells)

    if not rows:
        return []
    width = max(len(row) for row in rows)
    rows = [row + [""] * (width - len(row)) for row in rows]
    output = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join("---" for _ in range(width)) + " |"]
    output.extend("| " + " | ".join(row) + " |" for row in rows[1:])
    return output


def main() -> None:
    with zipfile.ZipFile(SOURCE, "r") as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        numbering = ET.fromstring(archive.read("word/numbering.xml"))

    formats = numbering_formats(numbering)
    body = document.find("w:body", NS)
    if body is None:
        raise RuntimeError("DOCX body was not found")

    blocks: list[str] = []
    for child in list(body):
        if child.tag == W + "p":
            text = paragraph_text(child)
            if not text:
                continue

            level = heading_level(text)
            if level is not None:
                blocks.append("#" * level + " " + text)
                continue

            ppr = child.find("w:pPr", NS)
            num_pr = ppr.find("w:numPr", NS) if ppr is not None else None
            if num_pr is not None:
                ilvl = num_pr.find("w:ilvl", NS)
                num_id = num_pr.find("w:numId", NS)
                indent = int(ilvl.get(W + "val", "0")) if ilvl is not None else 0
                fmt = formats.get(num_id.get(W + "val", "") if num_id is not None else "", "bullet")
                marker = "1." if fmt in {"decimal", "lowerLetter", "upperLetter"} else "-"
                blocks.append("  " * indent + marker + " " + text)
            else:
                blocks.append(text)
        elif child.tag == W + "tbl":
            table = markdown_table(child)
            if table:
                blocks.append("\n".join(table))

    markdown = "\n\n".join(blocks).rstrip() + "\n"
    if re.search(r"log\s*-?\s*book", markdown, re.IGNORECASE):
        raise RuntimeError("The Markdown output still contains a logbook reference")
    OUTPUT.write_text(markdown, encoding="utf-8", newline="\n")
    print(OUTPUT)


if __name__ == "__main__":
    main()
