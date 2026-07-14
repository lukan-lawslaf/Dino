from pydantic import BaseModel, ConfigDict


class FossilOccurrenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    occurrence_no: str | None
    lat: float | None
    lng: float | None
    early_interval: str | None
    late_interval: str | None
    max_ma: float | None
    min_ma: float | None
    formation: str | None
    country_or_region: str | None
    collection_name: str | None


class DinosaurSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    diet: str | None
    period: str | None
    length_m: float | None
    height_m: float | None
    weight: float | None
    image_thumb_url: str | None


class DinosaurDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    diet: str | None
    type: str | None
    family: str | None
    class_name: str | None
    region: str | None
    period: str | None
    length_m: float | None
    height_m: float | None
    weight: float | None
    taxonomy: str | None
    named_by: str | None
    species: str | None
    link: str | None
    image_url: str | None
    image_thumb_url: str | None
    wikipedia_url: str | None
    model_3d_url: str | None
    model_3d_source_url: str | None
    model_3d_attribution: str | None
    fossil_occurrences: list[FossilOccurrenceOut]


class PaginatedDinosaurs(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[DinosaurSummary]


class Model3D(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    model_3d_url: str | None
    model_3d_source_url: str | None
    model_3d_attribution: str | None


class NewsArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    link: str
    summary: str | None
    image_url: str | None
    source_name: str
    published_at: str | None


class PaginatedNews(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[NewsArticleOut]
