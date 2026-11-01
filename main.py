
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

from groq_service import generate_posts, regenerate_post

app = FastAPI(title="AI Social Media Content Planner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class Brief(BaseModel):
    business: str
    product: str = ""

    # New product-specific fields
    product_name: str = ""
    product_description: str = ""
    product_features: str = ""
    product_category: str = ""

    audience: str
    goal: str = "Increase brand awareness"
    tone: str = "Friendly and informative"
    format: str = "Any format"
    language: str = "English"
    platforms: List[str]
    posts_per_platform: int = Field(default=3, ge=1, le=7)
    start_date: str = ""


class Regen(BaseModel):
    business: str
    product: str = ""

    # New product-specific fields
    product_name: str = ""
    product_description: str = ""
    product_features: str = ""
    product_category: str = ""

    audience: str
    goal: str = "Increase brand awareness"
    tone: str = "Friendly and informative"
    format: str = "Any format"
    language: str = "English"
    platform: str
    previous_caption: str = ""


@app.get("/")
def home():
    return {
        "message": "SocialPilot AI backend is running!"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/api/generate")
def generate(request: Brief):
    try:
        posts = generate_posts(request.model_dump())

        return {
            "message": "Content generated successfully",
            "posts": posts
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/api/regenerate")
def regenerate(request: Regen):
    try:
        post = regenerate_post(request.model_dump())

        return {
            "message": "Post regenerated successfully",
            "post": post
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
