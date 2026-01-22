from typing import List, Dict

QUERY_GROUPS = {
    "pricing": ["price", "cost", "rate", "how much","money","buy","pp","price please","link","payment"],
    "booking": ["book", "booking", "appointment", "order",""],
    "availability": ["available", "slot", "in stock" ]
}

def group_queries(queries: List[str]) -> Dict[str, List[str]]:
    grouped = {k: [] for k in QUERY_GROUPS}
    grouped["other"] = []

    for q in queries:
        ql = q.lower()
        matched = False

        for k, words in QUERY_GROUPS.items():
            if any(w in ql for w in words):
                grouped[k].append(q)
                matched = True
                break

        if not matched:
            grouped["other"].append(q)

    return grouped
