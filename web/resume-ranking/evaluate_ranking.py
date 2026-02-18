import json
from pathlib import Path
from typing import Dict, List


def dcg(relevances: List[float]) -> float:
    score = 0.0
    for i, rel in enumerate(relevances, start=1):
        score += rel / (1 if i == 1 else __import__("math").log2(i))
    return score


def ndcg_at_k(predicted: List[str], truth_relevance: Dict[str, float], k: int) -> float:
    pred = predicted[:k]
    rels = [truth_relevance.get(name, 0.0) for name in pred]
    ideal = sorted(truth_relevance.values(), reverse=True)[:k]
    ideal_dcg = dcg(ideal)
    if ideal_dcg == 0:
        return 0.0
    return dcg(rels) / ideal_dcg


def topk_hit(predicted: List[str], relevant: set, k: int) -> float:
    if not relevant:
        return 0.0
    return len(set(predicted[:k]).intersection(relevant)) / min(k, len(relevant))


def main():
    """
    Expected input JSON (evaluation_dataset.json):
    {
      "predicted_order": ["Candidate A", "Candidate B", ...],
      "ground_truth_relevance": {
        "Candidate A": 3,
        "Candidate B": 2,
        "Candidate C": 1
      }
    }
    """
    data_path = Path("evaluation_dataset.json")
    if not data_path.exists():
        print("Missing evaluation_dataset.json")
        return

    data = json.loads(data_path.read_text())
    predicted = data.get("predicted_order", [])
    truth = data.get("ground_truth_relevance", {})

    relevant = {name for name, score in truth.items() if score > 0}

    print("Evaluation Metrics")
    print(f"- nDCG@3: {ndcg_at_k(predicted, truth, 3):.4f}")
    print(f"- nDCG@5: {ndcg_at_k(predicted, truth, 5):.4f}")
    print(f"- Top-3 hit: {topk_hit(predicted, relevant, 3):.4f}")
    print(f"- Top-5 hit: {topk_hit(predicted, relevant, 5):.4f}")


if __name__ == "__main__":
    main()
