from typing import List, Dict
from textblob import TextBlob
import re

EMOJI_ONLY = re.compile(r"^[\W_]+$")


def is_valid_text(text: str) -> bool:
    if not text:
        return False
    text = text.strip()
    if len(text) < 3:
        return False
    if EMOJI_ONLY.match(text):
        return False
    if text.startswith("@"):
        return False
    return True


def group_descriptive(comments: List[str]) -> Dict[str, List[str]]:
    positive, improvement = [], []

    for c in comments:
        if not is_valid_text(c):
            continue

        try:
            polarity = TextBlob(c).sentiment.polarity
            if polarity >= 0:
                positive.append(c)
            else:
                improvement.append(c)
        except Exception:
            continue

    return {
        "positive_features": positive,
        "improvement_opportunities": improvement
    }
