
import os
import json
import re
import requests

from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()

SUPPORTED_LANGUAGES = ["English", "Telugu", "Hindi"]


def ask(system, prompt):
    key = os.getenv("GROQ_API_KEY")

    if not key:
        raise RuntimeError(
            "GROQ_API_KEY is missing from the root .env file."
        )

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": os.getenv(
            "GROQ_MODEL",
            "openai/gpt-oss-120b"
        ),
        "temperature": 0.8,
        "max_completion_tokens": 6000,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=90
    )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Groq API error {response.status_code}: "
            f"{response.text[:500]}"
        )

    return response.json()["choices"][0]["message"]["content"]


def parsed(content):
    content = content.strip()

    content = re.sub(
        r"^```(?:json)?\s*",
        "",
        content,
        flags=re.IGNORECASE
    )

    content = re.sub(r"\s*```$", "", content)

    try:
        return json.loads(content)

    except json.JSONDecodeError:
        decoder = json.JSONDecoder()

        for index, char in enumerate(content):
            if char in "{[":
                try:
                    result, _ = decoder.raw_decode(content[index:])
                    return result
                except json.JSONDecodeError:
                    continue

        raise RuntimeError(
            "AI returned invalid JSON. Please try again."
        )


def get_language(language):
    if language not in SUPPORTED_LANGUAGES:
        raise RuntimeError(
            "Please select English, Telugu or Hindi."
        )

    language_instructions = {
        "English": """
Write all audience-facing content in natural English.
""",

        "Telugu": """
Write all audience-facing content in natural Telugu
using Telugu script (తెలుగు లిపి).

Use conversational Telugu suitable for social media.
Do not write Telugu using English letters.
Do not translate word-for-word from English.
Keep brand names and product names unchanged when appropriate.
""",

        "Hindi": """
Write all audience-facing content in natural Hindi
using Devanagari script (हिन्दी लिपि).

Use conversational Hindi suitable for social media.
Do not write Hindi using English letters.
Do not translate word-for-word from English.
Keep brand names and product names unchanged when appropriate.
"""
    }

    return language_instructions[language]


def product_instructions(b):
    product_name = b.get("product_name", "").strip()
    description = b.get("product_description", "").strip()
    features = b.get("product_features", "").strip()
    category = b.get("product_category", "").strip()

    return f"""
PRODUCT-SPECIFIC INFORMATION:

General product or service:
{b.get('product', '')}

Exact product name:
{product_name or 'Not provided'}

Product description:
{description or 'Not provided'}

Special product features:
{features or 'Not provided'}

Product category:
{category or 'Not provided'}

IMPORTANT PRODUCT RULES:

- Use the exact product name provided by the business owner.
- Do not replace the specific product name with a generic description.
- Describe the actual product using the supplied description and features.
- Make captions relevant to the particular product.
- Use product-specific hashtags.
- Connect the product to the selected marketing goal.
- Do not invent materials, dimensions, prices, discounts,
  customization options, delivery details, or product features.
- If a detail is not supplied, do not make it up.
- If the exact product name is missing, use the general
  product or service description naturally.
- Keep the original product name unchanged in English,
  Telugu and Hindi content.
"""


def reel_script_instructions():
    return """
For Reel content, create a complete video production script.

Include:

1. hook:
An attention-grabbing opening.

2. duration:
Total video duration, preferably 15-30 seconds.

3. scenes:
Create 3-5 scenes.

Every scene must contain:
- time: Scene timing, for example 0-3 seconds.
- visual: What should appear in the video.
- voiceover: Exact words to speak.
- on_screen_text: Text displayed on the screen.

4. music_suggestion:
Suggest a suitable background music style.

5. ending:
Describe the final visual and closing call to action.

The hook, voice-over, on-screen text and ending
must be written in the selected language.

Make the script practical for mobile-phone recording.
Use the supplied product information when planning
the Reel scenes.
"""


