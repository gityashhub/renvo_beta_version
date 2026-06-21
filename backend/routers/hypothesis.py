import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import math

from backend.deps import get_session_dep
from modules.hypothesis_analysis import HypothesisAnalyzer

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

@router.post("/hypothesis/recommend")
async def recommend_tests(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    body = await request.json()
    columns = body.get("columns", [])
    alpha = body.get("alpha", 0.05)
    
    analyzer = HypothesisAnalyzer()
    analyzer.set_alpha(alpha)
    
    column_types = sess.get("column_types", {})
    # Map backend types to 'numeric' or 'categorical' as expected by HypothesisAnalyzer
    data_types = {}
    for col in columns:
        backend_type = column_types.get(col, "unknown")
        if backend_type in ["integer", "float", "numeric", "continuous", "ordinal"]:
            data_types[col] = "numeric"
        else:
            data_types[col] = "categorical"
            
    result = analyzer.recommend_test(df, columns, data_types)
    return _make_safe(result)

@router.post("/hypothesis/run")
async def run_test(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    body = await request.json()
    test_name = body.get("test")
    columns = body.get("columns", [])
    params = body.get("params", {})
    alpha = body.get("alpha", 0.05)
    
    analyzer = HypothesisAnalyzer()
    analyzer.set_alpha(alpha)
    
    test_func = getattr(analyzer, test_name, None)
    if not test_func:
        return JSONResponse(status_code=400, content={"error": f"Test '{test_name}' not implemented"})
    
    try:
        # Most tests take df, then columns
        if test_name == 'one_sample_ttest':
            result = test_func(df, columns[0], test_value=params.get('test_value', 0))
        elif test_name in ['welch_ttest', 'independent_ttest', 'mann_whitney', 'one_way_anova', 'kruskal_wallis']:
            # Expects numeric_col, group_col
            result = test_func(df, columns[0], columns[1])
        elif test_name in ['pearson_correlation', 'spearman_correlation', 'chi_square', 'fisher_exact']:
            # Expects col1, col2
            result = test_func(df, columns[0], columns[1])
        elif test_name == 'simple_linear_regression':
            result = test_func(df, columns[0], columns[1])
        else:
            # Fallback for other tests if any
            result = test_func(df, *columns, **params)
            
        return {"success": "error" not in result, "test": test_name, "result": _make_safe(result)}
    except Exception as e:
        return {"success": False, "test": test_name, "error": str(e)}
