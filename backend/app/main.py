from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import dinosaurs, fossils, news

app = FastAPI(title="Dinosaur & Fossil API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dinosaurs.router)
app.include_router(fossils.router)
app.include_router(news.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "dinosaur-fossil-api"}
