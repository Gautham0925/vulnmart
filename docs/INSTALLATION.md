# Installation

## Docker (recommended)
```
docker compose up -d --build        # training mode (.env.training)
ENV_FILE=.env.development docker compose up -d --build   # secure by default
./reset.sh                          # wipe volumes and rebuild
```
App: http://localhost:8080 (bound to 127.0.0.1 only). API docs: http://localhost:8080/docs

## Local development
```
cd backend && pip install -r requirements.txt
# PostgreSQL 16 with user/db vulnmarket (password vulnmarket_local)
python -m app.seed --reset
python -m uvicorn app.main:app --port 8000
cd ../frontend && npm install && npm run dev      # http://localhost:5173
```
## Tests
```
cd backend && python -m pytest tests -q
cd frontend && npx playwright test          # needs the dev stack running and Chrome
```
