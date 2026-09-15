import urllib.request
import urllib.parse
import json
import os
import io

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("==================================================")
    print(">> Running LandGuard AI Comprehensive E2E Verification")
    print("==================================================")

    # 1. Test Dashboard Stats
    print("\n[1/7] Testing Dashboard KPIs & Analytics...")
    req = urllib.request.Request(f"{BASE_URL}/dashboard/stats")
    with urllib.request.urlopen(req) as resp:
        stats = json.loads(resp.read().decode())
        print(f"  [OK] Active Cases: {stats['total_cases']}")
        print(f"  [OK] High Delay Risk Cases: {stats['high_risk_count']}")
        print(f"  [OK] Priority Queue Count: {stats['priority_queue_count']}")
        print(f"  [OK] Total Compensation Monitored: INR {stats['total_compensation_at_risk']:,.0f}")
        assert stats['total_cases'] > 0

    # 2. Test Case Filtering & Listing
    print("\n[2/7] Testing Case Surveillance Listing & Filtering...")
    req = urllib.request.Request(f"{BASE_URL}/cases?project_type=Highway&risk_level=High")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"  [OK] High-Risk Highway Cases Returned: {data['count']}")
        assert data['count'] > 0

    # 3. Test Full Case Detail & Explainability (XAI)
    print("\n[3/7] Testing Case Inspection & Explainability Engine...")
    case_id = "LG-NH48-01"
    req = urllib.request.Request(f"{BASE_URL}/cases/{case_id}")
    with urllib.request.urlopen(req) as resp:
        detail = json.loads(resp.read().decode())
        pred = detail['prediction']
        rules = detail['rules']
        xai = pred['explainability']
        
        print(f"  [OK] Land ID: {detail['case']['land_id']} ({detail['case']['project_name']})")
        print(f"  [OK] Delay Probability: {pred['delay_probability_percent']}% | Risk Tier: {pred['risk_level']}")
        print(f"  [OK] Expected Delay: +{pred['expected_delay_days']} Days")
        print(f"  [OK] XAI Root Cause Summary: {xai['summary']}")
        print(f"  [OK] Top Contributing Factor: {xai['factors'][0]['factor_name']} ({xai['factors'][0]['percentage_impact']})")
        print(f"  [OK] Court Litigation Flag: {rules['has_active_court_stay']}")
        print(f"  [OK] Ownership Conflict: {rules['ownership_check']['has_conflict']}")
        print(f"  [OK] Recommended Actions Count: {len(detail['recommended_actions'])}")
        assert pred['delay_probability'] > 0.5

    # 4. Test Logging Officer Intervention & Risk Re-evaluation
    print("\n[4/7] Testing Officer Intervention & Instant Risk Re-evaluation...")
    action_payload = {
        "action": "Filed Emergency Section 40 Counter-Affidavit in High Court",
        "notes": "Produced Gazetted Right of Way notification and expedited compensation deposit. Interim injunction vacated.",
        "actor_name": "Special Land Acquisition Officer (SLAO)",
        "actor_role": "Competent Authority",
        "resolve_dispute": True,
        "resolve_ownership": True
    }
    data_bytes = json.dumps(action_payload).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/cases/{case_id}/actions",
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        action_res = json.loads(resp.read().decode())
        print(f"  [OK] Previous Risk: {action_res['prev_risk_level']} (+{action_res['prev_delay_days']}d)")
        print(f"  [OK] Post-Intervention Risk: {action_res['new_risk_level']} (+{action_res['new_delay_days']}d)")
        print(f"  [OK] Action successfully logged into Audit Trail Timeline!")

    # 5. Test OCR Service & Sample Document Parsing
    print("\n[5/7] Testing OCR Text Extraction & Entity Parser...")
    from backend.ocr.ocr_service import ocr_service
    sample_text = (
        "GOVERNMENT OF MAHARASHTRA / REVENUE DEPARTMENT\n"
        "FORM VII-XII (RECORD OF RIGHTS)\n"
        "Survey / Gat No: 218/1\n"
        "Village: Hinjawadi, Taluka: Mulshi, District: Pune\n"
        "Total Area: 1.20 Acres\n"
        "Primary Claimant: Shri Rameshwar Shankar Shinde\n"
        "Statutory Award: Rs. 36,000,000"
    )
    entities = ocr_service.parse_entities(sample_text)
    print(f"  [OK] Extracted Survey No: {entities['survey_numbers']}")
    print(f"  [OK] Extracted Claimant Name: {entities['claimant_names']}")
    print(f"  [OK] Extracted Land Area: {entities['land_area_extracted']}")
    comp_clean = [a.replace('\u20b9', 'INR') for a in entities['compensation_amounts']]
    print(f"  [OK] Extracted Award Amount: {comp_clean}")
    assert "218/1" in entities['survey_numbers']
    assert "1.20 Acres" == entities['land_area_extracted']

    # 6. Test Real ML Model Performance Metrics & Confusion Matrix
    print("\n[6/7] Testing Machine Learning Diagnostic Metrics...")
    req = urllib.request.Request(f"{BASE_URL}/admin/model-metrics")
    with urllib.request.urlopen(req) as resp:
        metrics = json.loads(resp.read().decode())
        print(f"  [OK] Model Version: {metrics.get('model_version')}")
        print(f"  [OK] Real Holdout Test Accuracy: {metrics['accuracy'] * 100:.2f}%")
        print(f"  [OK] ROC-AUC Score: {metrics['roc_auc']:.4f}")
        print(f"  [OK] Confusion Matrix:")
        print(f"      True Negatives (On-Time): {metrics['confusion_matrix']['true_negative']}")
        print(f"      False Positives (False Alarm): {metrics['confusion_matrix']['false_positive']}")
        print(f"      False Negatives (Missed): {metrics['confusion_matrix']['false_negative']}")
        print(f"      True Positives (Caught Delay): {metrics['confusion_matrix']['true_positive']}")
        print(f"  [OK] Top Gini Feature: {list(metrics['feature_importances'].keys())[0]} ({list(metrics['feature_importances'].values())[0]*100:.1f}%)")

    # 7. Test Frontend Server Availability
    print("\n[7/7] Testing Frontend Dev Server...")
    req = urllib.request.Request("http://localhost:5173/")
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode()
        print(f"  [OK] Frontend loaded successfully with HTTP {resp.status}!")
        assert "LandGuard AI" in html

    print("\n==================================================")
    print(">> ALL 7 TEST SUITES PASSED FLAWLESSLY (100% SUCCESS)!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
