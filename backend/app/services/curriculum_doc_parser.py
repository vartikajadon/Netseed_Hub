import io
import re
import zipfile
from typing import List, Dict, Any, Optional, Tuple

try:
    import docx
    from docx.opc.exceptions import PackageNotFoundError
except ImportError:
    docx = None
    PackageNotFoundError = Exception


def clean_text(text: str) -> str:
    """Removes irregular whitespace, non-printable characters, and trim."""
    if not text:
        return ""
    # Replace non-breaking spaces and irregular whitespace
    cleaned = text.replace("\xa0", " ").replace("\r", " ")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    return cleaned.strip()


def is_module_header(text: str) -> Tuple[bool, Optional[str]]:
    """
    Checks if a given string represents a Module/Unit/Chapter/Phase/Week header.
    Returns (is_module, cleaned_module_name).
    """
    text = clean_text(text)
    if not text:
        return False, None

    # Matches: Module 1, Module 1: Title, Module - Title, Unit 1, Chapter 2, Week 3, Part A, etc.
    module_regex = re.compile(
        r"^(module|unit|chapter|section|part|week|phase|milestone|block)\s*(\d+|[ivxlcdm]+|[a-z])?[\s:\-\.–—]*(.*)$",
        re.IGNORECASE
    )
    match = module_regex.match(text)
    if match:
        prefix = match.group(1).capitalize()
        num = match.group(2) or ""
        rest = clean_text(match.group(3) or "")

        if num and rest:
            return True, f"{prefix} {num}: {rest}"
        elif num:
            return True, f"{prefix} {num}"
        elif rest:
            return True, f"{prefix}: {rest}"
        return True, text

    return False, None


def split_topic_title_and_desc(raw_line: str) -> Tuple[str, str]:
    """
    Splits a topic string into a title and description.
    Examples:
    - 'HTML5 Basics - Semantic tags and markup' -> ('HTML5 Basics', 'Semantic tags and markup')
    - '1. React Hooks: useState and useEffect in depth' -> ('React Hooks', 'useState and useEffect in depth')
    """
    text = clean_text(raw_line)
    # Strip leading bullet or number e.g. "1.", "1.1", "a)", "*", "-", "•"
    text = re.sub(r"^(\d+[\.\)]|\d+\.\d+[\.\)]?|[a-zA-Z][\.\)]|[\*\-–—•])\s*", "", text).strip()

    # Look for common delimiters separating title and description: " - ", " : ", " — ", " | "
    for sep in [" - ", " – ", " — ", ": ", " | "]:
        if sep in text:
            parts = text.split(sep, 1)
            title = clean_text(parts[0])
            desc = clean_text(parts[1])
            if len(title) > 2:
                return title, desc

    return text, ""


