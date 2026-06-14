.PHONY: help start stop restart status logs check api-flow api-contract e2e smoke perf-smoke quality dev health

help:
	@printf '%s\n' \
		'PhotoMap - dostępne komendy:' \
		'' \
		'  make start         Uruchom backend i frontend.' \
		'  make stop          Zatrzymaj lokalny backend i frontend.' \
		'  make restart       Zatrzymaj i ponownie uruchom oba procesy.' \
		'  make status        Pokaż PID-y, porty i stan usług.' \
		'  make logs          Pokaż ostatnie logi backendu i frontendu.' \
		'  make check         Uruchom pełny check projektu.' \
		'  make api-flow      Sprawdź pełny flow produktu przez backend API.' \
		'  make api-contract  Sprawdź kontrakt publicznego API.' \
		'  make smoke         Uruchom szybki smoke test backendu i frontendu.' \
		'  make perf-smoke    Wykonaj podstawowy test wydajności endpointów.' \
		'  make e2e           Uruchom testy E2E w Chromium.' \
		'  make quality       Uruchom wszystkie checki i testy jakościowe.' \
		'  make dev           Alias dla make start.' \
		'  make health        Alias dla make status.'

start:
	@./scripts/devctl.sh start

stop:
	@./scripts/devctl.sh stop

restart:
	@./scripts/devctl.sh restart

status:
	@./scripts/devctl.sh status

logs:
	@./scripts/devctl.sh logs

check:
	@./scripts/check.sh

api-flow:
	@./scripts/quality/api_flow.sh

api-contract:
	@./scripts/quality/api_contract.sh

e2e:
	@./scripts/quality/e2e.sh

smoke:
	@./scripts/quality/smoke.sh

perf-smoke:
	@./scripts/quality/perf_smoke.sh

quality: check api-flow api-contract smoke perf-smoke e2e

dev: start

health: status
