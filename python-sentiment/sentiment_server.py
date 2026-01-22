from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

from intent_detector import detect_intents
from query_grouper import group_queries
from descriptive_grouper import group_descriptive
from growth_insights import generate_growth_insights
from strategy_agent import decide_strategy, get_top_queries_for_content, build_agent_output
from llm_generator import build_prompt, generate_insight, generate_growth_content

app = FastAPI()


class AnalyzeRequest(BaseModel):
    comments: List[str]


@app.get("/health")
def health():
    print("[HEALTH CHECK] Service is running")
    return {"status": "ok", "service": "sentiment_server"}


@app.post("/analyze-simple")
def analyze_simple(payload: AnalyzeRequest):
    print("\n================ ANALYZE SIMPLE ================")
    print(f"[INPUT] Total comments received: {len(payload.comments)}")
    print("[COMMENTS]")
    for c in payload.comments:
        print("-", c)

    intents = detect_intents(payload.comments)
    print("\n[INTENTS DETECTED]")
    print(intents)

    grouped = {
        "queries": group_queries(intents["queries"]),
        "descriptive": group_descriptive(intents["descriptive"])
    }

    print("\n[GROUPED QUERIES]")
    print(grouped["queries"])

    print("\n[GROUPED DESCRIPTIVE]")
    print(grouped["descriptive"])

    response = {
        "intents": intents,
        "grouped": grouped,
        "stats": {
            "total_comments": len(payload.comments),
            "queries": len(intents["queries"]),
            "descriptive": len(intents["descriptive"])
        }
    }

    print("\n[FINAL RESPONSE]")
    print(response)
    print("==============================================\n")

    return response


@app.post("/analyze-competitor")
def analyze(payload: AnalyzeRequest):
    print("\n============= ANALYZE COMPETITOR =============")
    print(f"[INPUT] Comments count: {len(payload.comments)}")

    intents = detect_intents(payload.comments)
    print("\n[INTENTS]")
    print(intents)

    grouped = {
        "queries": group_queries(intents["queries"]),
        "descriptive": group_descriptive(intents["descriptive"])
    }

    print("\n[GROUPED DATA]")
    print(grouped)

    prompt = build_prompt(grouped)
    print("\n[LLM PROMPT]")
    print(prompt)

    insight = generate_insight(prompt)
    print("\n[LLM INSIGHT OUTPUT]")
    print(insight)

    print("============================================\n")

    return {
        "insight": insight
    }


@app.post("/analyze-summary")
def analyze_summary(payload: AnalyzeRequest):
    print("\n============= ANALYZE SUMMARY =============")
    print(f"[INPUT] Total comments: {len(payload.comments)}")

    intents = detect_intents(payload.comments)
    print("\n[INTENTS]")
    print(intents)

    grouped = {
        "queries": group_queries(intents["queries"]),
        "descriptive": group_descriptive(intents["descriptive"])
    }

    print("\n[GROUPED QUERIES]")
    print(grouped["queries"])

    print("\n[GROUPED DESCRIPTIVE]")
    print(grouped["descriptive"])

    sorted_queries = sorted(grouped["queries"].items(), key=lambda x: len(x[1]), reverse=True)
    top_queries = [k for k, v in sorted_queries if v][:3]

    sorted_descriptive = sorted(grouped["descriptive"].items(), key=lambda x: len(x[1]), reverse=True)
    top_descriptive = [k for k, v in sorted_descriptive if v][:3]

    print("\n[TOP QUERIES]", top_queries)
    print("[TOP DESCRIPTIVE]", top_descriptive)

    summary_prompt = f"""Based on these Instagram comments, provide a 7-line executive summary:

Total comments analyzed: {len(payload.comments)}
Question-type comments: {len(intents["queries"])}
Descriptive comments: {len(intents["descriptive"])}

Top query topics: {', '.join(top_queries) if top_queries else 'None'}
Top descriptive themes: {', '.join(top_descriptive) if top_descriptive else 'None'}

Sample comments: {', '.join([f'"{c}"' for c in payload.comments[:5]])}
"""

    print("\n[SUMMARY PROMPT]")
    print(summary_prompt)

    summary = generate_insight(summary_prompt)
    print("\n[SUMMARY OUTPUT]")
    print(summary)

    total = len(payload.comments)
    positive_count = len(grouped["descriptive"]["positive_features"])
    curious_count = len(intents["queries"])
    neutral_count = max(0, total - positive_count - curious_count)

    response = {
        "summary": summary,
        "stats": {
            "total_comments": total,
            "queries": curious_count,
            "descriptive": len(intents["descriptive"])
        },
        "positive": round((positive_count / total * 100)) if total > 0 else 0,
        "curious": round((curious_count / total * 100)) if total > 0 else 0,
        "neutral": round((neutral_count / total * 100)) if total > 0 else 0
    }

    print("\n[FINAL SUMMARY RESPONSE]")
    print(response)
    print("============================================\n")

    return response


@app.post("/growth-strategy")
def growth_strategy(payload: AnalyzeRequest):
    print("\n=========== GROWTH STRATEGY PIPELINE ===========")
    print(f"[INPUT] Total comments: {len(payload.comments)}")

    intents = detect_intents(payload.comments)
    print("\n[STAGE 1 - INTENTS]")
    print(intents)

    grouped_queries = group_queries(intents["queries"])
    grouped_descriptive = group_descriptive(intents["descriptive"])

    print("\n[STAGE 2 - GROUPED QUERIES]")
    print(grouped_queries)

    print("\n[STAGE 2 - GROUPED DESCRIPTIVE]")
    print(grouped_descriptive)

    insights_output = generate_growth_insights(intents, grouped_queries, grouped_descriptive)
    insights = insights_output["insights"]
    metrics = insights_output["metrics"]

    print("\n[STAGE 3 - INSIGHTS]")
    print(insights)

    print("\n[STAGE 3 - METRICS]")
    print(metrics)

    strategy = decide_strategy(insights, grouped_queries)
    print("\n[STAGE 4 - STRATEGY]")
    print(strategy)

    top_queries = get_top_queries_for_content(grouped_queries, limit=5)
    print("\n[TOP QUERIES FOR CONTENT]")
    print(top_queries)

    agent_output = build_agent_output(insights, strategy, metrics, top_queries)
    print("\n[AGENT OUTPUT]")
    print(agent_output)

    content_ideas = generate_growth_content(agent_output)
    print("\n[GENERATED CONTENT IDEAS]")
    print(content_ideas)

    response = {
        "stage": "growth_strategy",
        "insights_detected": [
            {
                "issue": i["issue"],
                "signal": i["signal"],
                "severity": i["severity"]
            }
            for i in insights
        ],
        "strategy": {
            "content_pillars": strategy["content_pillars"],
            "posting_frequency": strategy["posting_frequency"],
            "primary_goal": strategy["primary_goal"],
            "tone": strategy["tone"],
            "cta": strategy["cta"]
        },
        "metrics": metrics,
        "content_ideas": content_ideas
    }

    print("\n[FINAL RESPONSE]")
    print(response)
    print("===============================================\n")

    return response
