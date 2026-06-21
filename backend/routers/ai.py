import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import json
import math

from backend.deps import get_session_dep
from modules.ai_assistant import AIAssistant

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

@router.post("/ai/chat")
async def chat(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    df = sess.get("dataset")
    # AI Assistant can work without dataset, but better with it
    
    body = await request.json()
    message = body.get("message")
    column = body.get("column")
    
    assistant = sess.get("ai_assistant")
    if assistant is None:
        assistant = AIAssistant()
        sess["ai_assistant"] = assistant
        
    if df is not None:
        column_types = sess.get("column_types", {})
        missing_summary = df.isnull().sum().to_dict()
        dataset_info = {
            'shape': df.shape,
            'columns': len(df.columns),
            'missing_summary': {str(k): int(v) for k, v in missing_summary.items()},
            'column_types': column_types
        }
        
        column_analysis = None
        if column and "column_analysis" in sess and column in sess["column_analysis"]:
            column_analysis = sess["column_analysis"][column]
            
        assistant.set_context(dataset_info, column_analysis)
        
        # Add some current state
        current_state = {
            'cleaning_history': sess.get("cleaning_history", {}),
            'current_dataset_stats': {
                'missing_total': int(df.isnull().sum().sum()),
                'columns_cleaned': len(sess.get("cleaning_history", {}))
            }
        }
        assistant._update_context_with_current_state(current_state)

    ai_response = assistant.ask_question(message, column_specific=column)
    return {"response": ai_response}

@router.get("/ai/history")
async def get_history(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    assistant = sess.get("ai_assistant")
    if assistant is None:
        return {"history": []}
    
    history = assistant.get_conversation_history()
    # Format for frontend: [{role:str, content:str, timestamp:str}]
    formatted_history = []
    for item in history:
        formatted_history.append({
            "role": "user",
            "content": item.get("question"),
            "timestamp": item.get("timestamp")
        })
        formatted_history.append({
            "role": "assistant",
            "content": item.get("response"),
            "timestamp": item.get("timestamp")
        })
    return {"history": formatted_history}

@router.post("/ai/clear")
async def clear_history(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    assistant = sess.get("ai_assistant")
    if assistant:
        assistant.clear_conversation_history()
    return {"ok": True}
