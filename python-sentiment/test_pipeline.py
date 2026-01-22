"""
Test the growth strategy pipeline without FastAPI.
Run this to verify everything works before deploying the server.

Usage:
  python test_pipeline.py                    # Uses hardcoded test comments
  python test_pipeline.py test_comments.json # Loads comments from JSON file
"""

import json
import sys
from intent_detector import detect_intents
from query_grouper import group_queries
from descriptive_grouper import group_descriptive
from growth_insights import generate_growth_insights
from strategy_agent import decide_strategy, get_top_queries_for_content, build_agent_output
from llm_generator import generate_growth_content


# Sample Instagram comments (default)
TEST_COMMENTS = [
    "How much does this cost?",
    "When can I book?",
    "Love this so much!",
    "Is it available?",
    "Great product",
    "Can I get a discount?",
    "This is exactly what I needed",
    "How do I order?",
    "Where are you located?",
    "Amazing service!",
    "What's the pricing?",
    "Do you have payment plans?",
    "Best experience ever",
    "Can't find the booking link",
    "This changed my life"
]


def run_pipeline():
    """Run the full pipeline and print outputs."""
    
    # Load comments from file if provided
    comments = TEST_COMMENTS
    if len(sys.argv) > 1:
        try:
            with open(sys.argv[1], 'r') as f:
                data = json.load(f)
                comments = data.get("comments", TEST_COMMENTS)
                print(f"📂 Loaded {len(comments)} comments from {sys.argv[1]}\n")
        except FileNotFoundError:
            print(f"❌ File {sys.argv[1]} not found. Using default comments.\n")
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON in {sys.argv[1]}. Using default comments.\n")
    
    print("=" * 60)
    print("🚀 GROWTH STRATEGY PIPELINE TEST")
    print("=" * 60)
    
    # STAGE 1: OBSERVE
    print("\n📊 STAGE 1: INTENT DETECTION")
    intents = detect_intents(comments)
    print(f"  ✓ Queries detected: {len(intents['queries'])}")
    print(f"  ✓ Descriptive comments: {len(intents['descriptive'])}")
    
    # STAGE 2: UNDERSTAND
    print("\n🔍 STAGE 2: GROUP & CATEGORIZE")
    grouped_queries = group_queries(intents["queries"])
    grouped_descriptive = group_descriptive(intents["descriptive"])
    
    print(f"  ✓ Query groups:")
    for category, queries in grouped_queries.items():
        if queries:
            print(f"    - {category}: {len(queries)} ({', '.join(queries[:2])}...)")
    
    print(f"  ✓ Sentiment:")
    print(f"    - Positive: {len(grouped_descriptive['positive_features'])}")
    print(f"    - Improvement: {len(grouped_descriptive['improvement_opportunities'])}")
    
    # STAGE 3: EXTRACT SIGNALS
    print("\n💡 STAGE 3: GROWTH INSIGHTS")
    insights_output = generate_growth_insights(intents, grouped_queries, grouped_descriptive)
    insights = insights_output["insights"]
    metrics = insights_output["metrics"]
    
    for insight in insights:
        print(f"  🔴 {insight['issue']}")
        print(f"     Signal: {insight['signal']}")
        print(f"     Severity: {insight['severity']}")
    
    print(f"\n  📈 Metrics:")
    print(f"    - Intent distribution: {json.dumps(metrics['intent_distribution'], indent=6)}")
    print(f"    - Query dominance: {json.dumps(metrics['query_dominance'], indent=6)}")
    print(f"    - Sentiment ratio: {metrics['sentiment_ratio']:.1%}")
    
    # STAGE 4: DECIDE STRATEGY
    print("\n🎯 STAGE 4: STRATEGY DECISION")
    strategy = decide_strategy(insights, grouped_queries)
    
    print(f"  ✓ Content pillars: {strategy['content_pillars']}")
    print(f"  ✓ Content types: {strategy['content_types']}")
    print(f"  ✓ Posting frequency: {strategy['posting_frequency']}")
    print(f"  ✓ Primary goal: {strategy['primary_goal']}")
    print(f"  ✓ Tone: {strategy['tone']}")
    print(f"  ✓ CTA: {strategy['cta']}")
    print(f"  ✓ Hooks: {strategy['hooks']}")
    
    # STAGE 5: GENERATE CONTENT
    print("\n✍️  STAGE 5: CONTENT GENERATION")
    top_queries = get_top_queries_for_content(grouped_queries, limit=5)
    agent_output = build_agent_output(insights, strategy, metrics, top_queries)
    
    print("  Sending to LLM for content generation...")
    content_ideas = generate_growth_content(agent_output)
    
    if "ERROR" in content_ideas:
        print(f"  ❌ {content_ideas}")
        print("\n⚠️  SETUP REQUIRED:")
        print("  1. Get API key from: https://openrouter.ai/keys")
        print("  2. Add to .env file: OPENROUTER_API_KEY=your_key")
        print("  3. Run this script again")
    else:
        print("  ✓ Content generated successfully!")
        print("\n" + "=" * 60)
        print("GENERATED CONTENT:")
        print("=" * 60)
        print(content_ideas)
    
    print("\n" + "=" * 60)
    print("✅ PIPELINE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run_pipeline()
