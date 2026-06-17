import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np

from backend.deps import get_session_dep
from backend.session import push_undo
from modules.anomaly_detector import AnomalyDetector

router = APIRouter()


def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, pd.Timestamp):
        return str(v)
    return v


def _coerce_column(df: pd.DataFrame, column: str, expected_type: str) -> tuple:
    """
    Coerce column dtype to expected_type, mirroring Streamlit's coerce_column_dtype.
    Returns (df, conversion_applied: bool, cells_changed: int).
    """
    try:
        original_series = df[column].copy()

        if expected_type in ["integer", "float", "numeric", "continuous", "ordinal"]:
            numeric = pd.to_numeric(original_series, errors="coerce")
            non_null = numeric.dropna()
            is_int = expected_type in ("integer",) or (
                expected_type in ("numeric", "continuous", "ordinal")
                and len(non_null) > 0
                and all(float(x).is_integer() for x in non_null)
            )
            if is_int:
                df[column] = numeric.astype("Int64")
            else:
                df[column] = numeric.astype("Float64")
            changed = int((original_series.astype(str) != df[column].astype(str)).sum())
            return df, True, changed

        elif expected_type == "datetime":
            converted = pd.to_datetime(original_series, errors="coerce", utc=False)
            df[column] = converted
            changed = int(original_series.isna().sum() != converted.isna().sum()) or int(
                (original_series.astype(str) != converted.astype(str)).sum()
            )
            return df, True, int(changed)

        elif expected_type == "categorical":
            str_series = original_series.astype("string")
            categories = sorted(str_series.dropna().unique())
            df[column] = str_series.astype(pd.CategoricalDtype(categories=categories, ordered=False))
            # normalizes dtype; changes = rows that were not already strings
            changed = int((original_series.astype(str) != str_series.astype(str)).sum())
            return df, True, changed

        elif expected_type == "binary":
            def normalize_binary(val):
                if pd.isna(val):
                    return pd.NA
                if isinstance(val, bool):
                    return val
                if isinstance(val, (int, float)):
                    return bool(val)
                if isinstance(val, str):
                    v = val.lower().strip()
                    if v in ("true", "1", "yes", "y", "t"):
                        return True
                    if v in ("false", "0", "no", "n", "f"):
                        return False
                return pd.NA

            converted = original_series.apply(normalize_binary).astype("boolean")
            df[column] = converted
            changed = int((original_series.astype(str) != converted.astype(str)).sum())
            return df, True, changed

        elif expected_type == "text":
            converted = original_series.astype("string")
            df[column] = converted
            changed = int((original_series.astype(str) != converted.astype(str)).sum())
            return df, True, changed

        else:
            return df, False, 0

    except Exception:
        return df, False, 0


