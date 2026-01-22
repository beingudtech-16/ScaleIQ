import re
from typing import List, Dict

GENERIC_PRAISE = {
    "nice", "beautiful", "good", "great",
    "awesome", "amazing", "love", "wow", "cool", "ok","excellent", "fantastic", "superb", "wonderful","perfect", "brilliant", "fabulous", "incredible", "outstanding", "remarkable", "spectacular", "terrific", "unbelievable", "marvelous", "splendid", "magnificent", "impressive", "phenomenal", "exceptional", "stunning", "breathtaking", "radiant", "dazzling", "glorious", "exquisite", "sublime", "divine", "majestic", "resplendent", "elegant", "graceful", "charming", "delightful", "enchanting", "captivating", "alluring", "bewitching", "mesmerizing", "spellbinding", "entrancing", "fascinating", "riveting", "absorbing", "engrossing", "compelling", "inviting", "welcoming", "hospitable", "cordial", "genial", "affable", "amiable", "friendly", "pleasant", "agreeable", "congenial", "sociable", "outgoing", "gregarious", "convivial", "jovial", "cheerful", "joyful", "jubilant", "elated", "exultant", "ecstatic", "euphoric", "overjoyed", "thrilled", "delighted", "pleased", "contented", "satisfied", "happy", "joyous","so beautiful", "so nice", "so good", "so great", "so awesome", "so amazing", "so lovely", "so cool", "very nice", "very beautiful", "very good", "very great", "very awesome", "very amazing", "very lovely", "very cool", "extremely nice", "extremely beautiful", "extremely good", "extremely great", "extremely awesome", "extremely amazing", "extremely lovely", "extremely cool", "absolutely beautiful", "absolutely nice", "absolutely good", "absolutely great", "absolutely awesome", "absolutely amazing", "absolutely lovely", "absolutely cool"
}

EMOJI_REGEX = re.compile(r"^[\W_]+$")


def is_noise(comment: str) -> bool:
    text = comment.strip().lower()

    if not text:
        return True

    if EMOJI_REGEX.match(text):
        return True

    if text in GENERIC_PRAISE:
        return True

    return False


def simple_intent(comment: str) -> str:
    q_words = ["price", "how", "when", "where", "available", "cost", "pls", "please", "buy", "booking", "order", "schedule", "appointment", "rate", "pp", "money", "charge", "fee", "fees", "purchase", "pay", "payment","link","website","site","shop","store"]

    if any(w in comment.lower() for w in q_words):
        return "query"

    return "descriptive"


def detect_intents(comments: List[str]) -> Dict[str, List[str]]:
    queries = []
    descriptive = []

    for c in comments:
        if is_noise(c):
            continue

        intent = simple_intent(c)

        if intent == "query":
            queries.append(c)
        else:
            descriptive.append(c)

    return {
        "queries": queries,
        "descriptive": descriptive
    }