def generate_posts(b):
    start = (
        date.fromisoformat(b["start_date"])
        if b.get("start_date")
        else date.today()
    )

    posts_per_platform = int(b["posts_per_platform"])

    if posts_per_platform < 1 or posts_per_platform > 7:
        raise RuntimeError(
            "Posts per platform must be between 1 and 7."
        )

    if not b["platforms"]:
        raise RuntimeError(
            "Please select at least one platform."
        )

    selected_format = b.get("format", "Any format")
    language = b.get("language", "English")

    language_instruction = get_language(language)
    product_details = product_instructions(b)

    plan = []

    for platform in b["platforms"]:
        for i in range(posts_per_platform):
            scheduled_date = start + timedelta(
                days=i * max(1, 7 // posts_per_platform)
            )

            plan.append({
                "platform": platform,
                "date": scheduled_date.isoformat()
            })

    prompt = f"""
Create exactly {len(plan)} original social media
content pieces.

CAMPAIGN DETAILS:

Business: {b['business']}
Target audience: {b['audience']}
Marketing goal: {b['goal']}
Brand tone: {b['tone']}
Selected content format: {selected_format}
Selected language: {language}

{product_details}

LANGUAGE REQUIREMENTS:

{language_instruction}

IMPORTANT:
- All captions must use the selected language.
- Calls to action must use the selected language.
- Carousel slide text must use the selected language.
- Story frames must use the selected language.
- Reel hooks, voice-overs and on-screen text
  must use the selected language.
- Hashtags should be relevant to the selected language
  and audience. Brand hashtags may remain unchanged.
- Do not mix languages unless requested.
- Keep brand and product names unchanged where appropriate.
- Make every post specific to the supplied product.
- Do not generate generic captions when product details
  have been provided.

SCHEDULE:
{json.dumps(plan, indent=2)}

CONTENT FORMAT INSTRUCTIONS:

1. Post:
Write a complete and engaging product-specific caption.

2. Carousel:
Create 4-6 slides.
Include slide-by-slide details in creative_idea.
Use the actual product name and features.

3. Reel:
{reel_script_instructions()}

4. Story:
Create 3-5 short story frames.
Include frame-by-frame details in creative_idea.

5. Any format:
Choose the most suitable format for the platform
and campaign goal.

GENERAL RULES:

- Follow the selected content format.
- Adapt content to each social media platform.
- Avoid repeating captions.
- Use the requested brand tone.
- Do not invent business facts or statistics.
- Do not invent product features.
- Generate exactly one item for each schedule entry.
- Return valid JSON only.

Return ONLY JSON in this structure:

{{
  "posts": [
    {{
      "platform": "Instagram",
      "date": "YYYY-MM-DD",
      "content_type": "Reel",
      "caption": "Product-specific caption",
      "hashtags": ["#Example"],
      "call_to_action": "CTA",
      "creative_idea": "Creative direction",
      "reel_script": {{
        "hook": "Opening hook",
        "duration": "20 seconds",
        "scenes": [
          {{
            "time": "0-3 seconds",
            "visual": "Visual description",
            "voiceover": "Spoken words",
            "on_screen_text": "Screen text"
          }}
        ],
        "music_suggestion": "Music style",
        "ending": "Final visual and CTA"
      }}
    }}
  ]
}}

For non-Reel posts, set reel_script to null.
"""

    data = parsed(
        ask(
            "You are an expert social media strategist, "
            "multilingual content creator and video scriptwriter. "
            "Create specific, useful product-focused content. "
            "Return valid JSON only.",
            prompt
        )
    )

    posts = (
        data.get("posts", [])
        if isinstance(data, dict)
        else data
    )

    if not isinstance(posts, list):
        raise RuntimeError(
            "AI returned an invalid posts structure."
        )

    if len(posts) != len(plan):
        raise RuntimeError(
            f"Expected {len(plan)} posts, but AI returned "
            f"{len(posts)}. Please try again."
        )

    results = []

    for i, post in enumerate(posts):
        if not isinstance(post, dict):
            raise RuntimeError("AI returned an invalid post.")

        post["id"] = str(i)
        post["source"] = "LIVE GROQ AI"
        post["platform"] = plan[i]["platform"]
        post["date"] = plan[i]["date"]

        if post.get("content_type", "").lower() == "reel":
            post.setdefault("reel_script", None)
        else:
            post["reel_script"] = None

        results.append(post)

    return results


def regenerate_post(b):
    selected_format = b.get("format", "Any format")
    language = b.get("language", "English")

    language_instruction = get_language(language)
    product_details = product_instructions(b)

    prompt = f"""
Create one completely fresh social media content piece.

CAMPAIGN DETAILS:

Business: {b['business']}
Audience: {b['audience']}
Goal: {b['goal']}
Tone: {b['tone']}
Platform: {b['platform']}
Selected format: {selected_format}
Selected language: {language}

{product_details}

LANGUAGE REQUIREMENTS:

{language_instruction}

Previous caption:
{b.get('previous_caption', '')}

REQUIREMENTS:

- Create a completely different idea and caption.
- Use the exact product name when supplied.
- Make the content specific to the actual product.
- Follow the selected content format.
- Adapt it to the selected platform.
- Include suitable hashtags.
- Include a clear call to action.
- Do not invent facts, prices or product features.
- Write all audience-facing text in the selected language.
- Do not mix languages unnecessarily.

If the format is Reel, provide a complete video script:

{reel_script_instructions()}

If the format is not Reel, set reel_script to null.

Return ONLY valid JSON:

{{
  "caption": "New product-specific caption",
  "hashtags": ["#Example"],
  "call_to_action": "CTA",
  "creative_idea": "Creative direction",
  "content_type": "Reel",
  "reel_script": {{
    "hook": "Opening hook",
    "duration": "20 seconds",
    "scenes": [
      {{
        "time": "0-3 seconds",
        "visual": "Visual description",
        "voiceover": "Spoken words",
        "on_screen_text": "Screen text"
      }}
    ],
    "music_suggestion": "Music style",
    "ending": "Final visual and CTA"
  }}
}}
"""

    result = parsed(
        ask(
            "You are a professional multilingual social media "
            "copywriter and short-form video scriptwriter. "
            "Create specific product-focused content. "
            "Return valid JSON only.",
            prompt
        )
    )

    if not isinstance(result, dict):
        raise RuntimeError(
            "AI returned an invalid regenerated post."
        )

    if result.get("content_type", "").lower() != "reel":
        result["reel_script"] = None
    else:
        result.setdefault("reel_script", None)

    return result
