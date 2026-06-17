import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, UploadFile, File, Request, Response
from fastapi.responses import JSONResponse
import pandas as pd
import io

from backend.deps import get_session_dep
from backend.session import reset_dataset
from modules.utils import detect_column_types

router = APIRouter()


@router.post("/upload")
async def upload_file(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
):
    sid, sess = get_session_dep(request, response)

    try:
        contents = await file.read()
        filename = file.filename or ""

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return JSONResponse(
                status_code=400,
                content={"error": "Unsupported file type. Please upload CSV or Excel."},
            )

        column_types = detect_column_types(df)
        reset_dataset(sid, df, filename, column_types)

        return {
            "session_id": sid,
            "filename": filename,
            "rows": len(df),
            "columns": len(df.columns),
            "message": f"Loaded dataset with {len(df):,} rows and {len(df.columns)} columns",
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
