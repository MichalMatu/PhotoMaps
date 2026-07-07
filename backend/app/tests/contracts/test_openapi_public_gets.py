import schemathesis
from hypothesis import HealthCheck, settings
from schemathesis import Case
from schemathesis.checks import not_a_server_error

from app.main import app

schema = schemathesis.openapi.from_asgi("/openapi.json", app).include(
    method="GET",
    path_regex=r"^/(health|api/(app-config|categories|cities|places|guides|public))",
)


@schema.parametrize()
@settings(
    deadline=None,
    max_examples=8,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_public_get_contract_does_not_crash(client_session, case: Case) -> None:
    _client, _session = client_session

    case.call_and_validate(checks=[not_a_server_error])
