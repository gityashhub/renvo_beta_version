import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
import numpy as np
import json
import math
import io
from datetime import datetime

from backend.deps import get_session_dep

router = APIRouter()


def _make_safe(obj):
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _make_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_make_safe(v) for v in obj]
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (np.ndarray,)):
        return [_make_safe(x) for x in obj.tolist()]
    if isinstance(obj, (pd.Timestamp,)):
        return str(obj)
    if isinstance(obj, set):
        return list(obj)
    return obj


def _generate_executive_summary(df: pd.DataFrame, cleaning_history: dict, analysis_results: dict) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_ops = sum(len(ops) for ops in cleaning_history.values())
    cols_cleaned = len(cleaning_history)
    total_missing = int(df.isnull().sum().sum())
    total_cells = len(df) * len(df.columns)
    missing_pct = round(100 * total_missing / total_cells, 2) if total_cells else 0
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    text_cols = df.select_dtypes(include="object").columns.tolist()

    lines = [
        "EXECUTIVE SUMMARY — Data Cleaning Report",
        "=" * 60,
        f"Generated: {now}",
        "",
        "DATASET OVERVIEW",
        "-" * 40,
        f"  Total rows          : {len(df):,}",
        f"  Total columns       : {len(df.columns)}",
        f"  Numeric columns     : {len(numeric_cols)}",
        f"  Text columns        : {len(text_cols)}",
        f"  Missing values      : {total_missing:,} ({missing_pct}%)",
        f"  Memory usage        : {round(df.memory_usage(deep=True).sum() / 1024**2, 2)} MB",
        "",
        "CLEANING SUMMARY",
        "-" * 40,
        f"  Columns cleaned     : {cols_cleaned}",
        f"  Total operations    : {total_ops}",
    ]

    if cleaning_history:
        lines.append("")
        lines.append("  Operations per column:")
        for col, ops in cleaning_history.items():
            lines.append(f"    • {col}: {len(ops)} operation(s)")

    lines += [
        "",
        "DATA QUALITY SNAPSHOT",
        "-" * 40,
    ]

    for col in df.columns[:25]:
        n_miss = int(df[col].isnull().sum())
        pct = round(100 * n_miss / len(df), 1) if len(df) else 0
        cleaned = "✓" if col in cleaning_history else " "
        lines.append(f"  [{cleaned}] {col:<30}  missing: {n_miss:>6} ({pct}%)")

    if len(df.columns) > 25:
        lines.append(f"  ... and {len(df.columns) - 25} more columns")

    lines += ["", "END OF EXECUTIVE SUMMARY"]
    return "\n".join(lines)


def _generate_audit_trail(cleaning_history: dict) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "AUDIT TRAIL — Cleaning Operations Log",
        "=" * 60,
        f"Generated: {now}",
        "",
    ]

    all_ops = []
    for col, ops in cleaning_history.items():
        for op in ops:
            all_ops.append({**op, "_column": col})

    all_ops.sort(key=lambda x: x.get("timestamp", ""))

    if not all_ops:
        lines.append("  No cleaning operations recorded yet.")
        lines.append("  Apply cleaning methods in the Cleaning Wizard to build this log.")
    else:
        lines.append(f"  Total operations: {len(all_ops)}")
        lines.append("")
        for i, op in enumerate(all_ops, 1):
            ts = op.get("timestamp", "—")
            method = op.get("method_name", op.get("method", "Unknown"))
            col = op.get("_column", "?")
            affected = op.get("rows_affected", "?")
            params = {k: v for k, v in op.items()
                      if k not in ("timestamp", "method_name", "method", "_column", "rows_affected")}
            lines.append(f"  #{i:03d}  [{ts}]")
            lines.append(f"       Column  : {col}")
            lines.append(f"       Method  : {method}")
            lines.append(f"       Rows    : {affected}")
            if params:
                lines.append(f"       Params  : {json.dumps(params)}")
            lines.append("")

    lines.append("END OF AUDIT TRAIL")
    return "\n".join(lines)


