from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from rq.job import Job
from rq.exceptions import NoSuchJobError

from app.config import settings
from app.queue import get_mannequin_queue, get_redis_connection
from app.schemas import (
  CreateMannequinJobRequest,
  CreateMannequinJobResponse,
  GetMannequinJobResponse,
  JobError,
  MannequinJobResult,
)


def map_rq_status(status: str) -> str:
  if status in {'queued', 'deferred', 'scheduled'}:
    return 'queued'
  if status in {'started'}:
    return 'processing'
  if status in {'finished'}:
    return 'completed'
  return 'failed'


def format_failed_job(job: Job) -> JobError:
  message = 'Mannequin processing failed'
  if job.exc_info:
    lines = [line for line in job.exc_info.splitlines() if line.strip()]
    if lines:
      message = lines[-1]
  return JobError(code='job_failed', message=message, retryable=True)


app = FastAPI(title='Wearit Mannequin API', version='0.1.0')

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origins,
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)

output_dir = Path(settings.output_dir)
output_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.public_output_base, StaticFiles(directory=output_dir), name='outputs')

api = APIRouter(prefix=settings.api_base_path)


@api.get('/health')
def health():
  return {'ok': True}


@api.post('/mannequin/jobs', response_model=CreateMannequinJobResponse)
def create_job(payload: CreateMannequinJobRequest):
  queue = get_mannequin_queue()
  job = queue.enqueue('app.tasks.process_mannequin_job', payload.model_dump(mode='json'))
  return CreateMannequinJobResponse(jobId=job.id, status='queued', pollAfterMs=2500)


@api.get('/mannequin/jobs/{job_id}', response_model=GetMannequinJobResponse)
def get_job(job_id: str):
  try:
    job = Job.fetch(job_id, connection=get_redis_connection())
  except NoSuchJobError as error:
    raise HTTPException(status_code=404, detail='Job not found') from error

  status = map_rq_status(job.get_status())
  progress = job.meta.get('progressPercent') if isinstance(job.meta, dict) else None

  if status == 'completed':
    result = MannequinJobResult.model_validate(job.result or {})
    return GetMannequinJobResponse(
      jobId=job.id,
      status='completed',
      progressPercent=100 if progress is None else int(progress),
      result=result,
    )

  if status == 'failed':
    return GetMannequinJobResponse(
      jobId=job.id,
      status='failed',
      progressPercent=int(progress) if progress is not None else None,
      error=format_failed_job(job),
    )

  return GetMannequinJobResponse(
    jobId=job.id,
    status=status,
    progressPercent=int(progress) if progress is not None else None,
    pollAfterMs=2500,
  )


app.include_router(api)