def extract_from_docx_tables(doc) -> List[Dict[str, Any]]:
    """Extracts curriculum topics from Word tables if present."""
    topics: List[Dict[str, Any]] = []
    current_module = "Module 1: General Curriculum"
    order_counter = 1

    for table in doc.tables:
        if not table.rows:
            continue

        # Look for headers in first 2 rows
        headers = []
        header_row_idx = -1

        for r_idx in range(min(2, len(table.rows))):
            row_cells = [clean_text(cell.text).lower() for cell in table.rows[r_idx].cells]
            has_topic_col = any("topic" in c or "title" in c or "subject" in c or "concept" in c or "content" in c or "lesson" in c for c in row_cells)
            if has_topic_col:
                headers = row_cells
                header_row_idx = r_idx
                break

        # Map column indices
        mod_idx = -1
        title_idx = -1
        desc_idx = -1
        order_idx = -1

        if header_row_idx != -1:
            for idx, h in enumerate(headers):
                if any(k in h for k in ["module", "unit", "domain", "track", "section"]):
                    if mod_idx == -1: mod_idx = idx
                elif any(k in h for k in ["topic", "title", "subject", "concept", "lesson", "agenda"]):
                    if title_idx == -1: title_idx = idx
                elif any(k in h for k in ["desc", "detail", "objective", "outcome", "syllabus", "content", "practical"]):
                    if desc_idx == -1: desc_idx = idx
                elif any(k in h for k in ["s.no", "sr", "#", "order", "no"]):
                    if order_idx == -1: order_idx = idx

        start_row = header_row_idx + 1 if header_row_idx != -1 else 0

        # If no explicit header matched, infer based on column count
        first_row_cells = table.rows[0].cells if table.rows else []
        col_count = len(first_row_cells)

        if title_idx == -1:
            if col_count == 1:
                title_idx = 0
            elif col_count == 2:
                title_idx = 0
                desc_idx = 1
            elif col_count >= 3:
                mod_idx = 0
                title_idx = 1
                desc_idx = 2

        for row in table.rows[start_row:]:
            cells = [clean_text(cell.text) for cell in row.cells]
            if not any(cells):
                continue

            # Check if this row is a spanning module header (e.g. all cells identical or only first cell has text)
            non_empty_cells = [c for c in cells if c]
            if len(non_empty_cells) == 1:
                is_mod, mod_name = is_module_header(non_empty_cells[0])
                if is_mod and mod_name:
                    current_module = mod_name
                    continue
                elif len(non_empty_cells[0]) < 80:
                    current_module = non_empty_cells[0]
                    continue

            # Read module from row if present
            if mod_idx != -1 and mod_idx < len(cells) and cells[mod_idx]:
                is_mod, mod_name = is_module_header(cells[mod_idx])
                current_module = mod_name if is_mod and mod_name else cells[mod_idx]

            title_val = cells[title_idx] if title_idx != -1 and title_idx < len(cells) else ""
            desc_val = cells[desc_idx] if desc_idx != -1 and desc_idx < len(cells) else ""

            # Check if title itself is a module header
            is_mod, mod_name = is_module_header(title_val)
            if is_mod and mod_name and not desc_val:
                current_module = mod_name
                continue

            if not title_val and desc_val:
                title_val, desc_val = split_topic_title_and_desc(desc_val)

            if title_val:
                # If title contains both title and description
                if not desc_val and (" - " in title_val or ": " in title_val or " — " in title_val):
                    t_clean, d_clean = split_topic_title_and_desc(title_val)
                    if d_clean:
                        title_val, desc_val = t_clean, d_clean

                topics.append({
                    "module_name": current_module,
                    "title": title_val,
                    "description": desc_val or None,
                    "order_index": order_counter
                })
                order_counter += 1

    return topics


def extract_from_docx_paragraphs(doc) -> List[Dict[str, Any]]:
    """Extracts curriculum topics from Word paragraphs, headings, and bullet points."""
    topics: List[Dict[str, Any]] = []
    current_module = "Module 1: General Overview"
    order_counter = 1

    for p in doc.paragraphs:
        raw_text = clean_text(p.text)
        if not raw_text:
            continue

        style_name = p.style.name.lower() if p.style else ""
        is_heading = "heading" in style_name or "title" in style_name

        # Check for module header
        is_mod, mod_name = is_module_header(raw_text)
        if is_mod and mod_name:
            current_module = mod_name
            continue
        elif is_heading and len(raw_text) < 100 and not re.match(r"^\d+[\.\)]", raw_text):
            # A heading paragraph that isn't a numbered item is likely a module
            current_module = raw_text
            continue

        # Check for topic indicator (numbered, bullet, or colon)
        is_bullet = (
            "list" in style_name or
            "bullet" in style_name or
            bool(re.match(r"^(\d+[\.\)]|\d+\.\d+[\.\)]?|[a-zA-Z][\.\)]|[\*\-–—•])\s+", raw_text)) or
            bool(re.match(r"^(topic|lesson|chapter)\s*[\d:]*", raw_text, re.IGNORECASE))
        )

        # Check for bold title run in paragraph
        bold_prefix = ""
        normal_suffix = ""
        if p.runs and len(p.runs) > 1 and p.runs[0].bold and not all(r.bold for r in p.runs):
            bold_prefix = clean_text(p.runs[0].text)
            normal_suffix = clean_text(" ".join(r.text for r in p.runs[1:]))

        if bold_prefix and len(bold_prefix) > 2 and len(bold_prefix) < 120:
            title = bold_prefix.rstrip(":-–— ")
            desc = normal_suffix
            topics.append({
                "module_name": current_module,
                "title": title,
                "description": desc or None,
                "order_index": order_counter
            })
            order_counter += 1
        elif is_bullet:
            title, desc = split_topic_title_and_desc(raw_text)
            if title:
                topics.append({
                    "module_name": current_module,
                    "title": title,
                    "description": desc or None,
                    "order_index": order_counter
                })
                order_counter += 1
        else:
            # Paragraph with "Topic: ..." or " - "
            if " - " in raw_text or ": " in raw_text or " — " in raw_text:
                title, desc = split_topic_title_and_desc(raw_text)
                if title and len(title) < 120 and desc:
                    topics.append({
                        "module_name": current_module,
                        "title": title,
                        "description": desc or None,
                        "order_index": order_counter
                    })
                    order_counter += 1

    return topics


