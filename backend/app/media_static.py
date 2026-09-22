from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope

PUBLIC_MEDIA_CACHE_HEADERS = {
    "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
}


class PublicMediaStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        if response.status_code < 400:
            response.headers.update(PUBLIC_MEDIA_CACHE_HEADERS)
        return response
