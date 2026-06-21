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