def _generate_methodology(cleaning_history: dict) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    descriptions = {
        "mean_imputation": "Replace missing values with the column arithmetic mean (numeric only).",
        "median_imputation": "Replace missing values with the column median — robust to skewness.",
        "mode_imputation": "Replace missing values with the most frequent value.",
        "forward_fill": "Propagate the last valid observation forward.",
        "backward_fill": "Use the next valid observation to fill backward.",
        "knn_imputation": "K-Nearest Neighbours imputation; infers missing values from similar rows.",
        "interpolation": "Estimate missing values by interpolating between known data points.",
        "missing_category": "Treat missingness as an informative 'Missing' category.",
        "regression_imputation": "Predict missing values using a linear regression model.",
        "iqr_removal": "Remove values outside [Q1 − k·IQR, Q3 + k·IQR] — standard outlier fence.",
        "zscore_removal": "Remove values where |z-score| exceeds the threshold.",
        "winsorization": "Cap extreme values at specified percentiles rather than removing them.",
        "log_transformation": "Apply log(x+1) to compress skewed distributions.",
        "cap_outliers": "Cap outlier values at IQR or percentile bounds instead of deletion.",
        "isolation_forest": "ML-based outlier detection using random partition trees.",
        "trim_whitespace": "Strip leading and trailing whitespace from text fields.",
        "standardize_case": "Normalize text to a consistent case (lower / upper / title).",
        "remove_duplicates": "Delete duplicate rows based on selected column values.",
    }

    methods_used: dict = {}
    for col, ops in cleaning_history.items():
        for op in ops:
            m = op.get("method_name", op.get("method", "unknown"))
            methods_used.setdefault(m, []).append(col)

    lines = [
        "METHODOLOGY REPORT",
        "=" * 60,
        f"Generated: {now}",
        "",
        f"Methods applied: {len(methods_used)}",
        "",
    ]

    if methods_used:
        for method, cols in methods_used.items():
            desc = descriptions.get(method, "Custom or unlisted method.")
            lines.append(f"  {method}")
            lines.append(f"    Description : {desc}")
            lines.append(f"    Applied to  : {', '.join(cols)}")
            lines.append("")
    else:
        lines.append("  No methods recorded yet.")
        lines.append("  Apply cleaning operations in the Cleaning Wizard first.")

    lines.append("END OF METHODOLOGY REPORT")
    return "\n".join(lines)


