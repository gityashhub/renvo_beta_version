import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import json
import math

from backend.deps import get_session_dep
from modules.visualization import DataVisualizer

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

@router.post("/viz/missing-patterns")
async def get_missing_patterns(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    viz = DataVisualizer()
    fig = viz.plot_missing_patterns(df)
    return {"chart_json": json.loads(fig.to_json())}

@router.post("/viz/column-overview")
async def get_column_overview(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    viz = DataVisualizer()
    fig = viz.plot_column_overview(df)
    return {"chart_json": json.loads(fig.to_json())}

@router.post("/viz/correlation")
async def get_correlation(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    viz = DataVisualizer()
    fig = viz.plot_correlation_matrix(df)
    return {"chart_json": json.loads(fig.to_json())}

@router.post("/viz/distribution")
async def get_distribution(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    body = await request.json()
    column = body.get("column")
    if column not in df.columns:
        return JSONResponse(status_code=400, content={"error": f"Column '{column}' not found"})
    
    viz = DataVisualizer()
    fig = viz.plot_column_distribution(df[column], column)
    return {"chart_json": json.loads(fig.to_json())}

@router.post("/viz/custom")
async def get_custom_chart(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    body = await request.json()
    x_col = body.get("x_col")
    y_col = body.get("y_col")
    chart_type = body.get("chart_type")
    color_col = body.get("color_col")
    
    import plotly.express as px
    
    try:
        if chart_type == "bar":
            fig = px.bar(df, x=x_col, y=y_col, color=color_col)
        elif chart_type == "scatter":
            fig = px.scatter(df, x=x_col, y=y_col, color=color_col)
        elif chart_type == "line":
            fig = px.line(df, x=x_col, y=y_col, color=color_col)
        elif chart_type == "box":
            fig = px.box(df, x=x_col, y=y_col, color=color_col)
        elif chart_type == "histogram":
            fig = px.histogram(df, x=x_col, y=y_col, color=color_col)
        else:
            return JSONResponse(status_code=400, content={"error": f"Unsupported chart type '{chart_type}'"})
        
        fig.update_layout(
            paper_bgcolor="white",
            plot_bgcolor="rgba(243, 244, 246, 1)",
            font=dict(family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif", size=12)
        )
        return {"chart_json": json.loads(fig.to_json())}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
