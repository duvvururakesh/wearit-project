from typing import Literal

from pydantic import BaseModel, Field


JobCategory = Literal['tops', 'bottoms', 'shoes']
JobView = Literal['front', 'back', 'outside', 'inside']
ModelTier = Literal['pro']
AspectRatio = Literal['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3']
BodyType = Literal['male', 'female']
Perspective = Literal['front', 'front_left', 'front_right', 'back', 'back_left', 'back_right']
Background = Literal['white', 'transparent']
RemoteStatus = Literal['queued', 'processing', 'completed', 'failed']


class JobInput(BaseModel):
  view: JobView
  imageDataUrl: str = Field(min_length=1)


class CreateMannequinJobRequest(BaseModel):
  category: JobCategory
  shoeSide: Literal['left', 'right'] | None = None
  renderMode: Literal['ghost_mannequin'] = 'ghost_mannequin'
  prompt: str | None = None
  modelTier: ModelTier | None = 'pro'
  aspectRatio: AspectRatio | None = '1:1'
  bodyType: BodyType | None = 'male'
  perspective: Perspective | None = 'front'
  background: Background | None = 'white'
  inputs: list[JobInput] = Field(min_length=1)
  metadata: dict[str, str] | None = None


class CreateMannequinJobResponse(BaseModel):
  jobId: str
  status: RemoteStatus
  pollAfterMs: int = 2500


class MannequinJobResult(BaseModel):
  modelUrl: str
  previewImageUrl: str | None = None
  manifestUrl: str | None = None


class JobError(BaseModel):
  code: str
  message: str
  retryable: bool | None = None


class GetMannequinJobResponse(BaseModel):
  jobId: str
  status: RemoteStatus
  progressPercent: int | None = None
  pollAfterMs: int | None = None
  result: MannequinJobResult | None = None
  error: JobError | None = None
