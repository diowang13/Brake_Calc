# Brake Calc Docker Deployment

## Local run

```bash
docker compose up -d --build
```

Health check:

```bash
curl http://localhost/api/health
```

## Deploy to server

1. `git pull`
2. `docker compose up -d --build`
3. Visit `http://<server-ip>`

## Data persistence

SQLite database is persisted in Docker volume `brake_calc_data`.
