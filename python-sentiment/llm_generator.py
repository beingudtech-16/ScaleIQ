import json
import os
from dotenv import load_dotenv
import requests

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ===== LEGACY: Analytics Prompt =====
SYSTEM_PROMPT = """
You are a business analyst.
Analyze Instagram comments and extract:
1. Pricing concerns
2. Customer objections
3. Positive selling points
4. Actionable recommendations.

Return the output in bullet points.
"""

# ===== NEW: Growth-Optimized Content Generation =====
GROWTH_CONTENT_PROMPT = """
You are a social media growth strategist and content creator.

Your task: Generate growth-optimized content based on audience insights and strategy.

AUDIENCE STRATEGY:
{strategy}

TOP AUDIENCE QUESTIONS/PAIN POINTS:
{top_queries}

CONTENT REQUIREMENTS:
- 3 Reel ideas with hooks (30-60 seconds)
- 3 Carousel post ideas
- 2 Captions (short + long)
- 1 CTA optimization

TONE: {tone}
PRIMARY GOAL: Maximize {goal}
POSTING FREQUENCY: {frequency}

OUTPUT FORMAT:
🎬 REEL IDEAS:
[Idea 1]
[Idea 2]
[Idea 3]

📸 CAROUSEL IDEAS:
[Idea 1]
[Idea 2]
[Idea 3]

📝 CAPTIONS:
Short:
[Caption]

Long:
[Caption]

🎯 CTA:
[Optimized call-to-action]
"""

def build_prompt(grouped: dict) -> str:
    """Legacy: Build analytic prompt."""
    return json.dumps(
        {
            "queries": grouped.get("queries", {}),
            "descriptive_feedback": grouped.get("descriptive", {})
        },
        indent=2
    )

def generate_insight(prompt_json: str) -> str:
    """Legacy: Generate insight from grouped data using OpenRouter."""
    
    if not OPENROUTER_API_KEY:
        return "ERROR: OPENROUTER_API_KEY not set in .env file"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "openrouter/auto",  # or specify: "meta-llama/llama-2-70b-chat"
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"DATA:\n{prompt_json}"}
        ],
        "temperature": 0.3,
        "max_tokens": 400
    }
    
    response = requests.post(OPENROUTER_URL, json=payload, headers=headers)
    
    if response.status_code != 200:
        return f"ERROR: OpenRouter API error {response.status_code}: {response.text}"
    
    return response.json()["choices"][0]["message"]["content"].strip()


def generate_growth_content(agent_output: dict) -> str:
    """
    NEW: Generate growth-optimized content using strategy via OpenRouter.
    
    Args:
        agent_output: Dict from strategy_agent.build_agent_output()
    
    Returns:
        Structured content ideas + captions + CTA
    """
    
    if not OPENROUTER_API_KEY:
        return "ERROR: OPENROUTER_API_KEY not set in .env file"
    
    strategy = agent_output["strategy"]
    top_queries = agent_output["top_audience_questions"]
    
    # Format strategy info
    strategy_text = f"""
Content Pillars: {', '.join(strategy['content_pillars'])}
Content Types: {', '.join(strategy['content_types'])}
Hooks to use: {', '.join(strategy['hooks'])}
"""
    
    queries_text = "\n".join([f"- {q}" for q in top_queries])
    
    prompt = GROWTH_CONTENT_PROMPT.format(
        strategy=strategy_text,
        top_queries=queries_text,
        tone=strategy["tone"],
        goal=strategy["primary_goal"],
        frequency=strategy["posting_frequency"]
    )
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "openrouter/auto",  # or specify: "meta-llama/llama-2-70b-chat"
        "messages": [
            {"role": "system", "content": "You are a social media growth strategist."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 800
    }
    
    response = requests.post(OPENROUTER_URL, json=payload, headers=headers)
    
    if response.status_code != 200:
        return f"ERROR: OpenRouter API error {response.status_code}: {response.text}"

    return response.json()["choices"][0]["message"]["content"].strip()
