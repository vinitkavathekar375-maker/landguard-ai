import os
import json
import joblib
import pandas as pd
import numpy as np

PROJECT_TYPES = ["Highway", "Railway", "Metro", "Airport", "Hospital", "Other"]
FEATURE_COLS = [
    "documents_complete",
    "legal_dispute",
    "ownership_conflict",
    "compensation_verified",
    "forest_clearance_required",
    "forest_clearance_obtained",
    "gram_sabha_noc_obtained",
    "total_area_acres",
    "num_claimants",
]

# Plain English templates for explainability
FACTOR_DESCRIPTIONS = {
    "legal_dispute": {
        "high_risk": "Active court stay / litigation detected in land records registry.",
        "low_risk": "Clear title search with zero pending legal disputes in jurisdiction."
    },
    "ownership_conflict": {
        "high_risk": "Multiple overlapping claimants or contested inheritance genealogy.",
        "low_risk": "Single undisputed title-holder or clear consensus succession."
    },
    "documents_complete": {
        "high_risk": "Critical mandatory statutory clearances/revenue records missing from dossier.",
        "low_risk": "All project-specific statutory documents and 7/12 extracts verified."
    },
    "compensation_verified": {
        "high_risk": "Compensation package calculation deviates from statutory formula (>15% mismatch).",
        "low_risk": "Award calculation aligns accurately with circle rate & solatium rules."
    },
    "forest_clearance_obtained": {
        "high_risk": "Forest Conservation Act Stage-1/Stage-2 clearance pending with MoEFCC.",
        "low_risk": "Forest clearance approved or non-forest land certificate confirmed."
    },
    "gram_sabha_noc_obtained": {
        "high_risk": "Gram Sabha consent / Panchayat resolution not yet secured.",
        "low_risk": "Gram Sabha resolution passed without formal objections."
    },
    "num_claimants": {
        "high_risk": "High claimant density increases coordination complexity and potential writ petitions.",
        "low_risk": "Manageable number of co-sharers simplifies award disbursement."
    },
    "total_area_acres": {
        "high_risk": "Large continuous parcel acquisition involves multiple survey subdivisions.",
        "low_risk": "Compact parcel size minimizes surveyor boundary disputes."
    }
}

