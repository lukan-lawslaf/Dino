from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Dinosaur(Base):
    __tablename__ = "dinosaurs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    diet: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str | None] = mapped_column(String, nullable=True)
    family: Mapped[str | None] = mapped_column(String, nullable=True)
    class_name: Mapped[str | None] = mapped_column(String, nullable=True)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    period: Mapped[str | None] = mapped_column(String, nullable=True)
    length_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    taxonomy: Mapped[str | None] = mapped_column(String, nullable=True)
    named_by: Mapped[str | None] = mapped_column(String, nullable=True)
    species: Mapped[str | None] = mapped_column(String, nullable=True)
    link: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    image_thumb_url: Mapped[str | None] = mapped_column(String, nullable=True)
    wikipedia_url: Mapped[str | None] = mapped_column(String, nullable=True)
    model_3d_url: Mapped[str | None] = mapped_column(String, nullable=True)
    model_3d_source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    model_3d_attribution: Mapped[str | None] = mapped_column(String, nullable=True)

    fossil_occurrences: Mapped[list["FossilOccurrence"]] = relationship(
        back_populates="dinosaur", cascade="all, delete-orphan"
    )


class FossilOccurrence(Base):
    __tablename__ = "fossil_occurrences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dinosaur_id: Mapped[int] = mapped_column(ForeignKey("dinosaurs.id"), index=True, nullable=False)
    occurrence_no: Mapped[str | None] = mapped_column(String, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    early_interval: Mapped[str | None] = mapped_column(String, nullable=True)
    late_interval: Mapped[str | None] = mapped_column(String, nullable=True)
    max_ma: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_ma: Mapped[float | None] = mapped_column(Float, nullable=True)
    formation: Mapped[str | None] = mapped_column(String, nullable=True)
    country_or_region: Mapped[str | None] = mapped_column(String, nullable=True)
    collection_name: Mapped[str | None] = mapped_column(String, nullable=True)

    dinosaur: Mapped["Dinosaur"] = relationship(back_populates="fossil_occurrences")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    link: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    published_at: Mapped[str | None] = mapped_column(String, nullable=True)  # ISO 8601 string
    fetched_at: Mapped[str] = mapped_column(String, nullable=False)  # ISO 8601 string
