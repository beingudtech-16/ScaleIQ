from typing import List, Dict, Tuple


def calculate_intent_distribution(intents_data: Dict) -> Dict[str, float]:
    """Calculate percentage of each intent type."""
    total = len(intents_data.get("queries", [])) + len(intents_data.get("descriptive", []))
    
    if total == 0:
        return {"query": 0, "descriptive": 0}
    
    return {
        "query": len(intents_data.get("queries", [])) / total,
        "descriptive": len(intents_data.get("descriptive", [])) / total
    }


def calculate_query_dominance(grouped_queries: Dict[str, List[str]]) -> Dict[str, float]:
    """Calculate which query category dominates."""
    total = sum(len(v) for v in grouped_queries.values())
    
    if total == 0:
        return {}
    
    return {k: len(v) / total for k, v in grouped_queries.items() if len(v) > 0}


def calculate_sentiment_ratio(grouped_descriptive: Dict[str, List[str]]) -> float:
    """Calculate ratio of positive vs negative feedback."""
    positive = len(grouped_descriptive.get("positive_features", []))
    improvement = len(grouped_descriptive.get("improvement_opportunities", []))
    total = positive + improvement
    
    if total == 0:
        return 0.5
    
    return positive / total


def generate_growth_insights(
    intents: Dict,
    grouped_queries: Dict[str, List[str]],
    grouped_descriptive: Dict[str, List[str]]
) -> Dict[str, any]:
    """
    Convert grouped queries + intents → actionable growth problems.
    
    Returns:
        insights: List of identified growth issues with confidence
        metrics: Raw data for strategy decision
    """
    insights = []
    
    intent_dist = calculate_intent_distribution(intents)
    query_dominance = calculate_query_dominance(grouped_queries)
    sentiment_ratio = calculate_sentiment_ratio(grouped_descriptive)
    
    # INSIGHT 1: High question volume = education gap
    if intent_dist["query"] > 0.35:
        insights.append({
            "issue": "Education gap detected",
            "signal": f"{intent_dist['query']:.0%} of comments are questions",
            "implication": "Audience needs clarity on key topics",
            "severity": "HIGH" if intent_dist["query"] > 0.5 else "MEDIUM"
        })
    
    # INSIGHT 2: Pricing questions = price sensitivity
    if "pricing" in query_dominance and query_dominance["pricing"] > 0.25:
        insights.append({
            "issue": "Price sensitivity is high",
            "signal": f"{query_dominance['pricing']:.0%} of queries are about pricing",
            "implication": "Need transparent pricing content or value-first positioning",
            "severity": "HIGH"
        })
    
    # INSIGHT 3: Booking/Availability questions = friction
    booking_availability = query_dominance.get("booking", 0) + query_dominance.get("availability", 0)
    if booking_availability > 0.25:
        insights.append({
            "issue": "Booking/availability friction",
            "signal": f"{booking_availability:.0%} ask about booking or availability",
            "implication": "Process is unclear — need instructional content",
            "severity": "HIGH"
        })
    
    # INSIGHT 4: Low sentiment = trust issue
    if sentiment_ratio < 0.5:
        insights.append({
            "issue": "Trust/satisfaction issue",
            "signal": f"Only {sentiment_ratio:.0%} positive feedback",
            "implication": "Need transparent/educational content to rebuild confidence",
            "severity": "CRITICAL"
        })
    
    # INSIGHT 5: High positive sentiment = momentum
    if sentiment_ratio > 0.75:
        insights.append({
            "issue": "Strong audience satisfaction",
            "signal": f"{sentiment_ratio:.0%} positive feedback",
            "implication": "Opportunity to convert satisfaction into advocacy",
            "severity": "OPPORTUNITY"
        })
    
    # INSIGHT 6: Other queries = gaps in FAQ/content
    if "other" in query_dominance and query_dominance["other"] > 0.2:
        insights.append({
            "issue": "Unknown question patterns",
            "signal": f"{query_dominance['other']:.0%} don't fit standard categories",
            "implication": "May indicate unmet content needs",
            "severity": "MEDIUM"
        })
    
    return {
        "insights": insights,
        "metrics": {
            "intent_distribution": intent_dist,
            "query_dominance": query_dominance,
            "sentiment_ratio": sentiment_ratio,
            "total_comments": len(intents.get("queries", [])) + len(intents.get("descriptive", []))
        }
    }
