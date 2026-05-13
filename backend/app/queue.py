from redis import Redis
from rq import Queue

from app.config import settings


def get_redis_connection() -> Redis:
  return Redis.from_url(settings.redis_url)


def get_mannequin_queue() -> Queue:
  return Queue('mannequin', connection=get_redis_connection(), default_timeout=900)