def _generate_pdf_report(df: pd.DataFrame, cleaning_history: dict, analysis_results: dict) -> bytes:
    """Generate a professional PDF report using ReportLab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, mm
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, PageBreak, KeepTogether
    )
    from reportlab.platypus import ListFlowable, ListItem

    now = datetime.now()
    now_str = now.strftime("%B %d, %Y at %H:%M")
    date_str = now.strftime("%Y-%m-%d")

    # ── Colour palette ────────────────────────────────────────────────────────
    BRAND_BLUE  = colors.HexColor("#2563EB")
    DARK_NAVY   = colors.HexColor("#0F172A")
    SLATE_700   = colors.HexColor("#334155")
    SLATE_500   = colors.HexColor("#64748B")
    SLATE_200   = colors.HexColor("#E2E8F0")
    SLATE_50    = colors.HexColor("#F8FAFC")
    EMERALD     = colors.HexColor("#059669")
    AMBER       = colors.HexColor("#D97706")
    RED_600     = colors.HexColor("#DC2626")
    WHITE       = colors.white

    buf = io.BytesIO()
    PAGE_W, PAGE_H = A4

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2*cm,
        title="Renvo AI — Data Cleaning Report",
        author="Renvo AI",
    )

    styles = getSampleStyleSheet()

    def style(name, **kw):
        kw.setdefault('parent', styles["Normal"])
        s = ParagraphStyle(name, **kw)
        return s

    H1 = style("H1", fontSize=22, textColor=WHITE, fontName="Helvetica-Bold",
                spaceAfter=4, spaceBefore=0, alignment=TA_LEFT)
    H2 = style("H2", fontSize=14, textColor=DARK_NAVY, fontName="Helvetica-Bold",
                spaceAfter=6, spaceBefore=12)
    H3 = style("H3", fontSize=11, textColor=BRAND_BLUE, fontName="Helvetica-Bold",
                spaceAfter=4, spaceBefore=6)
    BODY = style("Body", fontSize=9, textColor=SLATE_700, leading=14,
                 spaceAfter=4)
    BODY_SM = style("BodySm", fontSize=8, textColor=SLATE_500, leading=12)
    CAPTION = style("Caption", fontSize=8, textColor=SLATE_500, fontName="Helvetica-Oblique",
                    spaceAfter=2)
    METRIC_VAL = style("MetricVal", fontSize=18, textColor=BRAND_BLUE, fontName="Helvetica-Bold",
                        alignment=TA_CENTER, spaceAfter=2)
    METRIC_LBL = style("MetricLbl", fontSize=8, textColor=SLATE_500, fontName="Helvetica",
                        alignment=TA_CENTER)
    TH = style("TH", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold",
               alignment=TA_CENTER)
    TD = style("TD", fontSize=8, textColor=SLATE_700, alignment=TA_LEFT, leading=11)

    story = []

    # ── Cover page ────────────────────────────────────────────────────────────
    # Blue banner
    banner_data = [[Paragraph("Renvo AI", H1),
                    Paragraph("Data Cleaning Report", style("Sub", fontSize=12, textColor=WHITE,
                              fontName="Helvetica", parent=styles["Normal"]))]]
    banner_table = Table(banner_data, colWidths=[PAGE_W - 4*cm])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BRAND_BLUE),
        ("TOPPADDING",    (0,0), (-1,-1), 20),
        ("BOTTOMPADDING", (0,0), (-1,-1), 20),
        ("LEFTPADDING",   (0,0), (-1,-1), 20),
        ("RIGHTPADDING",  (0,0), (-1,-1), 20),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"Generated: {now_str}", CAPTION))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE_200, spaceAfter=8))

    # ── Dataset metrics cards ─────────────────────────────────────────────────
    total_rows = len(df)
    total_cols = len(df.columns)
    total_missing = int(df.isnull().sum().sum())
    total_cells = total_rows * total_cols
    completeness = round(100 * (1 - total_missing / total_cells), 1) if total_cells else 100.0
    memory_mb = round(df.memory_usage(deep=True).sum() / 1024**2, 2)
    total_ops = sum(len(ops) for ops in cleaning_history.values())

    def metric_cell(val, lbl):
        return [Paragraph(str(val), METRIC_VAL), Paragraph(lbl, METRIC_LBL)]

    metrics_data = [
        metric_cell(f"{total_rows:,}", "Rows"),
        metric_cell(str(total_cols), "Columns"),
        metric_cell(f"{total_missing:,}", "Missing Values"),
        metric_cell(f"{completeness}%", "Completeness"),
        metric_cell(f"{memory_mb} MB", "Memory"),
        metric_cell(str(total_ops), "Ops Applied"),
    ]

    metrics_table = Table([metrics_data], colWidths=[(PAGE_W - 4*cm) / 6] * 6)
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), SLATE_50),
        ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
        ("INNERGRID",     (0,0), (-1,-1), 0.5, SLATE_200),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 0.6*cm))

    # ── Section 1: Dataset Overview ───────────────────────────────────────────
    story.append(Paragraph("1. Dataset Overview", H2))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE_200, spaceAfter=6))

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    text_cols    = df.select_dtypes(include="object").columns.tolist()
    dt_cols      = df.select_dtypes(include="datetime").columns.tolist()

    overview_data = [
        [Paragraph("Property", TH), Paragraph("Value", TH)],
        [Paragraph("Total rows", TD), Paragraph(f"{total_rows:,}", TD)],
        [Paragraph("Total columns", TD), Paragraph(str(total_cols), TD)],
        [Paragraph("Numeric columns", TD), Paragraph(str(len(numeric_cols)), TD)],
        [Paragraph("Text columns", TD), Paragraph(str(len(text_cols)), TD)],
        [Paragraph("Datetime columns", TD), Paragraph(str(len(dt_cols)), TD)],
        [Paragraph("Total missing values", TD), Paragraph(f"{total_missing:,}", TD)],
        [Paragraph("Data completeness", TD), Paragraph(f"{completeness}%", TD)],
        [Paragraph("Memory usage", TD), Paragraph(f"{memory_mb} MB", TD)],
    ]
    ov_table = Table(overview_data, colWidths=[8*cm, (PAGE_W - 4*cm - 8*cm)])
    ov_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), BRAND_BLUE),
        ("BACKGROUND",    (0,1), (-1,-1), WHITE),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, SLATE_50]),
        ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
        ("INNERGRID",     (0,0), (-1,-1), 0.5, SLATE_200),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(ov_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Section 2: Data Quality per Column ───────────────────────────────────
    story.append(Paragraph("2. Column Quality Analysis", H2))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE_200, spaceAfter=6))
    story.append(Paragraph(
        "The table below shows missing value counts for each column. "
        "Columns marked ✓ have had at least one cleaning operation applied.",
        BODY))
    story.append(Spacer(1, 0.2*cm))

    col_header = [
        Paragraph("Column", TH),
        Paragraph("Type", TH),
        Paragraph("Non-null", TH),
        Paragraph("Missing", TH),
        Paragraph("Missing %", TH),
        Paragraph("Cleaned", TH),
    ]
    col_rows = [col_header]
    cw = (PAGE_W - 4*cm) / 6
    display_cols = list(df.columns[:40])
    for col in display_cols:
        n_miss = int(df[col].isnull().sum())
        pct = round(100 * n_miss / total_rows, 1) if total_rows else 0
        cleaned = "✓" if col in cleaning_history else "—"
        miss_color = RED_600 if pct > 20 else (AMBER if pct > 5 else SLATE_700)
        col_rows.append([
            Paragraph(str(col)[:28], TD),
            Paragraph(str(df[col].dtype), style("DtypeCell", parent=styles["Normal"],
                      fontSize=7, textColor=BRAND_BLUE)),
            Paragraph(f"{(total_rows - n_miss):,}", TD),
            Paragraph(f"{n_miss:,}", style("MissCell", parent=styles["Normal"],
                      fontSize=8, textColor=miss_color)),
            Paragraph(f"{pct}%", style("PctCell", parent=styles["Normal"],
                      fontSize=8, textColor=miss_color)),
            Paragraph(cleaned, style("CleanCell", parent=styles["Normal"],
                      fontSize=9, textColor=EMERALD if cleaned == "✓" else SLATE_500,
                      fontName="Helvetica-Bold" if cleaned == "✓" else "Helvetica")),
        ])
    if len(df.columns) > 40:
        col_rows.append([
            Paragraph(f"... and {len(df.columns)-40} more columns", BODY_SM),
            Paragraph("", BODY_SM), Paragraph("", BODY_SM),
            Paragraph("", BODY_SM), Paragraph("", BODY_SM), Paragraph("", BODY_SM),
        ])

    col_table = Table(col_rows, colWidths=[cw*2, cw*0.9, cw*0.9, cw*0.8, cw*0.8, cw*0.6])
    row_styles = [
        ("BACKGROUND",    (0,0), (-1,0), BRAND_BLUE),
        ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
        ("INNERGRID",     (0,0), (-1,-1), 0.25, SLATE_200),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]
    for i in range(1, len(col_rows)):
        bg = SLATE_50 if i % 2 == 0 else WHITE
        row_styles.append(("BACKGROUND", (0,i), (-1,i), bg))
    col_table.setStyle(TableStyle(row_styles))
    story.append(col_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Section 3: Cleaning History ───────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("3. Cleaning Operations Audit Trail", H2))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE_200, spaceAfter=6))

    all_ops = []
    for col, ops in cleaning_history.items():
        for op in ops:
            all_ops.append({**op, "_column": col})
    all_ops.sort(key=lambda x: x.get("timestamp", ""))

    if not all_ops:
        story.append(Paragraph(
            "No cleaning operations have been recorded yet. "
            "Apply cleaning methods in the Cleaning Wizard to populate this section.",
            BODY))
    else:
        story.append(Paragraph(f"Total operations recorded: {len(all_ops)}", BODY))
        story.append(Spacer(1, 0.2*cm))

        audit_header = [
            Paragraph("#", TH),
            Paragraph("Timestamp", TH),
            Paragraph("Column", TH),
            Paragraph("Method", TH),
            Paragraph("Rows Affected", TH),
        ]
        audit_rows = [audit_header]
        for i, op in enumerate(all_ops, 1):
            ts = op.get("timestamp", "—")
            method = op.get("method_name", op.get("method", "Unknown"))
            col = op.get("_column", "?")
            affected = op.get("rows_affected", "?")
            audit_rows.append([
                Paragraph(str(i), TD),
                Paragraph(str(ts)[:19], BODY_SM),
                Paragraph(str(col)[:25], TD),
                Paragraph(str(method), TD),
                Paragraph(str(affected), TD),
            ])

        aw = (PAGE_W - 4*cm)
        audit_table = Table(audit_rows, colWidths=[0.6*cm, 3.2*cm, 4*cm, 4.5*cm, 2.5*cm])
        a_styles = [
            ("BACKGROUND",    (0,0), (-1,0), BRAND_BLUE),
            ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
            ("INNERGRID",     (0,0), (-1,-1), 0.25, SLATE_200),
            ("TOPPADDING",    (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]
        for i in range(1, len(audit_rows)):
            bg = SLATE_50 if i % 2 == 0 else WHITE
            a_styles.append(("BACKGROUND", (0,i), (-1,i), bg))
        audit_table.setStyle(TableStyle(a_styles))
        story.append(audit_table)

    story.append(Spacer(1, 0.5*cm))

    # ── Section 4: Methodology ────────────────────────────────────────────────
    story.append(Paragraph("4. Methodology", H2))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE_200, spaceAfter=6))

    descriptions = {
        "mean_imputation":      "Replace missing values with the column arithmetic mean.",
        "median_imputation":    "Replace missing values with the column median — robust to skewness.",
        "mode_imputation":      "Replace missing values with the most frequent value.",
        "forward_fill":         "Propagate the last valid observation forward.",
        "backward_fill":        "Use the next valid observation to fill backward.",
        "knn_imputation":       "K-Nearest Neighbours imputation from similar rows.",
        "interpolation":        "Estimate missing values by interpolating between known data points.",
        "missing_category":     "Treat missingness as an informative 'Missing' category.",
        "regression_imputation":"Predict missing values using a linear regression model.",
        "iqr_removal":          "Remove values outside [Q1 − k·IQR, Q3 + k·IQR].",
        "zscore_removal":       "Remove values where |z-score| exceeds the threshold.",
        "winsorization":        "Cap extreme values at specified percentiles.",
        "log_transformation":   "Apply log(x+1) to compress skewed distributions.",
        "cap_outliers":         "Cap outlier values at IQR or percentile bounds.",
        "isolation_forest":     "ML-based outlier detection using random partition trees.",
        "trim_whitespace":      "Strip leading/trailing whitespace from text fields.",
        "standardize_case":     "Normalize text to consistent case.",
        "remove_duplicates":    "Delete duplicate rows based on selected columns.",
    }

    methods_used: dict = {}
    for col, ops in cleaning_history.items():
        for op in ops:
            m = op.get("method_name", op.get("method", "unknown"))
            methods_used.setdefault(m, []).append(col)

    if methods_used:
        for method, cols in methods_used.items():
            desc = descriptions.get(method, "Custom or unlisted method.")
            block = KeepTogether([
                Paragraph(method, H3),
                Paragraph(f"<b>Description:</b> {desc}", BODY),
                Paragraph(f"<b>Applied to:</b> {', '.join(cols)}", BODY),
                Spacer(1, 0.15*cm),
            ])
            story.append(block)
    else:
        story.append(Paragraph("No cleaning methods have been applied yet.", BODY))

    # ── Section 5: Diagnostics ────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("5. Diagnostics & Data Health", H2))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE_200, spaceAfter=6))

    # Numeric stats
    if numeric_cols:
        story.append(Paragraph("Numeric Column Statistics", H3))
        numeric_df = df[numeric_cols].describe().T
        stat_cols_to_show = ["count", "mean", "std", "min", "50%", "max"]
        available = [c for c in stat_cols_to_show if c in numeric_df.columns]

        stat_header = [Paragraph("Column", TH)] + [Paragraph(c, TH) for c in available]
        stat_rows = [stat_header]
        for col in numeric_cols[:20]:
            row = [Paragraph(str(col)[:22], TD)]
            for c in available:
                val = numeric_df.loc[col, c] if col in numeric_df.index else "—"
                try:
                    row.append(Paragraph(f"{float(val):.3g}", BODY_SM))
                except Exception:
                    row.append(Paragraph(str(val), BODY_SM))
            stat_rows.append(row)
        if len(numeric_cols) > 20:
            stat_rows.append([Paragraph(f"… {len(numeric_cols)-20} more", BODY_SM)] + [Paragraph("", BODY_SM)] * len(available))

        ncw = (PAGE_W - 4*cm) / (len(available) + 1)
        stat_table = Table(stat_rows, colWidths=[ncw * 1.4] + [ncw * 0.9] * len(available))
        s_styles = [
            ("BACKGROUND",    (0,0), (-1,0), BRAND_BLUE),
            ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
            ("INNERGRID",     (0,0), (-1,-1), 0.25, SLATE_200),
            ("TOPPADDING",    (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING",   (0,0), (-1,-1), 5),
            ("RIGHTPADDING",  (0,0), (-1,-1), 5),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]
        for i in range(1, len(stat_rows)):
            s_styles.append(("BACKGROUND", (0,i), (-1,i), SLATE_50 if i % 2 == 0 else WHITE))
        stat_table.setStyle(TableStyle(s_styles))
        story.append(stat_table)
        story.append(Spacer(1, 0.4*cm))

    # Health checklist
    story.append(Paragraph("Data Health Checklist", H3))
    checks = [
        ("No missing values remaining", total_missing == 0, f"{total_missing:,} missing values"),
        ("Dataset has rows", total_rows > 0, f"{total_rows:,} rows"),
        ("Dataset has columns", total_cols > 0, f"{total_cols} columns"),
        ("Cleaning operations performed", total_ops > 0, f"{total_ops} operations"),
        ("High completeness (≥95%)", completeness >= 95, f"{completeness}% complete"),
    ]
    for label, passed, detail in checks:
        icon = "✓" if passed else "✗"
        color = EMERALD if passed else RED_600
        story.append(Paragraph(
            f'<font color="{"#059669" if passed else "#DC2626"}"><b>{icon}</b></font>  '
            f'{label} — <i>{detail}</i>',
            BODY
        ))

    # ── Footer area ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_200))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f"Report generated by <b>Renvo AI</b> on {now_str}. "
        f"Dataset: {total_rows:,} rows × {total_cols} columns.",
        CAPTION
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


@router.get("/reports/generate")
async def generate_report(type: str, request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})

    cleaning_history = sess.get("cleaning_history", {})
    analysis_results = sess.get("column_analysis", {})

    try:
        if type == "executive":
            content = _generate_executive_summary(df, cleaning_history, analysis_results)
        elif type == "audit":
            content = _generate_audit_trail(cleaning_history)
        elif type == "methodology":
            content = _generate_methodology(cleaning_history)
        elif type == "json":
            data = {
                "generated_at": datetime.now().isoformat(),
                "dataset": {
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": df.columns.tolist(),
                    "missing_values": int(df.isnull().sum().sum()),
                    "dtypes": {col: str(df[col].dtype) for col in df.columns},
                    "missing_per_column": {col: int(df[col].isnull().sum()) for col in df.columns},
                },
                "cleaning_history": cleaning_history,
                "operations_count": sum(len(v) for v in cleaning_history.values()),
                "columns_cleaned": list(cleaning_history.keys()),
            }
            content = json.dumps(_make_safe(data), indent=2)
        else:
            return JSONResponse(status_code=400, content={"error": "Invalid report type"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Report generation failed: {str(e)}"})

    return {"content": content, "type": type}


@router.get("/reports/download-pdf")
async def download_pdf_report(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})

    cleaning_history = sess.get("cleaning_history", {})
    analysis_results = sess.get("column_analysis", {})

    try:
        pdf_bytes = _generate_pdf_report(df, cleaning_history, analysis_results)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"PDF generation failed: {str(e)}"})

    date_str = datetime.now().strftime("%Y-%m-%d")
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=renvo_report_{date_str}.pdf"}
    )


@router.get("/reports/download-csv")
async def download_cleaned_csv(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleaned_dataset.csv"}
    )


@router.get("/reports/download-json")
async def download_json(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    cleaning_history = sess.get("cleaning_history", {})
    data = {
        "generated_at": datetime.now().isoformat(),
        "dataset": {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "missing_values": int(df.isnull().sum().sum()),
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
        },
        "cleaning_history": cleaning_history,
        "operations_count": sum(len(v) for v in cleaning_history.values()),
    }
    return JSONResponse(
        content=_make_safe(data),
        headers={"Content-Disposition": "attachment; filename=report_data.json"}
    )
