import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from backend.deps import get_session_dep
from backend.session import reset_dataset
from modules.utils import detect_column_types

router = APIRouter()


@router.post("/connect/mysql")
async def connect_mysql(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    body = await request.json()
    action = body.get("action", "connect")

    from modules.db_connector import MySQLConnector

    connector = MySQLConnector()
    success, message = connector.connect(
        host=body.get("host", "localhost"),
        port=int(body.get("port", 3306)),
        database=body.get("database", ""),
        username=body.get("username", ""),
        password=body.get("password", ""),
        use_ssl=body.get("use_ssl", False),
    )

    if not success:
        return JSONResponse(status_code=400, content={"error": message})

    if action == "connect":
        tables, msg = connector.get_tables()
        return {"message": message, "tables": tables}

    elif action == "import_table":
        table = body.get("table")
        limit = body.get("limit")
        df, msg = connector.import_table(table, limit)
        if df.empty:
            return JSONResponse(status_code=400, content={"error": msg})
        column_types = detect_column_types(df)
        reset_dataset(sid, df, f"mysql:{table}", column_types)
        return {"message": msg, "rows": len(df), "columns": len(df.columns)}

    elif action == "import_query":
        query = body.get("query", "")
        df, msg = connector.import_query(query)
        if df.empty:
            return JSONResponse(status_code=400, content={"error": msg})
        column_types = detect_column_types(df)
        reset_dataset(sid, df, "mysql:custom_query", column_types)
        return {"message": msg, "rows": len(df), "columns": len(df.columns)}

    return JSONResponse(status_code=400, content={"error": "Unknown action"})


@router.post("/connect/supabase")
async def connect_supabase(request: Request, response: Response):
    sid, sess = get_session_dep(request, response)
    body = await request.json()
    action = body.get("action", "connect")

    from modules.db_connector import SupabaseConnector

    connector = SupabaseConnector()
    success, message = connector.connect(
        project_url=body.get("project_url", ""),
        db_password=body.get("db_password", ""),
        custom_host=body.get("custom_host"),
        custom_port=int(body.get("custom_port", 5432)),
        custom_user=body.get("custom_user"),
    )

    if not success:
        return JSONResponse(status_code=400, content={"error": message})

    if action == "connect":
        tables, msg = connector.get_tables()
        return {"message": message, "tables": tables}

    elif action == "import_table":
        table = body.get("table")
        df, msg = connector.import_table(table)
        if df.empty:
            return JSONResponse(status_code=400, content={"error": msg})
        column_types = detect_column_types(df)
        reset_dataset(sid, df, f"supabase:{table}", column_types)
        return {"message": msg, "rows": len(df), "columns": len(df.columns)}

    elif action == "import_query":
        query = body.get("query", "")
        df, msg = connector.import_query(query)
        if df.empty:
            return JSONResponse(status_code=400, content={"error": msg})
        column_types = detect_column_types(df)
        reset_dataset(sid, df, "supabase:custom_query", column_types)
        return {"message": msg, "rows": len(df), "columns": len(df.columns)}

    return JSONResponse(status_code=400, content={"error": "Unknown action"})
