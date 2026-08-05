.PHONY: help up down restart logs build test lint clean init-kafka

help:
	@echo "IceStream — Real-Time Lakehouse Observability Platform"
	@echo "Available commands:"
	@echo "  make up          - Start all services with Docker Compose"
	@echo "  make down        - Stop all containers"
	@echo "  make build       - Rebuild all Docker images"
	@echo "  make restart     - Restart all containers"
	@echo "  make logs        - Tail logs from all containers"
	@echo "  make test        - Run Python test suite"
	@echo "  make lint        - Run linting and TypeScript checks"
	@echo "  make clean       - Remove volumes and build artifacts"

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

build:
	docker compose build

test:
	pytest tests/ -v

lint:
	npm run lint

clean:
	docker compose down -v
	rm -rf dist node_modules
