import uuid
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime

sessions: Dict[str, Dict[str, Any]] = {}


def create_session() -> str:
    session_id = str(uuid.uuid4())
    _init_session(session_id)
    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    return sessions.get(session_id)


def get_or_create_session(session_id: Optional[str]) -> tuple[str, Dict[str, Any]]:
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]
    new_id = create_session()
    return new_id, sessions[new_id]


def _init_session(session_id: str) -> Dict[str, Any]:
    sessions[session_id] = {
        "dataset": None,
        "original_dataset": None,
        "column_types": {},
        "column_analysis": {},
        "cleaning_history": {},
        "undo_stack": [],
        "redo_stack": [],
        "ai_context": {},
        "filename": None,
        "created_at": datetime.now().isoformat(),
    }
    return sessions[session_id]


def reset_dataset(session_id: str, df: pd.DataFrame, filename: str, column_types: Dict):
    sess = sessions[session_id]
    sess["dataset"] = df.copy()
    sess["original_dataset"] = df.copy()
    sess["column_types"] = column_types
    sess["column_analysis"] = {}
    sess["cleaning_history"] = {}
    sess["undo_stack"] = []
    sess["redo_stack"] = []
    sess["filename"] = filename


def push_undo(session_id: str):
    sess = sessions[session_id]
    if sess["dataset"] is not None:
        backup = {
            "dataset": sess["dataset"].copy(),
            "column_analysis": sess["column_analysis"].copy(),
            "timestamp": datetime.now().isoformat(),
        }
        sess["undo_stack"].append(backup)
        if len(sess["undo_stack"]) > 20:
            sess["undo_stack"].pop(0)
        sess["redo_stack"].clear()


def undo(session_id: str) -> bool:
    sess = sessions[session_id]
    if not sess["undo_stack"]:
        return False
    current = {
        "dataset": sess["dataset"].copy(),
        "column_analysis": sess["column_analysis"].copy(),
        "timestamp": datetime.now().isoformat(),
    }
    sess["redo_stack"].append(current)
    prev = sess["undo_stack"].pop()
    sess["dataset"] = prev["dataset"]
    sess["column_analysis"] = prev["column_analysis"]
    return True


def redo(session_id: str) -> bool:
    sess = sessions[session_id]
    if not sess["redo_stack"]:
        return False
    current = {
        "dataset": sess["dataset"].copy(),
        "column_analysis": sess["column_analysis"].copy(),
        "timestamp": datetime.now().isoformat(),
    }
    sess["undo_stack"].append(current)
    nxt = sess["redo_stack"].pop()
    sess["dataset"] = nxt["dataset"]
    sess["column_analysis"] = nxt["column_analysis"]
    return True
