from typing import List, Dict, Tuple


def decide_strategy(insights: List[Dict], grouped_queries: Dict[str, List[str]]) -> Dict[str, any]:
    """
    Core agent logic: Convert insights into posting strategy.
    
    This is REASONING, not generation.
    It decides WHAT to post, WHY, and GOAL.
    """
    strategy = {
        "content_pillars": [],
        "posting_frequency": "3x per week",  # Default
        "primary_goal": "engagement",
        "content_types": [],
        "hooks": [],
        "cta": "Visit link in bio",
        "tone": "professional"
    }
    
    issue_map = {insight["issue"]: insight for insight in insights}
    
    # RULE 1: Education gap → Educational content
    if "Education gap detected" in issue_map:
        strategy["content_pillars"].append("Educational")
        strategy["content_types"].append("Carousel posts")
        strategy["content_types"].append("Reels")
        strategy["posting_frequency"] = "4x per week"
        strategy["primary_goal"] = "saves"  # Educational content = save rate metric
        strategy["hooks"].append("Common misconceptions")
        strategy["hooks"].append("Step-by-step guides")
        strategy["tone"] = "helpful"
        strategy["cta"] = "Save this for later"
    
    # RULE 2: Price sensitivity → Value-first positioning
    if "Price sensitivity is high" in issue_map:
        strategy["content_pillars"].append("Value-first")
        strategy["content_types"].append("Comparison posts")
        strategy["content_types"].append("ROI breakdowns")
        strategy["hooks"].append("This costs $X but saves you...")
        strategy["hooks"].append("Why [competitor] is expensive")
        strategy["tone"] = "transparent"
        strategy["cta"] = "DM for pricing"
    
    # RULE 3: Booking/availability friction → Process clarity
    if "Booking/availability friction" in issue_map:
        strategy["content_pillars"].append("Process clarity")
        strategy["content_types"].append("Tutorial Reels")
        strategy["content_types"].append("FAQ videos")
        strategy["hooks"].append("Here's how to book in 3 steps")
        strategy["primary_goal"] = "clicks"  # They need to take action
        strategy["posting_frequency"] = "4x per week"
        strategy["cta"] = "Link in bio to book"
    
    # RULE 4: Trust issue → Transparent/proof-based content
    if "Trust/satisfaction issue" in issue_map:
        strategy["content_pillars"].append("Transparency")
        strategy["content_types"].append("Behind-the-scenes")
        strategy["content_types"].append("Customer testimonials")
        strategy["hooks"].append("Here's exactly what happens...")
        strategy["hooks"].append("Real customer story")
        strategy["tone"] = "authentic"
        strategy["cta"] = "Come see for yourself"
    
    # RULE 5: High satisfaction → Advocacy
    if "Strong audience satisfaction" in issue_map:
        strategy["content_pillars"].append("Community")
        strategy["content_types"].append("User-generated content")
        strategy["content_types"].append("Success stories")
        strategy["hooks"].append("Look what our community created")
        strategy["primary_goal"] = "shares"  # Satisfied users will share
        strategy["posting_frequency"] = "5x per week"  # Capitalize on momentum
        strategy["cta"] = "Tag someone who needs this"
    
    # RULE 6: Unknown patterns → Research content
    if "Unknown question patterns" in issue_map:
        strategy["content_pillars"].append("Research-driven")
        strategy["posting_frequency"] = "2x per week"  # More thoughtful, less frequent
    
    # Deduplicate content types
    strategy["content_types"] = list(set(strategy["content_types"]))
    
    # Deduplicate hooks
    strategy["hooks"] = list(set(strategy["hooks"]))
    
    # Determine primary goal based on severity
    critical_issues = [i for i in insights if i.get("severity") == "CRITICAL"]
    if critical_issues:
        strategy["primary_goal"] = "reach"  # When in crisis, maximize visibility
    
    return strategy


def get_top_queries_for_content(grouped_queries: Dict[str, List[str]], limit: int = 5) -> List[str]:
    """Extract top N queries to inform content creation."""
    all_queries = []
    
    for category, queries in grouped_queries.items():
        if category != "other":
            all_queries.extend([(q, category) for q in queries])
    
    # Return just the queries, limit to top N
    return [q[0] for q in all_queries[:limit]]


def build_agent_output(
    insights: List[Dict],
    strategy: Dict,
    metrics: Dict,
    top_queries: List[str]
) -> Dict[str, any]:
    """Bundle everything the LLM needs for content generation."""
    return {
        "strategy": strategy,
        "insights": insights,
        "metrics": metrics,
        "top_audience_questions": top_queries,
        "reasoning": {
            "why_this_strategy": "Based on comment analysis and audience signals",
            "success_metric": f"Optimize for: {strategy['primary_goal']}"
        }
    }
