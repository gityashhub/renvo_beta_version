import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import math
import json

from backend.deps import get_session_dep
from modules.data_analyzer import ColumnAnalyzer

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


@router.get("/columns/analysis")
async def get_all_analysis(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    column_analysis = sess.get("column_analysis", {})
    return {"column_analysis": _make_safe(column_analysis)}


@router.post("/columns/analyze/{column}")
async def analyze_one_column(column: str, request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    if column not in df.columns:
        return JSONResponse(status_code=404, content={"error": f"Column '{column}' not found"})
    analyzer = ColumnAnalyzer()
    try:
        result = analyzer.analyze_column(df, column, force_refresh=True)
        safe = _make_safe(result)
        if "column_analysis" not in sess:
            sess["column_analysis"] = {}
        sess["column_analysis"][column] = safe
        return safe
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/columns/distribution/{column}")
async def get_distribution(column: str, request: Request, response: Response):
    """Return Plotly-format chart JSON for rendering on the frontend."""
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    if column not in df.columns:
        return JSONResponse(status_code=404, content={"error": "Column not found"})

    import plotly.graph_objects as go

    series = df[column].dropna()
    if len(series) == 0:
        fig = go.Figure()
        fig.update_layout(title="No data available", xaxis_title=column, yaxis_title="Count")
        return json.loads(fig.to_json())

    if pd.api.types.is_numeric_dtype(series):
        n_bins = min(30, max(5, series.nunique()))
        fig = go.Figure(data=[
            go.Histogram(
                x=series.tolist(),
                nbinsx=n_bins,
                marker_color='#4f6ef7',
                opacity=0.85,
                name=column,
            )
        ])
        mean_val = float(series.mean())
        median_val = float(series.median())
        fig.add_vline(x=mean_val, line_dash="dash", line_color="#ef4444", annotation_text=f"Mean: {mean_val:.2f}", annotation_position="top right")
        fig.add_vline(x=median_val, line_dash="dot", line_color="#10b981", annotation_text=f"Median: {median_val:.2f}", annotation_position="top left")
        fig.update_layout(
            xaxis_title=column,
            yaxis_title="Count",
            showlegend=False,
            height=300,
            margin=dict(l=40, r=20, t=20, b=40),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor="#f0f0f0")
        fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor="#f0f0f0")
    else:
        vc = series.astype(str).value_counts().head(20)
        fig = go.Figure(data=[
            go.Bar(
                x=vc.index.tolist(),
                y=vc.values.tolist(),
                marker_color='#4f6ef7',
                opacity=0.85,
            )
        ])
        fig.update_layout(
            xaxis_title=column,
            yaxis_title="Count",
            showlegend=False,
            height=300,
            margin=dict(l=40, r=20, t=20, b=80),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        fig.update_xaxes(tickangle=-45, showgrid=False)
        fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor="#f0f0f0")

    return json.loads(fig.to_json())
