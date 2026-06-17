from fastapi import Request, Response, Cookie
from typing import Optional
from backend.session import get_or_create_session, sessions
import uuid


SESSION_COOKIE = "renvo_session"


def get_session_dep(request: Request, response: Response):
    session_id = request.cookies.get(SESSION_COOKIE)
    sid, sess = get_or_create_session(session_id)
    if sid != session_id:
        response.set_cookie(
            SESSION_COOKIE,
            sid,
            httponly=True,
            samesite="lax",
            max_age=86400 * 7,
        )
    return sid, sess
