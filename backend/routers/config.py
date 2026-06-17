import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
import json
from datetime import datetime

from backend.deps import get_session_dep

router = APIRouter()


@router.get("/config/export")
async def export_config(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    config = {
        "column_types": sess.get("column_types", {}),
        "cleaning_history": sess.get("cleaning_history", {}),
        "timestamp": datetime.now().isoformat(),
    }
    return config


@router.post("/config/import")
async def import_config(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    try:
        body = await request.json()
        sess["column_types"] = body.get("column_types", {})
        sess["cleaning_history"] = body.get("cleaning_history", {})
        return {"message": "Configuration imported successfully"}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
