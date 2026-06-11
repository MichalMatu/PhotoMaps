.PHONY: start stop restart status logs check dev health

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

dev: start

health: status
