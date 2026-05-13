from rq import Queue, Worker

from app.queue import get_redis_connection


def run_worker():
  connection = get_redis_connection()
  queue = Queue('mannequin', connection=connection)
  worker = Worker([queue], connection=connection)
  worker.work(with_scheduler=True)


if __name__ == '__main__':
  run_worker()
