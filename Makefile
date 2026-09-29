.PHONY: help build build-nc up up-build down kill-port fresh down-v restart logs logs-backend logs-frontend shell-backend shell-db migrate test test-integration simulate seed lint clean

# Variables
DOCKER_COMPOSE = docker compose

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build docker containers
	$(DOCKER_COMPOSE) build

build-nc: ## Build docker containers without cache
	$(DOCKER_COMPOSE) build --no-cache

up: ## Start docker containers in detached mode
	$(DOCKER_COMPOSE) up -d

up-build: ## Build and start docker containers in detached mode
	$(DOCKER_COMPOSE) up -d --build

down: ## Stop docker containers
	$(DOCKER_COMPOSE) down

kill-port: ## Kill processes using ports 3000 and 4000
	@echo "Checking for processes on ports 3000 and 4000..."
	@for PORT in 3000 4000; do \
		PIDS=$$(lsof -Pi :$$PORT -sTCP:LISTEN -t 2>/dev/null); \
		if [ -n "$$PIDS" ]; then \
			echo "Found processes on port $$PORT: $$PIDS"; \
			for pid in $$PIDS; do \
				kill -15 $$pid 2>/dev/null || true; \
			done; \
			echo "Port $$PORT cleared."; \
		else \
			echo "Port $$PORT is already free."; \
		fi; \
	done

fresh: kill-port down up-build ## Full restart: kill ports, rebuild, and start

down-v: ## Stop docker containers and remove volumes
	$(DOCKER_COMPOSE) down -v

restart: ## Restart docker containers
	$(DOCKER_COMPOSE) restart

logs: ## View logs of all containers (follow mode)
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## View backend container logs
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## View frontend container logs
	$(DOCKER_COMPOSE) logs -f frontend

shell-backend: ## Access backend container shell
	$(DOCKER_COMPOSE) exec backend sh

shell-db: ## Access PostgreSQL shell
	$(DOCKER_COMPOSE) exec postgres psql -U api_sentinel -d api_sentinel

migrate: ## Run database migrations
	$(DOCKER_COMPOSE) exec backend npx tsx scripts/migrate.ts

test: ## Run backend unit tests
	cd backend && npm test

test-integration: ## Run backend integration tests (requires running containers)
	cd backend && npm run test:integration

simulate: ## Seed database with test incidents via LLM
	cd backend && npm run simulate

lint: ## Lint frontend code
	cd frontend && npm run lint

clean: ## Remove all stopped containers, networks, images, and volumes
	docker system prune -a --volumes