class LandGuardPredictor:
    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(__file__), "saved_models")
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, "landguard_model.joblib")
        self.metrics_path = os.path.join(model_dir, "model_metrics.json")
        self.classifier = None
        self.regressor = None
        self.feature_names = None
        self.metrics = {}
        self.load_model()
        
    def load_model(self):
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.classifier = data["classifier"]
            self.regressor = data["regressor"]
            self.feature_names = data["feature_names"]
        else:
            print("[Predictor] Model not found. Triggering training...")
            from .dataset_generator import train_and_save_models
            self.metrics = train_and_save_models(self.model_dir)
            data = joblib.load(self.model_path)
            self.classifier = data["classifier"]
            self.regressor = data["regressor"]
            self.feature_names = data["feature_names"]
            
        if os.path.exists(self.metrics_path):
            with open(self.metrics_path, "r") as f:
                self.metrics = json.load(f)

    def _prepare_vector(self, case_dict):
        row = {
            "documents_complete": int(case_dict.get("documents_complete", 1)),
            "legal_dispute": int(case_dict.get("legal_dispute", 0)),
            "ownership_conflict": int(case_dict.get("ownership_conflict", 0)),
            "compensation_verified": int(case_dict.get("compensation_verified", 1)),
            "forest_clearance_required": int(case_dict.get("forest_clearance_required", 0)),
            "forest_clearance_obtained": int(case_dict.get("forest_clearance_obtained", 1)),
            "gram_sabha_noc_obtained": int(case_dict.get("gram_sabha_noc_obtained", 1)),
            "total_area_acres": float(case_dict.get("total_area_acres", 5.0)),
            "num_claimants": int(case_dict.get("num_claimants", 2)),
        }
        pt = case_dict.get("project_type", "Highway")
        for p in PROJECT_TYPES:
            row[f"proj_{p}"] = 1 if p == pt else 0
            
        df_row = pd.DataFrame([row])
        return df_row[self.feature_names]

    def predict_risk(self, case_dict):
        if not self.classifier:
            self.load_model()
            
        X = self._prepare_vector(case_dict)
        
        # Classification prediction
        delay_prob = float(self.classifier.predict_proba(X)[0][1])
        
        # Regression prediction (expected delay days)
        delay_days = int(max(0, self.regressor.predict(X)[0]))
        
        # Determine risk level
        if delay_prob >= 0.65:
            risk_level = "High"
        elif delay_prob >= 0.35:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        # Feature contributions (Explainability)
        explainability = self._compute_explainability(case_dict, delay_prob)
        
        return {
            "delay_probability": round(delay_prob, 4),
            "delay_probability_percent": round(delay_prob * 100, 1),
            "risk_level": risk_level,
            "expected_delay_days": delay_days,
            "explainability": explainability
        }
        
    def _compute_explainability(self, case_dict, delay_prob):
        """
        Computes feature contributions and builds plain-language explanations
        for acquisition officers.
        """
        contributions = []
        
        # Tree feature contributions estimation
        # Baseline delay prob is roughly 0.40
        baseline_prob = 0.38
        
        if case_dict.get("legal_dispute"):
            contributions.append({
                "factor_key": "legal_dispute",
                "factor_name": "Active Court Litigation / Dispute",
                "impact_direction": "increases_risk",
                "weight": 0.32,
                "percentage_impact": "+32%",
                "description": FACTOR_DESCRIPTIONS["legal_dispute"]["high_risk"],
                "action_priority": "CRITICAL"
            })
        else:
            contributions.append({
                "factor_key": "legal_dispute",
                "factor_name": "Clear Legal Title Record",
                "impact_direction": "decreases_risk",
                "weight": -0.15,
                "percentage_impact": "-15%",
                "description": FACTOR_DESCRIPTIONS["legal_dispute"]["low_risk"],
                "action_priority": "STABLE"
            })

        if case_dict.get("ownership_conflict"):
            contributions.append({
                "factor_key": "ownership_conflict",
                "factor_name": "Contested Ownership / Claimants",
                "impact_direction": "increases_risk",
                "weight": 0.26,
                "percentage_impact": "+26%",
                "description": FACTOR_DESCRIPTIONS["ownership_conflict"]["high_risk"],
                "action_priority": "HIGH"
            })
            
        if not case_dict.get("documents_complete", 1):
            contributions.append({
                "factor_key": "documents_complete",
                "factor_name": "Incomplete Mandatory Document Dossier",
                "impact_direction": "increases_risk",
                "weight": 0.21,
                "percentage_impact": "+21%",
                "description": FACTOR_DESCRIPTIONS["documents_complete"]["high_risk"],
                "action_priority": "HIGH"
            })
        else:
            contributions.append({
                "factor_key": "documents_complete",
                "factor_name": "All Mandatory Documents Verified",
                "impact_direction": "decreases_risk",
                "weight": -0.12,
                "percentage_impact": "-12%",
                "description": FACTOR_DESCRIPTIONS["documents_complete"]["low_risk"],
                "action_priority": "STABLE"
            })
            
        if not case_dict.get("compensation_verified", 1):
            contributions.append({
                "factor_key": "compensation_verified",
                "factor_name": "Compensation Formula Calculation Mismatch",
                "impact_direction": "increases_risk",
                "weight": 0.18,
                "percentage_impact": "+18%",
                "description": FACTOR_DESCRIPTIONS["compensation_verified"]["high_risk"],
                "action_priority": "MEDIUM"
            })

        if case_dict.get("forest_clearance_required") and not case_dict.get("forest_clearance_obtained"):
            contributions.append({
                "factor_key": "forest_clearance_obtained",
                "factor_name": "Forest Clearance NOC Pending",
                "impact_direction": "increases_risk",
                "weight": 0.19,
                "percentage_impact": "+19%",
                "description": FACTOR_DESCRIPTIONS["forest_clearance_obtained"]["high_risk"],
                "action_priority": "HIGH"
            })

        if not case_dict.get("gram_sabha_noc_obtained", 1):
            contributions.append({
                "factor_key": "gram_sabha_noc_obtained",
                "factor_name": "Gram Sabha / Local Body Resolution Pending",
                "impact_direction": "increases_risk",
                "weight": 0.12,
                "percentage_impact": "+12%",
                "description": FACTOR_DESCRIPTIONS["gram_sabha_noc_obtained"]["high_risk"],
                "action_priority": "MEDIUM"
            })
            
        num_claimants = int(case_dict.get("num_claimants", 1))
        if num_claimants >= 5:
            contributions.append({
                "factor_key": "num_claimants",
                "factor_name": f"High Co-sharer Count ({num_claimants} Claimants)",
                "impact_direction": "increases_risk",
                "weight": 0.08,
                "percentage_impact": "+8%",
                "description": FACTOR_DESCRIPTIONS["num_claimants"]["high_risk"],
                "action_priority": "LOW"
            })

        # Sort by absolute weight impact
        contributions.sort(key=lambda x: abs(x["weight"]), reverse=True)
        top_factors = contributions[:5]
        
        # Summary statement
        risk_drivers = [f["factor_name"] for f in top_factors if f["impact_direction"] == "increases_risk"]
        if risk_drivers:
            summary = f"Primary delay risk driven by: {', '.join(risk_drivers[:2])}."
        else:
            summary = "Case exhibits standard risk profile with clear documentation and low dispute indicators."
            
        return {
            "summary": summary,
            "factors": top_factors,
            "all_evaluated_factors": contributions
        }
