import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import math
from datetime import datetime

from backend.deps import get_session_dep
from backend.session import push_undo
from modules.data_transformer import DataTransformer


def _append_history(sess: dict, operation: str, params: dict, rows_affected: int) -> None:
    """Append an entry to the global cleaning_history audit trail."""
    if "cleaning_history" not in sess:
        sess["cleaning_history"] = {}
    key = "__transform__"
    if key not in sess["cleaning_history"]:
        sess["cleaning_history"][key] = []
    sess["cleaning_history"][key].append({
        "operation": operation,
        "params": params,
        "rows_affected": rows_affected,
        "method_name": operation,
        "timestamp": datetime.utcnow().isoformat(),
    })

router = APIRouter()


def _safe_val(v):
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


def _df_to_records(df: pd.DataFrame) -> list:
    records = []
    for row in df.to_dict(orient="records"):
        records.append({k: _safe_val(v) for k, v in row.items()})
    return records


@router.post("/transform/validate-merge")
async def validate_merge(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    columns = body.get("columns", [])
    is_datetime = body.get("is_datetime_merge", False)
    transformer = DataTransformer()
    result = transformer.validate_merge_columns(df, columns, is_datetime)
    return result


@router.post("/transform/merge-columns")
async def merge_columns(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    preview_only = body.get("preview_only", False)
    columns = body.get("columns", [])
    separators = body.get("separators", ["-"])
    new_column_name = body.get("new_column_name", "merged")
    handle_missing = body.get("handle_missing", "skip")
    is_datetime = body.get("is_datetime_merge", False)
    datetime_format = body.get("datetime_format", None)

    transformer = DataTransformer()
    source_df = df.head(10) if preview_only else df
    result_df, info = transformer.merge_columns(
        df=source_df, columns=columns, separators=separators,
        new_column_name=new_column_name, handle_missing=handle_missing,
        is_datetime_merge=is_datetime, datetime_format=datetime_format,
    )
    if not info.get("success"):
        return JSONResponse(status_code=400, content={"error": info.get("error", "Merge failed")})

    if preview_only:
        preview_cols = [c for c in columns if c in result_df.columns] + [new_column_name]
        return {"preview": _df_to_records(result_df[preview_cols]), "new_columns": [new_column_name]}

    push_undo(sid)
    sess["dataset"] = result_df
    rows_affected = int(info.get("rows_affected", 0))
    _append_history(sess, "merge_columns", {"columns": columns, "separator": separators, "new_column": new_column_name}, rows_affected)
    return {"message": f"Merged into '{new_column_name}'", "rows_affected": _safe_val(rows_affected)}


@router.post("/transform/split-column")
async def split_column(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    preview_only = body.get("preview_only", False)
    column = body.get("column", "")
    separator = body.get("separator", "-")
    prefix = body.get("new_column_prefix", column)
    max_splits = body.get("max_splits", -1)
    is_datetime = body.get("is_datetime_split", False)
    components = body.get("datetime_components", ["year", "month", "day"])

    transformer = DataTransformer()
    source_df = df.head(10) if preview_only else df
    result_df, info = transformer.split_column(
        df=source_df, column=column, separator=separator,
        new_column_prefix=prefix, max_splits=max_splits,
        is_datetime_split=is_datetime, datetime_components=components,
    )
    if not info.get("success"):
        return JSONResponse(status_code=400, content={"error": info.get("error", "Split failed")})

    new_cols = info.get("new_columns", [])
    if preview_only:
        preview_cols = [c for c in ([column] + new_cols) if c in result_df.columns]
        return {"preview": _df_to_records(result_df[preview_cols]), "new_columns": new_cols}

    push_undo(sid)
    sess["dataset"] = result_df
    _append_history(sess, "split_column", {"column": column, "separator": separator, "new_columns": new_cols}, len(new_cols))
    return {"message": f"Split into {len(new_cols)} columns", "new_columns": new_cols}


@router.post("/transform/detect-json")
async def detect_json(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    transformer = DataTransformer()
    json_cols = transformer.detect_json_columns(df)
    return {"json_columns": json_cols}


@router.post("/transform/expand-json")
async def expand_json(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    preview_only = body.get("preview_only", False)
    column = body.get("column", "")
    keys = body.get("keys_to_extract", [])
    explode = body.get("explode_arrays", False)
    prefix = body.get("prefix", column)

    transformer = DataTransformer()
    source_df = df.head(10) if preview_only else df
    result_df, info = transformer.expand_json_column(
        df=source_df, column=column, keys_to_extract=keys,
        explode_arrays=explode, prefix=prefix,
    )
    if not info.get("success"):
        return JSONResponse(status_code=400, content={"error": info.get("error", "Expansion failed")})

    new_cols = info.get("new_columns", [])
    if preview_only:
        preview_cols = [c for c in ([column] + new_cols) if c in result_df.columns]
        return {"preview": _df_to_records(result_df[preview_cols]), "new_columns": new_cols}

    push_undo(sid)
    sess["dataset"] = result_df
    _append_history(sess, "expand_json", {"column": column, "keys": keys, "explode": explode}, len(new_cols))
    return {
        "message": "JSON column expanded",
        "new_columns": new_cols,
        "rows_after": info.get("rows_after", len(result_df)),
    }


@router.post("/transform/reverse-json")
async def reverse_json(request: Request, response: Response):
    """Alias: convert columns back to a JSON column."""
    return await columns_to_json(request, response)


@router.post("/transform/columns-to-json")
async def columns_to_json(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    body = await request.json()
    preview_only = body.get("preview_only", False)
    columns = body.get("columns", [])
    new_column = body.get("new_column_name", "combined_json")
    group_by = body.get("group_by", None)
    as_array = body.get("as_array", False)

    transformer = DataTransformer()
    source_df = df.head(5) if preview_only else df
    result_df, info = transformer.columns_to_json(
        df=source_df, columns=columns, new_column_name=new_column,
        group_by=group_by, as_array=as_array,
    )
    if not info.get("success"):
        return JSONResponse(status_code=400, content={"error": info.get("error", "Conversion failed")})

    if preview_only:
        preview_cols = [c for c in (columns + [new_column]) if c in result_df.columns]
        return {"preview": _df_to_records(result_df[preview_cols])}

    push_undo(sid)
    sess["dataset"] = result_df
    _append_history(sess, "columns_to_json", {"columns": columns, "new_column": new_column}, len(columns))
    return {"message": f"Created JSON column '{new_column}'"}
