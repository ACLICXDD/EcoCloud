from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from models import DataCenter, Event, JobRecord


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class InMemoryState:
    def __init__(self) -> None:
        self._lock = Lock()
        self._datacenters: dict[str, DataCenter] = {
            "dc-us-east": DataCenter(
                dc_id="dc-us-east",
                region="us-east",
                latency_ms=35,
                energy_cost_per_kwh=0.12,
                carbon_intensity_gco2_per_kwh=410,
                total_cpu=128,
                total_gpu=16,
                total_ram=512,
                free_cpu=128,
                free_gpu=16,
                free_ram=512,
            ),
            "dc-us-west": DataCenter(
                dc_id="dc-us-west",
                region="us-west",
                latency_ms=55,
                energy_cost_per_kwh=0.09,
                carbon_intensity_gco2_per_kwh=290,
                total_cpu=96,
                total_gpu=12,
                total_ram=384,
                free_cpu=96,
                free_gpu=12,
                free_ram=384,
            ),
            "dc-eu-central": DataCenter(
                dc_id="dc-eu-central",
                region="eu-central",
                latency_ms=80,
                energy_cost_per_kwh=0.15,
                carbon_intensity_gco2_per_kwh=140,
                total_cpu=144,
                total_gpu=20,
                total_ram=768,
                free_cpu=144,
                free_gpu=20,
                free_ram=768,
            ),
        }
        self._jobs: dict[str, JobRecord] = {}
        self._events: list[Event] = []
        self._event_id = 0

    def add_event(self, event_type: str, payload: dict) -> Event:
        with self._lock:
            self._event_id += 1
            event = Event(event_id=self._event_id, event_type=event_type, payload=payload)
            self._events.append(event)
            return event

    def list_events(self, since: int) -> list[Event]:
        with self._lock:
            return [event.model_copy(deep=True) for event in self._events if event.event_id > since]

    def list_datacenters(self) -> list[DataCenter]:
        with self._lock:
            return [dc.model_copy(deep=True) for dc in self._datacenters.values()]

    def get_datacenter(self, dc_id: str) -> Optional[DataCenter]:
        with self._lock:
            dc = self._datacenters.get(dc_id)
            return dc.model_copy(deep=True) if dc else None

    def create_job(self, job: JobRecord) -> bool:
        with self._lock:
            if job.job_id in self._jobs:
                return False
            self._jobs[job.job_id] = job
            return True

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        with self._lock:
            job = self._jobs.get(job_id)
            return job.model_copy(deep=True) if job else None

    def assign_job(self, job_id: str, dc_id: str, score: float) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            dc = self._datacenters.get(dc_id)
            if not job or not dc:
                return False
            if dc.free_cpu < job.cpu or dc.free_gpu < job.gpu or dc.free_ram < job.ram:
                return False
            dc.free_cpu -= job.cpu
            dc.free_gpu -= job.gpu
            dc.free_ram -= job.ram
            job.status = "scheduled"
            job.assigned_dc = dc_id
            job.assignment_score = score
            return True

    def mark_running(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job.status = "running"
            job.started_at = utc_now()
            return True

    def complete_job(self, job_id: str, runtime_s: int, energy_kwh: float, carbon_kg: float) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job or not job.assigned_dc:
                return False
            dc = self._datacenters.get(job.assigned_dc)
            if not dc:
                return False
            dc.free_cpu = min(dc.total_cpu, dc.free_cpu + job.cpu)
            dc.free_gpu = min(dc.total_gpu, dc.free_gpu + job.gpu)
            dc.free_ram = min(dc.total_ram, dc.free_ram + job.ram)
            job.status = "completed"
            job.runtime_s = runtime_s
            job.energy_kwh = round(energy_kwh, 5)
            job.carbon_kg = round(carbon_kg, 5)
            job.completed_at = utc_now()
            return True

    def fail_job(self, job_id: str, reason: str, release_capacity: bool = False) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            if release_capacity and job.assigned_dc:
                dc = self._datacenters.get(job.assigned_dc)
                if dc:
                    dc.free_cpu = min(dc.total_cpu, dc.free_cpu + job.cpu)
                    dc.free_gpu = min(dc.total_gpu, dc.free_gpu + job.gpu)
                    dc.free_ram = min(dc.total_ram, dc.free_ram + job.ram)
            job.status = "failed"
            job.failure_reason = reason
            job.completed_at = utc_now()
            return True

