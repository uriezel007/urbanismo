from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False)

class Evidence(Strict):
    id: str = Field(min_length=1, max_length=100)
    kind: Literal['measured', 'professional_observation', 'hypothetical', 'simulated']
    label: str = Field(min_length=1, max_length=200)
    value: float | str = Field()
    unit: str = Field(max_length=40)
    source: str = Field(min_length=1, max_length=500)
    recorded_at: str = Field(min_length=10, max_length=40)
    limitations: str = Field(min_length=1, max_length=1600)
    run_id: str | None = Field(default=None, max_length=100)

    @model_validator(mode='after')
    def timestamp_and_provenance(self):
        from datetime import datetime
        value = datetime.fromisoformat(self.recorded_at.replace('Z', '+00:00'))
        if value.tzinfo is None:
            raise ValueError('Fecha debe incluir zona horaria')
        if self.kind == 'simulated' and not self.run_id:
            raise ValueError('Resultados simulados requieren run_id')
        if self.kind != 'simulated' and self.run_id:
            raise ValueError('No atribuir una corrida a evidencia medida')
        if isinstance(self.value, str) and len(self.value) > 4000:
            raise ValueError('Texto demasiado largo')
        return self

class Document(Strict):
    schema_version: Literal[1] = 1
    evidence: list[Evidence] = Field(default_factory=list, max_length=10000)
    # Legacy data stays opaque and is never reclassified as measured evidence.
    legacy_archive: str | None = Field(default=None, max_length=4_000_000)
    workspace_archive: str | None = Field(default=None, max_length=8_000_000)
    notes: str = Field(default='', max_length=10000)

    @model_validator(mode='after')
    def unique_ids(self):
        ids = [e.id for e in self.evidence]
        if len(set(ids)) != len(ids):
            raise ValueError('IDs de evidencia repetidos')
        return self

class CreateProject(Strict):
    name: str = Field(min_length=1, max_length=120)
    document: Document = Field(default_factory=Document)

class UpdateProject(CreateProject):
    revision: int = Field(ge=1)

class Credentials(Strict):
    username: str = Field(min_length=3, max_length=100, pattern=r'^[A-Za-z0-9_.@-]+$')
    password: str = Field(min_length=12, max_length=256)
