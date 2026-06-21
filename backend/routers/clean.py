import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import math
from datetime import datetime

from backend.deps import get_session_dep
from backend.session import push_undo, undo, redo
from modules.cleaning_engine import DataCleaningEngine

router = APIRouter()


def _s(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, pd.Timestamp):
        return str(v)
    return v


@router.post("/clean/preview")
async def preview_clean(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    column = body.get("column", "")
    method_type = body.get("method_type", "")
    method_name = body.get("method_name", "")
    parameters = body.get("parameters", {})
    if column not in df.columns:
        return JSONResponse(status_code=400, content={"error": "Column not found"})
    engine = DataCleaningEngine()
    try:
        cleaned_series, metadata = engine.apply_cleaning_method(df, column, method_type, method_name, parameters)
        if not metadata.get("success"):
            return JSONResponse(status_code=400, content={"error": metadata.get("error", "Preview failed")})
        impact = metadata.get("impact_stats", {})
        original = df[column]
        changed_mask = (original != cleaned_series) | (original.isnull() != cleaned_series.isnull())
        changed_idx = changed_mask[changed_mask].index[:20]
        sample_changes = [
            {"index": int(i), "before": _s(original.loc[i]), "after": _s(cleaned_series.loc[i])}
            for i in changed_idx
        ]
        return {
            "success": True,
            "impact_stats": {k: _s(v) for k, v in impact.items()},
            "sample_changes": sample_changes,
            "total_changes": int(changed_mask.sum()),
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@router.post("/clean/apply")
async def apply_clean(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    column = body.get("column", "")
    method_type = body.get("method_type", "")
    method_name = body.get("method_name", "")
    parameters = body.get("parameters", {})
    if column not in df.columns:
        return JSONResponse(status_code=400, content={"error": "Column not found"})
    engine = DataCleaningEngine()
    try:
        cleaned_series, metadata = engine.apply_cleaning_method(df, column, method_type, method_name, parameters)
        if not metadata.get("success"):
            return JSONResponse(status_code=400, content={"error": metadata.get("error", "Apply failed")})
        push_undo(sid)
        df2 = df.copy()
        df2[column] = cleaned_series
        sess["dataset"] = df2
        impact = metadata.get("impact_stats", {})
        if "cleaning_history" not in sess:
            sess["cleaning_history"] = {}
        if column not in sess["cleaning_history"]:
            sess["cleaning_history"][column] = []
        sess["cleaning_history"][column].append({
            "method_type": method_type,
            "method_name": method_name,
            "parameters": parameters,
            "rows_affected": _s(impact.get("rows_affected", 0)),
            "timestamp": datetime.now().isoformat(),
        })
        return {
            "success": True,
            "message": f"Applied {method_name} to '{column}'",
            "rows_affected": _s(impact.get("rows_affected", 0)),
            "undo_count": len(sess.get("undo_stack", [])),
            "redo_count": len(sess.get("redo_stack", [])),
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@router.post("/clean/undo")
async def undo_clean(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    success = undo(sid)
    return {
        "success": success,
        "message": "Undone" if success else "Nothing to undo",
        "undo_count": len(sess.get("undo_stack", [])),
        "redo_count": len(sess.get("redo_stack", [])),
    }


@router.post("/clean/redo")
async def redo_clean(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    success = redo(sid)
    return {
        "success": success,
        "message": "Redone" if success else "Nothing to redo",
        "undo_count": len(sess.get("undo_stack", [])),
        "redo_count": len(sess.get("redo_stack", [])),
    }


@router.get("/clean/history")
async def get_history(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    return {
        "cleaning_history": sess.get("cleaning_history", {}),
        "undo_count": len(sess.get("undo_stack", [])),
        "redo_count": len(sess.get("redo_stack", [])),
    }


@router.post("/clean/clear-history")
async def clear_history(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    if sess.get("dataset") is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    sess["cleaning_history"] = {}
    return {"message": "Cleaning history cleared"}
