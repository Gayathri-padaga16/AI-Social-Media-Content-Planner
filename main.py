
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

from groq_service import (
    generate_posts,
    regenerate_post,
    review_post
)


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="AI Social Media Content Planner",
    description="AI-powered social media planning, generation and review system",
    version="1.1.0"
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

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


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class Brief(BaseModel):
    business: str
    product: str = ""

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
    posts_per_platform: int = Field(
        default=3,
        ge=1,
        le=7
    )

    start_date: str = ""


class Regen(BaseModel):
    business: str
    product: str = ""

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


class ReviewRequest(BaseModel):
    platform: str
    content_type: str = ""
    language: str = "English"

    product: str = ""
    audience: str = ""

    caption: str
    hashtags: List[str] = Field(default_factory=list)

    call_to_action: str = ""
    creative_idea: str = ""


# --------------------------------------------------
# HOME ROUTE
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "SocialPilot AI backend is running!"
    }


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "message": "Backend is healthy"
    }


# --------------------------------------------------
# GENERATE SOCIAL MEDIA CONTENT
# --------------------------------------------------

@app.post("/api/generate")
def generate(request: Brief):

    try:
        posts = generate_posts(
            request.model_dump()
        )

        return {
            "message": "Content generated successfully",
            "posts": posts
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# REGENERATE INDIVIDUAL POST
# --------------------------------------------------

@app.post("/api/regenerate")
def regenerate(request: Regen):

    try:
        post = regenerate_post(
            request.model_dump()
        )

        return {
            "message": "Post regenerated successfully",
            "post": post
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# AI CONTENT REVIEW AGENT
# --------------------------------------------------

@app.post("/api/review")
def review(request: ReviewRequest):

    try:
        result = review_post(
            request.model_dump()
        )

        return {
            "message": "Content reviewed successfully",
            "review": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# RUN APPLICATION
# --------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
