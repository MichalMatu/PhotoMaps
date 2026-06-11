.PHONY: start stop restart status logs check api-flow api-contract e2e smoke perf-smoke quality dev health

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
