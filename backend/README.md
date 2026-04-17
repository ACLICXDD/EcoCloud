# EcoCloud Backend MVP

## Run

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `GET /datacenters`
- `POST /schedule`
- `GET /jobs/{job_id}`
- `GET /events?since=0`

## Quick Demo Calls

```bash
curl -s http://127.0.0.1:8000/health
```

```bash
curl -s -X POST http://127.0.0.1:8000/schedule \
  -H "content-type: application/json" \
  -d '{
    "job_id": "job-123",
    "cpu": 4,
    "gpu": 1,
    "ram": 16,
    "deadline": 200,
    "priority": "high",
    "region_preference": "us-east"
  }'
```

```bash
curl -s http://127.0.0.1:8000/jobs/job-123
```

```bash
curl -s "http://127.0.0.1:8000/events?since=0"
```
