.PHONY: help start stop restart status logs check api-flow api-contract e2e smoke perf-smoke quality dev health server-start server-stop server-restart server-status server-logs tunnel-start tunnel-stop tunnel-status tunnel-logs autostart autostart-start autostart-stop autostart-status serwerstart serwerstop

help:
	@printf '%s\n' \
		'PhotoMap - dostępne komendy:' \
		'' \
		'Dev:' \
		'  make start             Uruchom backend i frontend.' \
		'  make stop              Zatrzymaj lokalny backend i frontend.' \
		'  make restart           Restart lokalnego dev; nie restartuje publicznego runtime.' \
		'  make status            Pokaż PID-y, porty i stan usług.' \
		'  make logs              Pokaż ostatnie logi backendu i frontendu.' \
		'  make dev               Alias dla make start.' \
		'  make health            Alias dla make status.' \
		'' \
		'Publiczny runtime:' \
		'  make server-start      Zbuduj frontend i uruchom jeden proces PhotoMap.' \
		'  make server-stop       Zatrzymaj publiczny runtime.' \
		'  make server-restart    Restart publicznego runtime dla photomap.pl.' \
		'  make server-status     Pokaż PID, port i health publicznego runtime.' \
		'  make server-logs       Pokaż logi publicznego runtime.' \
		'  make tunnel-start      Uruchom lokalny Cloudflare tunnel.' \
		'  make tunnel-stop       Zatrzymaj lokalny Cloudflare tunnel.' \
		'  make tunnel-status     Pokaż status tunelu.' \
		'  make tunnel-logs       Pokaż logi tunelu.' \
		'  make autostart         Alias dla make autostart-status.' \
		'  make autostart-start   Włącz autostart, runtime i tunnel.' \
		'  make autostart-stop    Wyłącz autostart i zatrzymaj runtime oraz tunnel.' \
		'  make serwerstart       Alias dla make autostart-start.' \
		'  make serwerstop        Alias dla make autostart-stop.' \
		'' \
		'Jakość:' \
		'  make check             Uruchom pełny check projektu.' \
		'  make api-flow          Sprawdź pełny flow produktu przez backend API.' \
		'  make api-contract      Sprawdź kontrakt publicznego API.' \
		'  make smoke             Uruchom szybki smoke test backendu i frontendu.' \
		'  make perf-smoke        Wykonaj podstawowy test wydajności endpointów.' \
		'  make e2e               Uruchom testy E2E w Chromium.' \
		'  make quality           Uruchom wszystkie checki i testy jakościowe.'

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

server-start:
	@./scripts/serverctl.sh start

server-stop:
	@./scripts/serverctl.sh stop

server-restart:
	@./scripts/serverctl.sh restart

server-status:
	@./scripts/serverctl.sh status

server-logs:
	@./scripts/serverctl.sh logs

tunnel-start:
	@./scripts/serverctl.sh tunnel-start

tunnel-stop:
	@./scripts/serverctl.sh tunnel-stop

tunnel-status:
	@./scripts/serverctl.sh tunnel-status

tunnel-logs:
	@./scripts/serverctl.sh tunnel-logs

autostart: autostart-status

autostart-start:
	@./scripts/serverctl.sh autostart-start

autostart-stop:
	@./scripts/serverctl.sh autostart-stop

autostart-status:
	@./scripts/serverctl.sh autostart-status

serwerstart: autostart-start

serwerstop: autostart-stop
