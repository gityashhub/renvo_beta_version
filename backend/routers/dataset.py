import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response, Query
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import math

from backend.deps import get_session_dep
from modules.utils import detect_column_types
from modules.data_analyzer import ColumnAnalyzer

router = APIRouter()


def _safe_value(v):
    """Convert pandas/numpy values to JSON-serializable Python types."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (pd.Timestamp,)):
        return str(v)
    return v


def _df_to_records(df: pd.DataFrame) -> list:
    records = []
    for row in df.to_dict(orient="records"):
        records.append({k: _safe_value(v) for k, v in row.items()})
    return records


@router.get("/session/status")
async def session_status(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    has_dataset = sess.get("dataset") is not None
    return {
        "session_id": sid,
        "has_dataset": has_dataset,
        "filename": sess.get("filename"),
        "undo_count": len(sess.get("undo_stack", [])),
        "redo_count": len(sess.get("redo_stack", [])),
    }


@router.get("/dataset/overview")
async def dataset_overview(
    request: Request,
    response: Response,
    preview_rows: int = Query(10, ge=1, le=500),
    show_info: bool = Query(False),
):
    sid, sess = get_session_dep(request, response)
    df: pd.DataFrame = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})

    preview_df = df.head(preview_rows)

    column_info = None
    if show_info:
        column_info = []
        for col in df.columns:
            column_info.append({
                "column": col,
                "dtype": str(df[col].dtype),
                "non_null": int(df[col].count()),
                "missing": int(df[col].isnull().sum()),
                "unique": int(df[col].nunique()),
            })

    return {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 ** 2, 1),
        "column_names": df.columns.tolist(),
        "preview": _df_to_records(preview_df),
        "column_info": column_info,
        "max_preview_rows": min(100, len(df)),
    }


@router.get("/dataset/column-types")
async def get_column_types(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    return {"column_types": sess.get("column_types", {})}


@router.put("/dataset/column-types")
async def update_column_types(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    if sess.get("dataset") is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    sess["column_types"] = body.get("column_types", {})
    return {"message": "Column types updated", "column_types": sess["column_types"]}


@router.post("/dataset/analyze-columns")
async def analyze_columns(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df: pd.DataFrame = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})

    analyzer = ColumnAnalyzer()
    results = {}
    for col in df.columns:
        try:
            analysis = analyzer.analyze_column(df, col)
            # Make JSON-serializable
            safe = {}
            for k, v in analysis.items():
                try:
                    import json
                    json.dumps(v)
                    safe[k] = v
                except Exception:
                    safe[k] = str(v)
            results[col] = safe
        except Exception as e:
            results[col] = {"error": str(e)}

    sess["column_analysis"] = results
    return {"message": "Column analysis completed", "columns_analyzed": len(results)}


@router.post("/dataset/undo")
async def undo_operation(request: Request, response: Response):
    from backend.session import undo
    sid, sess = get_session_dep(request, response)
    success = undo(sid)
    return {"success": success, "message": "Undo successful" if success else "Nothing to undo"}


@router.post("/dataset/redo")
async def redo_operation(request: Request, response: Response):
    from backend.session import redo
    sid, sess = get_session_dep(request, response)
    success = redo(sid)
    return {"success": success, "message": "Redo successful" if success else "Nothing to redo"}