@router.post("/anomaly/scan-all")
async def scan_all(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    column_types = sess.get("column_types", {})
    detector = AnomalyDetector()
    all_anomalies = detector.detect_all_anomalies(df, column_types)
    result = {}
    for col, data in all_anomalies.items():
        result[col] = {
            "expected_type": data["expected_type"],
            "anomaly_count": data["anomaly_count"],
            "anomaly_percentage": round(data["anomaly_percentage"], 2),
            "total_values": data["total_values"],
            "anomalies": [
                {
                    "row_index": int(a["row_index"]),
                    "value": str(a["value"]),
                    "reason": a["reason"],
                }
                for a in data["anomalies"][:50]
            ],
        }
    return {"anomalies": result, "columns_with_anomalies": len(result)}


@router.post("/anomaly/scan-column")
async def scan_column(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    column = body.get("column", "")
    if column not in df.columns:
        return JSONResponse(status_code=400, content={"error": f"Column '{column}' not found"})
    expected_type = sess.get("column_types", {}).get(column, "unknown")
    detector = AnomalyDetector()
    data = detector.detect_column_anomalies(df, column, expected_type)
    return {
        "column": column,
        "expected_type": expected_type,
        "anomaly_count": data["anomaly_count"],
        "anomaly_percentage": round(data["anomaly_percentage"], 2),
        "total_values": data["total_values"],
        "null_values": int(data["null_values"]),
        "summary": data["summary"],
        "anomalies": [
            {
                "row_index": int(a["row_index"]),
                "value": str(a["value"]),
                "reason": a["reason"],
            }
            for a in data["anomalies"][:200]
        ],
    }


@router.post("/anomaly/nullify")
async def nullify_anomalies(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    column = body.get("column", "")
    row_indices = body.get("row_indices", [])
    if column not in df.columns:
        return JSONResponse(status_code=400, content={"error": "Column not found"})
    push_undo(sid)
    detector = AnomalyDetector()
    cleaned_df, summary = detector.remove_anomalies(df, column, row_indices)
    expected_type = sess.get("column_types", {}).get(column, "unknown")
    cleaned_df, _, _ = _coerce_column(cleaned_df, column, expected_type)
    sess["dataset"] = cleaned_df
    if "cleaning_history" not in sess:
        sess["cleaning_history"] = {}
    if column not in sess["cleaning_history"]:
        sess["cleaning_history"][column] = []
    sess["cleaning_history"][column].append(
        {"operation": "nullify_anomalies", "cells_nullified": len(row_indices)}
    )
    return {
        "message": f"Nullified {len(row_indices)} anomalous values",
        "cells_nullified": len(row_indices),
    }


@router.post("/anomaly/replace-value")
async def replace_value(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    column = body.get("column", "")
    row_index = body.get("row_index")
    new_value = body.get("new_value")
    push_undo(sid)
    detector = AnomalyDetector()
    modified_df, _ = detector.replace_anomaly(df.copy(), row_index, column, new_value)
    sess["dataset"] = modified_df
    return {"message": f"Replaced value at row {row_index}"}


@router.get("/anomaly/duplicates")
async def get_duplicates(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    total = int(df.duplicated().sum())
    total_pct = round(total / len(df) * 100, 2) if len(df) > 0 else 0
    return {
        "total_rows": len(df),
        "duplicate_count": total,
        "duplicate_percentage": total_pct,
        "columns": df.columns.tolist(),
    }


@router.post("/anomaly/check-duplicates")
async def check_duplicates(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    subset = body.get("subset") or None
    keep = body.get("keep", "first")
    keep_param = False if keep == "none" else keep
    dup_count = int(df.duplicated(subset=subset, keep=False).sum())
    to_remove = int(df.duplicated(subset=subset, keep=keep_param).sum())
    return {"duplicate_count": dup_count, "rows_to_remove": to_remove}


@router.post("/anomaly/type-mismatches")
async def type_mismatches(request: Request, response: Response):
    """Alias: scan all columns for data type mismatches."""
    return await scan_all(request, response)


@router.post("/anomaly/fix-column")
async def fix_column(request: Request, response: Response):
    """Apply coercion or nullification to anomalous values in a column."""
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    column = body.get("column", "")
    action = body.get("action", "nullify")
    expected_type = body.get("expected_type") or sess.get("column_types", {}).get(column, "unknown")
    if column not in df.columns:
        return JSONResponse(status_code=400, content={"error": "Column not found"})

    detector = AnomalyDetector()
    data = detector.detect_column_anomalies(df, column, expected_type)
    row_indices = [a["row_index"] for a in data["anomalies"]]
    if not row_indices:
        return {"message": "No anomalies found to fix", "cells_fixed": 0}

    push_undo(sid)
    cells_fixed = 0
    if action == "coerce":
        cleaned_df, applied, cells_fixed = _coerce_column(df.copy(), column, expected_type)
        if not applied:
            return JSONResponse(status_code=400, content={"error": f"Coercion not supported for type '{expected_type}'"})
    else:
        cleaned_df, _ = detector.remove_anomalies(df, column, row_indices)
        cells_fixed = len(row_indices)
        cleaned_df, _, _ = _coerce_column(cleaned_df, column, expected_type)
    sess["dataset"] = cleaned_df
    if "cleaning_history" not in sess:
        sess["cleaning_history"] = {}
    if column not in sess["cleaning_history"]:
        sess["cleaning_history"][column] = []
    from datetime import datetime as _dt
    sess["cleaning_history"][column].append({
        "operation": f"fix_column_{action}",
        "method_name": f"fix_column_{action}",
        "cells_fixed": cells_fixed,
        "rows_affected": cells_fixed,
        "timestamp": _dt.utcnow().isoformat(),
    })
    if cells_fixed == 0 and action == "coerce":
        return {"message": f"No effective changes made to '{column}' (values may already be in correct format)", "cells_fixed": 0}
    return {"message": f"Fixed {cells_fixed} cell(s) in '{column}' via {action}", "cells_fixed": cells_fixed}


@router.post("/anomaly/remove-duplicates")
async def remove_duplicates(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    subset = body.get("subset") or None
    keep = body.get("keep", "first")
    push_undo(sid)
    keep_param = False if keep == "none" else keep
    cleaned = df.drop_duplicates(subset=subset, keep=keep_param).reset_index(drop=True)
    removed = len(df) - len(cleaned)
    sess["dataset"] = cleaned
    # Append to audit trail
    if "cleaning_history" not in sess:
        sess["cleaning_history"] = {}
    key = "__duplicates__"
    if key not in sess["cleaning_history"]:
        sess["cleaning_history"][key] = []
    from datetime import datetime
    sess["cleaning_history"][key].append({
        "operation": "remove_duplicates",
        "method_name": "remove_duplicates",
        "params": {"subset": subset, "keep": keep},
        "rows_affected": removed,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return {
        "message": f"Removed {removed} duplicate rows",
        "rows_removed": removed,
        "rows_remaining": len(cleaned),
    }