def extract_from_binary_doc(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Fallback parser for legacy Word .doc binary files.
    Extracts text streams and parses line by line.
    """
    topics: List[Dict[str, Any]] = []
    # Extract sequences of printable ASCII / UTF-8 characters
    # Look for strings of length >= 4
    text_chunks = re.findall(rb"[\x20-\x7E\t\r\n]{4,}", file_bytes)
    extracted_lines = []
    for chunk in text_chunks:
        try:
            decoded = chunk.decode("utf-8", errors="ignore")
            for line in decoded.splitlines():
                cl = clean_text(line)
                if len(cl) > 3:
                    extracted_lines.append(cl)
        except Exception:
            pass

    current_module = "Module 1: General Curriculum"
    order_counter = 1

    for line in extracted_lines:
        is_mod, mod_name = is_module_header(line)
        if is_mod and mod_name:
            current_module = mod_name
            continue

        if re.match(r"^(\d+[\.\)]|\d+\.\d+[\.\)]?|[a-zA-Z][\.\)]|[\*\-–—•])\s+", line) or " - " in line or ": " in line:
            title, desc = split_topic_title_and_desc(line)
            if title and len(title) > 2:
                topics.append({
                    "module_name": current_module,
                    "title": title,
                    "description": desc or None,
                    "order_index": order_counter
                })
                order_counter += 1

    return topics


def parse_curriculum_doc(file_bytes: bytes, filename: str = "") -> List[Dict[str, Any]]:
    """
    High-level entrypoint to accurately parse curriculum from Word Document (.docx or .doc).
    """
    if not file_bytes:
        raise ValueError("Provided document file is empty.")

    # 1. Attempt docx parsing
    if docx:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))

            # First priority: Tables (most common for syllabus tables)
            table_topics = extract_from_docx_tables(doc)
            if table_topics and len(table_topics) >= 2:
                return table_topics

            # Second priority: Paragraphs & Headings
            para_topics = extract_from_docx_paragraphs(doc)
            if para_topics:
                # Combine or return paragraph topics
                if table_topics:
                    # Merge unique
                    return table_topics + para_topics
                return para_topics

            if table_topics:
                return table_topics

        except (PackageNotFoundError, zipfile.BadZipFile, Exception):
            # Not a valid docx zip package, might be legacy binary .doc
            pass

    # 2. Fallback to binary/text parsing for legacy .doc
    fallback_topics = extract_from_binary_doc(file_bytes)
    if fallback_topics:
        return fallback_topics

    # If completely unparsed, raise helpful error
    raise ValueError(
        "Could not detect structured curriculum modules or topics from this document. "
        "Please ensure the Word document contains modules/units and topics formatted as headings, bullet lists, or tables."
    )
