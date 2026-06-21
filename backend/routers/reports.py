import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, Response
import pandas as pd
import numpy as np
import json
import math

from backend.deps import get_session_dep
from modules.report_generator import ReportGenerator

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

@router.get("/reports/generate")
async def generate_report(type: str, request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    cleaning_history = sess.get("cleaning_history", {})
    analysis_results = sess.get("column_analysis", {})
    
    generator = ReportGenerator()
    
    content = ""
    if type == "executive":
        content = generator.generate_executive_summary(df, cleaning_history, analysis_results)
    elif type == "audit":
        content = generator.generate_audit_trail(cleaning_history)
    elif type == "methodology":
        content = generator.generate_methodology_report(cleaning_history)
    elif type == "json":
        data = generator._prepare_comprehensive_data(df, cleaning_history, analysis_results, {})
        content = json.dumps(_make_safe(data), indent=2)
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid report type"})
    
    return {"content": content, "type": type}

@router.get("/reports/download-pdf")
async def download_pdf(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    cleaning_history = sess.get("cleaning_history", {})
    analysis_results = sess.get("column_analysis", {})
    
    generator = ReportGenerator()
    # In a real app we'd generate a specific report, here we use comprehensive
    html_content = generator.generate_comprehensive_report(df, cleaning_history, analysis_results, {}, output_format='html')
    pdf_content = generator._convert_to_pdf(html_content)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=renvo_report.pdf"}
    )

@router.get("/reports/download-json")
async def download_json(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    if df is None:
        return JSONResponse(status_code=404, content={"error": "No dataset loaded"})
    
    cleaning_history = sess.get("cleaning_history", {})
    analysis_results = sess.get("column_analysis", {})
    
    generator = ReportGenerator()
    data = generator._prepare_comprehensive_data(df, cleaning_history, analysis_results, {})
    
    return JSONResponse(content=_make_safe(data), headers={"Content-Disposition": "attachment; filename=report_data.json"})
