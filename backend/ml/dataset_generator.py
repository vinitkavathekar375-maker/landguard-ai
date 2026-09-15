import os
import json
import random
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import joblib

PROJECT_TYPES = ["Highway", "Railway", "Metro", "Airport", "Hospital", "Other"]
PROJECT_TYPE_WEIGHTS = {
    "Highway": 0.25,
    "Railway": 0.20,
    "Metro": 0.35,
    "Airport": 0.30,
    "Hospital": 0.10,
    "Other": 0.15
}

def generate_synthetic_cases(n_samples=500, random_state=42):
    """
    Generates realistic historical land acquisition cases with realistic correlations
    between legal, document, ownership, compensation, environmental factors and delays.
    """
    np.random.seed(random_state)
    random.seed(random_state)

    data = []
    for i in range(1, n_samples + 1):
        land_id = f"L{i:04d}"
        project_type = np.random.choice(PROJECT_TYPES, p=[0.30, 0.25, 0.15, 0.10, 0.10, 0.10])
        total_area = round(float(np.random.exponential(scale=12.0) + 0.5), 2)
        num_claimants = int(np.random.poisson(lam=3) + 1)
        
        # Risk factor probabilities
        base_dispute_prob = 0.22 + (0.1 if project_type in ["Metro", "Airport"] else 0.0)
        legal_dispute = 1 if np.random.rand() < base_dispute_prob else 0
        
        # Ownership conflict is more likely if multiple claimants or dispute
        conflict_prob = 0.15 + (0.25 if num_claimants > 4 else 0.0) + (0.20 if legal_dispute else 0.0)
        ownership_conflict = 1 if np.random.rand() < min(conflict_prob, 0.85) else 0
        
        # Missing docs more common in complex or multi-claimant cases
        missing_doc_prob = 0.25 + (0.15 if ownership_conflict else 0.0)
        documents_complete = 0 if np.random.rand() < missing_doc_prob else 1
        
        # Compensation mismatch
        comp_mismatch_prob = 0.20 + (0.15 if ownership_conflict else 0.0)
        compensation_verified = 0 if np.random.rand() < comp_mismatch_prob else 1
        
        # Forest clearance (often required for Highway / Railway / Airport)
        forest_required = 1 if project_type in ["Highway", "Railway", "Airport"] and np.random.rand() < 0.45 else 0
        forest_obtained = 1 if (forest_required == 0) or (np.random.rand() < 0.60) else 0
        
        # Gram Sabha / Local body NOC
        gram_sabha_obtained = 1 if np.random.rand() < 0.82 else 0

        # Correlation logic for ground truth delay
        delay_score = 0.0
        delay_score += 0.35 * legal_dispute
        delay_score += 0.28 * ownership_conflict
        delay_score += 0.22 * (1 - documents_complete)
        delay_score += 0.18 * (1 - compensation_verified)
        delay_score += 0.20 * (1 - forest_obtained if forest_required else 0)
        delay_score += 0.12 * (1 - gram_sabha_obtained)
        delay_score += PROJECT_TYPE_WEIGHTS[project_type]
        
        # Add slight realistic stochastic noise
        delay_score += np.random.normal(0, 0.08)
        
        # Delay decision boundary
        delayed = 1 if delay_score >= 0.45 else 0
        
        # Days delayed calculation
        if delayed:
            base_days = 45 + (legal_dispute * 120) + (ownership_conflict * 90) + \
                        ((1 - documents_complete) * 60) + ((1 - compensation_verified) * 45) + \
                        ((1 - forest_obtained if forest_required else 0) * 80)
            days_delayed = int(base_days + np.random.randint(15, 75))
            if delay_score >= 0.75:
                risk_level = "High"
            else:
                risk_level = "Medium"
        else:
            days_delayed = int(max(0, np.random.exponential(scale=8)))
            risk_level = "Low" if delay_score < 0.32 else "Medium"
            
        data.append({
            "land_id": land_id,
            "project_type": project_type,
            "total_area_acres": total_area,
            "num_claimants": num_claimants,
            "documents_complete": documents_complete,
            "legal_dispute": legal_dispute,
            "ownership_conflict": ownership_conflict,
            "compensation_verified": compensation_verified,
            "forest_clearance_required": forest_required,
            "forest_clearance_obtained": forest_obtained,
            "gram_sabha_noc_obtained": gram_sabha_obtained,
            "delayed": delayed,
            "days_delayed": days_delayed,
            "risk_level": risk_level
        })
        
    df = pd.DataFrame(data)
    return df

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

def encode_features(df):
    """One-hot encodes categorical columns for model consumption."""
    df_encoded = df.copy()
    for pt in PROJECT_TYPES:
        df_encoded[f"proj_{pt}"] = (df_encoded["project_type"] == pt).astype(int)
    
    encoded_feature_cols = FEATURE_COLS + [f"proj_{pt}" for pt in PROJECT_TYPES]
    return df_encoded[encoded_feature_cols], encoded_feature_cols

def train_and_save_models(save_dir=None):
    if save_dir is None:
        save_dir = os.path.join(os.path.dirname(__file__), "saved_models")
    os.makedirs(save_dir, exist_ok=True)
    
    df = generate_synthetic_cases(n_samples=600, random_state=42)
    df.to_csv(os.path.join(save_dir, "synthetic_training_dataset.csv"), index=False)
    
    X, feature_names = encode_features(df)
    y_class = df["delayed"]
    y_reg = df["days_delayed"]
    
    X_train, X_test, y_train_cls, y_test_cls, y_train_reg, y_test_reg = train_test_split(
        X, y_class, y_reg, test_size=0.25, random_state=42, stratify=y_class
    )
    
    # Train Classification model
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=6,
        min_samples_split=4,
        random_state=42
    )
    clf.fit(X_train, y_train_cls)
    
    # Train Regression model
    reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=6,
        min_samples_split=4,
        random_state=42
    )
    reg.fit(X_train, y_train_reg)
    
    # Evaluate honestly
    y_pred_cls = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)[:, 1]
    
    accuracy = float(accuracy_score(y_test_cls, y_pred_cls))
    precision = float(precision_score(y_test_cls, y_pred_cls, zero_division=0))
    recall = float(recall_score(y_test_cls, y_pred_cls, zero_division=0))
    f1 = float(f1_score(y_test_cls, y_pred_cls, zero_division=0))
    roc_auc = float(roc_auc_score(y_test_cls, y_pred_proba))
    cm = confusion_matrix(y_test_cls, y_pred_cls).tolist()
    
    # Feature importances
    importances = {
        feat: float(imp) 
        for feat, imp in zip(feature_names, clf.feature_importances_)
    }
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))
    
    metrics = {
        "dataset_size": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": {
            "true_negative": cm[0][0],
            "false_positive": cm[0][1],
            "false_negative": cm[1][0],
            "true_positive": cm[1][1]
        },
        "feature_importances": sorted_importances,
        "feature_names": feature_names,
        "model_version": "RandomForest-v1.0-Production"
    }
    
    # Save artifacts
    joblib.dump({
        "classifier": clf,
        "regressor": reg,
        "feature_names": feature_names
    }, os.path.join(save_dir, "landguard_model.joblib"))
    
    with open(os.path.join(save_dir, "model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"[ML Pipeline] Successfully trained LandGuard AI model. Accuracy: {accuracy*100:.2f}%, ROC-AUC: {roc_auc:.4f}")
    return metrics

if __name__ == "__main__":
    train_and_save_models()
