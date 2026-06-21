import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
import numpy as np
import io
import math

from backend.deps import get_session_dep
from modules.data_balancer import DataBalancer

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

@router.get("/balancer/methods")
async def get_methods(request: Request, response: Response):
    balancer = DataBalancer()
    return balancer.get_available_methods()

@router.post("/balancer/validate")
async def validate_data(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    body = await request.json()
    feature_cols = body.get("feature_cols", [])
    target_col = body.get("target_col", "")
    
    balancer = DataBalancer()
    result = balancer.validate_data(df, feature_cols, target_col)
    return result

@router.get("/balancer/distribution")
async def get_distribution(target_col: str, request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    if target_col not in df.columns:
        return JSONResponse(status_code=400, content={"error": f"Column '{target_col}' not found"})
    
    balancer = DataBalancer()
    dist = balancer.get_class_distribution(df, target_col)
    return {"distribution": {str(k): int(v) for k, v in dist.to_dict().items()}}

@router.post("/balancer/balance")
async def balance_data(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    body = await request.json()
    method = body.get("method")
    feature_cols = body.get("feature_cols", [])
    target_col = body.get("target_col", "")
    use_split = body.get("use_split", False)
    test_size = body.get("test_size", 0.2)
    
    balancer = DataBalancer()
    
    if use_split:
        split_result = balancer.stratified_split(df, feature_cols, target_col, test_size=test_size)
        if not split_result['success']:
            return JSONResponse(status_code=400, content={"error": split_result['error']})
        
        train_df = split_result['train_data']
        balance_result = balancer.balance_data(train_df, feature_cols, target_col, method)
        
        if not balance_result['success']:
            return JSONResponse(status_code=400, content={"error": balance_result['error']})
        
        balanced_df = balance_result['balanced_data']
        # Combine with test data
        final_df = pd.concat([balanced_df, split_result['test_data']], ignore_index=True)
        before_dist = {str(k): int(v) for k, v in split_result['train_distribution'].to_dict().items()}
        after_dist = {str(k): int(v) for k, v in balance_result['balanced_distribution'].to_dict().items()}
    else:
        balance_result = balancer.balance_data(df, feature_cols, target_col, method)
        if not balance_result['success']:
            return JSONResponse(status_code=400, content={"error": balance_result['error']})
        
        final_df = balance_result['balanced_data']
        before_dist = {str(k): int(v) for k, v in balance_result['original_distribution'].to_dict().items()}
        after_dist = {str(k): int(v) for k, v in balance_result['balanced_distribution'].to_dict().items()}

    sess["dataset_balanced"] = final_df
    
    return {
        "before_dist": before_dist,
        "after_dist": after_dist,
        "rows_before": len(df),
        "rows_after": len(final_df),
        "records": _make_safe(final_df.head(100).to_dict(orient="records")),
        "filename": "balanced_dataset.csv"
    }

@router.get("/balancer/download")
async def download_balanced(format: str, request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset_balanced")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No balanced dataset available. Please run balance first."})
    
    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=balanced_dataset.csv"}
        )
    elif format in ["xlsx", "excel"]:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=balanced_dataset.xlsx"}
        )
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid format"})
