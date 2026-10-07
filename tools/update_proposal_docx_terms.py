from __future__ import annotations

import re
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


SOURCE = Path(r"C:\Users\devan\Documents\MAGANG_PKL\Doc Absensi Golan\Dokumen Proposal Golan Absen.docx")
NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = "{" + NS + "}"


REPLACEMENTS = {
    "Laporan kerja dan logbook magang perlu dikelola secara terstruktur agar kepatuhan dan proses review dapat dipantau.":
        "Laporan kerja karyawan dan peserta magang perlu dikelola secara terstruktur agar kepatuhan dan proses review dapat dipantau.",
    "Mendukung pengelolaan laporan kerja harian dan logbook peserta magang secara terstruktur.":
        "Mendukung pengelolaan laporan kerja karyawan dan peserta magang secara terstruktur.",
    "Karyawan dan peserta magang dapat membuat laporan kerja atau logbook secara digital.":
        "Karyawan dan peserta magang dapat membuat laporan kerja secara digital.",
    "Pengelolaan peserta magang lebih terintegrasi:Peserta magang dapat mengelola absensi, laporan kerja, logbook, dokumen, informasi mentor, statistik, dan sertifikat melalui sistem yang sama.":
        "Pengelolaan peserta magang lebih terintegrasi:Peserta magang dapat mengelola absensi, laporan kerja, dokumen, informasi mentor, statistik, dan sertifikat melalui sistem yang sama.",
    "Pemantauan progres magang lebih mudah:Data logbook dan statistik membantu peserta, mentor, Manajer, serta HRD melihat perkembangan kegiatan selama periode magang.":
        "Pemantauan progres magang lebih mudah:Data laporan kerja dan statistik membantu peserta, mentor, Manajer, serta HRD melihat perkembangan kegiatan selama periode magang.",
    "Review logbook lebih terdokumentasi:Mentor atau Manajer dapat menyetujui logbook maupun memberikan catatan perbaikan secara terstruktur.":
        "Review laporan kerja lebih terdokumentasi:Mentor atau Manajer dapat menyetujui laporan kerja maupun memberikan catatan perbaikan secara terstruktur.",
    "6.5.2 Laporan kerja dan logbook": "6.5.2 Laporan kerja",
    "6.4.2 Logbook magang": "6.4.2 Laporan kerja peserta magang",
    "Logbook Magang": "Laporan Kerja Peserta Magang",
}


def replace_terms(value: str) -> str:
    for source, target in REPLACEMENTS.items():
        value = value.replace(source, target)
    value = re.sub(r"(?i)\blogbook\b", lambda match: "Laporan Kerja" if match.group(0)[0].isupper() else "laporan kerja", value)
    value = re.sub(r"laporan kerja,\s+laporan kerja", "laporan kerja", value, flags=re.IGNORECASE)
    value = re.sub(r"laporan kerja dan laporan kerja", "laporan kerja karyawan dan peserta magang", value, flags=re.IGNORECASE)
    value = value.replace("laporan kerja atau laporan kerja", "laporan kerja")
    return value


def rewrite_document_xml(xml: bytes) -> tuple[bytes, int]:
    root = ET.fromstring(xml)
    changed = 0
    for paragraph in root.iter(W + "p"):
        text_nodes = [node for node in paragraph.iter(W + "t")]
        original = "".join(node.text or "" for node in text_nodes)
        updated = replace_terms(original)
        if updated == original or not text_nodes:
            continue
        text_nodes[0].text = updated
        for node in text_nodes[1:]:
            node.text = ""
        changed += 1
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), changed


def main() -> None:
    with zipfile.ZipFile(SOURCE, "r") as source_zip:
        entries = {info.filename: source_zip.read(info.filename) for info in source_zip.infolist()}

    changed_paragraphs = 0
    for name, content in list(entries.items()):
        if name.startswith("word/") and name.endswith(".xml"):
            entries[name], changed = rewrite_document_xml(content)
            changed_paragraphs += changed

    leftovers = [
        name for name, content in entries.items()
        if name.startswith("word/") and name.endswith(".xml") and re.search(rb"log\s*-?\s*book", content, re.IGNORECASE)
    ]
    if leftovers:
        raise RuntimeError(f"Logbook references remain in: {', '.join(leftovers)}")

    with tempfile.NamedTemporaryFile(prefix="golan-proposal-", suffix=".docx", dir=SOURCE.parent, delete=False) as handle:
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
