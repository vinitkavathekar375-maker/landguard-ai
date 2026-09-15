import os
import json
import time
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.database.db import get_connection, init_db
from backend.database.seed_data import seed_demo_data
from backend.ml.predictor import LandGuardPredictor
from backend.ml.dataset_generator import train_and_save_models
from backend.ocr.ocr_service import ocr_service
from backend.rules.rule_engine import (
    verify_document_completeness,
    verify_compensation,
    detect_ownership_conflicts,
    generate_recommended_actions,
    MANDATORY_DOCUMENTS_BY_PROJECT
)

app = FastAPI(
    title="LandGuard AI — Decision-Support API",
    description="Early-warning decision-support system for land acquisition officers predicting delay risk and root causes.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = LandGuardPredictor()

@app.on_event("startup")
def startup_event():
    init_db()
    seed_demo_data()
    predictor.load_model()

# --- Pydantic Schemas ---
class ClaimantInput(BaseModel):
    name: str
    share_pct: float = 100.0
    aadhar_last4: Optional[str] = "1234"
    is_disputed: Optional[bool] = False
    notes: Optional[str] = ""

class CreateCaseRequest(BaseModel):
    land_id: str
    project_name: str
    project_type: str
    location_village: str
    location_district: str
    survey_no: str
    total_area_acres: float
    circle_rate_per_acre: float = 2500000.0
    multiplier: float = 1.5
    solatium_pct: float = 100.0
    offered_compensation: float = 0.0
    forest_clearance_required: bool = False
    forest_clearance_obtained: bool = True
    gram_sabha_noc_obtained: bool = True
    claimants: List[ClaimantInput] = []

class LogActionRequest(BaseModel):
    action: str
    notes: str
    actor_name: str = "Shri R. K. Verma"
    actor_role: str = "Special Land Acquisition Officer (SLAO)"
    resolve_dispute: Optional[bool] = None
    resolve_ownership: Optional[bool] = None
    update_compensation: Optional[float] = None
    mark_forest_cleared: Optional[bool] = None
    mark_gram_sabha_passed: Optional[bool] = None

class ConfigUpdateRequest(BaseModel):
    default_circle_rate: float
    default_multiplier: float
    default_solatium_pct: float
    high_risk_threshold: float
    medium_risk_threshold: float

# --- Helper Functions ---
def get_full_case_eval(land_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM cases WHERE land_id = ?", (land_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")
        
    case = dict(case_row)
    
    # Fetch claimants
    cursor.execute("SELECT * FROM claimants WHERE land_id = ?", (land_id,))
    claimants = [dict(r) for r in cursor.fetchall()]
    
    # Fetch documents
    cursor.execute("SELECT * FROM documents WHERE land_id = ?", (land_id,))
    docs = [dict(r) for r in cursor.fetchall()]
    for d in docs:
        if d.get("ocr_entities_json"):
            try:
                d["ocr_entities"] = json.loads(d["ocr_entities_json"])
            except Exception:
                d["ocr_entities"] = {}
                
    # Fetch court records
    cursor.execute("SELECT * FROM court_records WHERE land_id = ? OR survey_no = ?", (land_id, case.get("survey_no")))
    court_records = [dict(r) for r in cursor.fetchall()]
    
    # Fetch history
    cursor.execute("SELECT * FROM case_history WHERE land_id = ? ORDER BY id DESC", (land_id,))
    history = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    
    # Run Rules
    uploaded_doc_types = [d["doc_type"] for d in docs if d["is_present"]]
    completeness = verify_document_completeness(case["project_type"], uploaded_doc_types)
    ownership_check = detect_ownership_conflicts(claimants)
    comp_check = verify_compensation(
        case["total_area_acres"],
        case["circle_rate_per_acre"],
        case["multiplier"],
        case["solatium_pct"],
        case["offered_compensation"]
    )
    
    # Check legal dispute from court records or explicit flag
    has_active_stay = any(c.get("stay_granted") == 1 for c in court_records)
    legal_dispute_active = bool(case["legal_dispute"] or has_active_stay)
    
    # Synthesize live features for ML
    case_eval_input = {
        "project_type": case["project_type"],
        "total_area_acres": case["total_area_acres"],
        "num_claimants": max(len(claimants), case["num_claimants"]),
        "documents_complete": 1 if completeness["is_complete"] else 0,
        "legal_dispute": 1 if legal_dispute_active else 0,
        "ownership_conflict": 1 if ownership_check["has_conflict"] else 0,
        "compensation_verified": 1 if comp_check["verified"] else 0,
        "forest_clearance_required": case["forest_clearance_required"],
        "forest_clearance_obtained": case["forest_clearance_obtained"],
        "gram_sabha_noc_obtained": case["gram_sabha_noc_obtained"]
    }
    
    # ML Prediction + Explainability
    pred = predictor.predict_risk(case_eval_input)
    
    # Recommended Actions
    actions = generate_recommended_actions(case_eval_input, pred, completeness, comp_check, ownership_check)
    
    return {
        "case": case,
        "claimants": claimants,
        "documents": docs,
        "court_records": court_records,
        "history": history,
        "rules": {
            "completeness": completeness,
            "ownership_check": ownership_check,
            "compensation_check": comp_check,
            "has_active_court_stay": has_active_stay
        },
        "prediction": pred,
        "recommended_actions": actions
    }

# --- Endpoints ---

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM cases")
    total_cases = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM cases WHERE risk_level = 'High'")
    high_risk_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM cases WHERE risk_level = 'Medium'")
    med_risk_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM cases WHERE risk_level = 'Low'")
    low_risk_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT AVG(expected_delay_days), SUM(offered_compensation) FROM cases")
    avg_delay, total_comp = cursor.fetchone()
    
    cursor.execute("SELECT COUNT(*) FROM cases WHERE priority_score >= 60")
    priority_queue_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT project_type, COUNT(*) as count FROM cases GROUP BY project_type")
    by_project = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    
    return {
        "total_cases": total_cases,
        "high_risk_count": high_risk_count,
        "medium_risk_count": med_risk_count,
        "low_risk_count": low_risk_count,
        "avg_expected_delay_days": round(avg_delay or 0, 1),
        "total_compensation_at_risk": round(total_comp or 0, 2),
        "priority_queue_count": priority_queue_count,
        "by_project": by_project
    }

@app.get("/api/cases")
def list_cases(
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    priority_only: Optional[bool] = False,
    sort_by: Optional[str] = "priority"
):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM cases WHERE 1=1"
    params = []
    
    if search:
        query += " AND (land_id LIKE ? OR project_name LIKE ? OR location_village LIKE ? OR survey_no LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])
        
    if project_type and project_type != "All":
        query += " AND project_type = ?"
        params.append(project_type)
        
    if risk_level and risk_level != "All":
        query += " AND risk_level = ?"
        params.append(risk_level)
        
    if status and status != "All":
        query += " AND status = ?"
        params.append(status)
        
    if priority_only:
        query += " AND priority_score >= 60"
        
    if sort_by == "priority":
        query += " ORDER BY priority_score DESC, expected_delay_days DESC"
    elif sort_by == "delay_days":
        query += " ORDER BY expected_delay_days DESC"
    elif sort_by == "created_at":
        query += " ORDER BY created_at DESC"
    elif sort_by == "area":
        query += " ORDER BY total_area_acres DESC"
    else:
        query += " ORDER BY priority_score DESC"
        
    cursor.execute(query, params)
    cases = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    return {"cases": cases, "count": len(cases)}

@app.get("/api/cases/{land_id}")
def get_case(land_id: str):
    return get_full_case_eval(land_id)

@app.post("/api/cases")
def create_case(req: CreateCaseRequest):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if land_id exists
    cursor.execute("SELECT land_id FROM cases WHERE land_id = ?", (req.land_id,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"Case with Land ID '{req.land_id}' already exists.")
        
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    num_claimants = max(len(req.claimants), 1)
    
    # Calculate preliminary checks
    ownership_check = detect_ownership_conflicts([c.dict() for c in req.claimants])
    comp_check = verify_compensation(
        req.total_area_acres,
        req.circle_rate_per_acre,
        req.multiplier,
        req.solatium_pct,
        req.offered_compensation
    )
    
    # Check court records
    cursor.execute("SELECT id FROM court_records WHERE survey_no = ?", (req.survey_no,))
    court_found = cursor.fetchone() is not None
    
    eval_input = {
        "project_type": req.project_type,
        "total_area_acres": req.total_area_acres,
        "num_claimants": num_claimants,
        "documents_complete": 0, # brand new case starts without uploaded docs
        "legal_dispute": 1 if court_found else 0,
        "ownership_conflict": 1 if ownership_check["has_conflict"] else 0,
        "compensation_verified": 1 if comp_check["verified"] else 0,
        "forest_clearance_required": 1 if req.forest_clearance_required else 0,
        "forest_clearance_obtained": 1 if req.forest_clearance_obtained else 0,
        "gram_sabha_noc_obtained": 1 if req.gram_sabha_noc_obtained else 0,
    }
    
    pred = predictor.predict_risk(eval_input)
    priority_score = int((pred["delay_probability"] * 70) + (min(pred["expected_delay_days"], 180) / 180.0 * 30))
    
    cursor.execute("""
        INSERT INTO cases (
            land_id, project_name, project_type, location_village, location_district,
            survey_no, total_area_acres, num_claimants, offered_compensation, circle_rate_per_acre,
            multiplier, solatium_pct, status, documents_complete, legal_dispute, ownership_conflict,
            compensation_verified, forest_clearance_required, forest_clearance_obtained,
            gram_sabha_noc_obtained, delay_probability, risk_level, expected_delay_days,
            priority_score, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.land_id, req.project_name, req.project_type, req.location_village,
        req.location_district, req.survey_no, req.total_area_acres, num_claimants,
        req.offered_compensation, req.circle_rate_per_acre, req.multiplier, req.solatium_pct,
        "Under Assessment", 0, 1 if court_found else 0, 1 if ownership_check["has_conflict"] else 0,
        1 if comp_check["verified"] else 0, 1 if req.forest_clearance_required else 0,
        1 if req.forest_clearance_obtained else 0, 1 if req.gram_sabha_noc_obtained else 0,
        pred["delay_probability"], pred["risk_level"], pred["expected_delay_days"],
        priority_score, now, now
    ))
    
    # Add claimants
    for cl in req.claimants:
        cursor.execute("""
            INSERT INTO claimants (land_id, name, share_pct, aadhar_last4, bank_verified, is_disputed, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (req.land_id, cl.name, cl.share_pct, cl.aadhar_last4, 1, 1 if cl.is_disputed else 0, cl.notes))
        
    # Log intake
    cursor.execute("""
        INSERT INTO case_history (land_id, action, actor_name, actor_role, timestamp, notes, prev_risk_level, new_risk_level, prev_delay_days, new_delay_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.land_id,
        "New Land Acquisition Case Intake",
        "Officer Intake Desk",
        "Acquisition Clerk / SLAO",
        now,
        f"Case created with {num_claimants} claimant(s). Initial AI Risk assigned: {pred['risk_level']} ({pred['delay_probability']*100:.1f}%).",
        "None",
        pred["risk_level"],
        0,
        pred["expected_delay_days"]
    ))
    
    conn.commit()
    conn.close()
    
    return {"message": "Case created successfully", "land_id": req.land_id, "prediction": pred}

@app.post("/api/cases/{land_id}/actions")
def log_officer_action(land_id: str, req: LogActionRequest):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM cases WHERE land_id = ?", (land_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")
        
    prev_case = dict(case_row)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Optional updates based on action toggles
    updates = []
    params = []
    
    if req.resolve_dispute is not None:
        updates.append("legal_dispute = ?")
        params.append(0 if req.resolve_dispute else 1)
        
    if req.resolve_ownership is not None:
        updates.append("ownership_conflict = ?")
        params.append(0 if req.resolve_ownership else 1)
        
    if req.update_compensation is not None:
        updates.append("offered_compensation = ?")
        params.append(req.update_compensation)
        # re-check compensation verified
        comp_check = verify_compensation(
            prev_case["total_area_acres"],
            prev_case["circle_rate_per_acre"],
            prev_case["multiplier"],
            prev_case["solatium_pct"],
            req.update_compensation
        )
        updates.append("compensation_verified = ?")
        params.append(1 if comp_check["verified"] else 0)
        
    if req.mark_forest_cleared is not None:
        updates.append("forest_clearance_obtained = ?")
        params.append(1 if req.mark_forest_cleared else 0)
        
    if req.mark_gram_sabha_passed is not None:
        updates.append("gram_sabha_noc_obtained = ?")
        params.append(1 if req.mark_gram_sabha_passed else 0)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(land_id)
        cursor.execute(f"UPDATE cases SET {', '.join(updates)} WHERE land_id = ?", params)
        conn.commit()

    conn.close()
    
    # Re-evaluate full case to calculate new risk
    eval_res = get_full_case_eval(land_id)
    new_pred = eval_res["prediction"]
    
    # Update case table with new ML predictions
    conn = get_connection()
    cursor = conn.cursor()
    
    priority_score = int((new_pred["delay_probability"] * 70) + (min(new_pred["expected_delay_days"], 180) / 180.0 * 30))
    
    cursor.execute("""
        UPDATE cases 
        SET delay_probability = ?, risk_level = ?, expected_delay_days = ?, priority_score = ?, updated_at = ?
        WHERE land_id = ?
    """, (
        new_pred["delay_probability"],
        new_pred["risk_level"],
        new_pred["expected_delay_days"],
        priority_score,
        now,
        land_id
    ))
    
    # Log history entry
    cursor.execute("""
        INSERT INTO case_history (land_id, action, actor_name, actor_role, timestamp, notes, prev_risk_level, new_risk_level, prev_delay_days, new_delay_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        land_id,
        req.action,
        req.actor_name,
        req.actor_role,
        now,
        req.notes,
        prev_case["risk_level"],
        new_pred["risk_level"],
        prev_case["expected_delay_days"],
        new_pred["expected_delay_days"]
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "message": "Action logged and risk re-evaluated successfully",
        "prev_risk_level": prev_case["risk_level"],
        "new_risk_level": new_pred["risk_level"],
        "prev_delay_days": prev_case["expected_delay_days"],
        "new_delay_days": new_pred["expected_delay_days"],
        "eval": eval_res
    }

@app.post("/api/cases/{land_id}/documents/upload")
async def upload_document(
    land_id: str,
    doc_type: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...)
):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM cases WHERE land_id = ?", (land_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")
        
    case = dict(case_row)
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    # Extract OCR text
    extracted_text = ocr_service.extract_text_from_file(file_bytes, file.filename)
    entities = ocr_service.parse_entities(extracted_text)
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Save document record
    cursor.execute("""
        INSERT INTO documents (land_id, doc_type, title, filename, file_size, ocr_extracted_text, ocr_entities_json, uploaded_at, is_mandatory, is_present, verification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        land_id,
        doc_type,
        title,
        file.filename,
        file_size,
        extracted_text,
        json.dumps(entities),
        now,
        1,
        1,
        "VERIFIED"
    ))
    
    # Check if documents are now complete
    cursor.execute("SELECT doc_type FROM documents WHERE land_id = ? AND is_present = 1", (land_id,))
    uploaded_types = [r[0] for r in cursor.fetchall()]
    
    comp_check = verify_document_completeness(case["project_type"], uploaded_types)
    is_complete_int = 1 if comp_check["is_complete"] else 0
    
    cursor.execute("UPDATE cases SET documents_complete = ?, updated_at = ? WHERE land_id = ?", (is_complete_int, now, land_id))
    
    # History log
    cursor.execute("""
        INSERT INTO case_history (land_id, action, actor_name, actor_role, timestamp, notes, prev_risk_level, new_risk_level, prev_delay_days, new_delay_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        land_id,
        f"Uploaded Document: {title}",
        "Officer Intake / OCR Engine",
        "Document Verification Officer",
        now,
        f"Document '{title}' ({doc_type}) successfully processed with OCR. Extracted {len(entities.get('survey_numbers', []))} survey ref(s) and {len(entities.get('claimant_names', []))} name(s).",
        case["risk_level"],
        case["risk_level"],
        case["expected_delay_days"],
        case["expected_delay_days"]
    ))
    
    conn.commit()
    conn.close()
    
    # Re-evaluate
    return get_full_case_eval(land_id)

@app.get("/api/cases/{land_id}/documents/{doc_id}/sample-image")
def get_sample_document_image(land_id: str, doc_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT c.*, d.title, d.doc_type FROM documents d JOIN cases c ON d.land_id = c.land_id WHERE d.id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
        
    img_bytes = ocr_service.generate_sample_document_image(
        title=row["title"],
        survey_no=row["survey_no"],
        owner_name=f"{row['project_name']} Affected Landowner",
        area=f"{row['total_area_acres']} Acres",
        comp=f"₹ {int(row['offered_compensation']):,}",
        doc_type=row["doc_type"]
    )
    
    return Response(content=img_bytes, media_type="image/png")

@app.get("/api/admin/model-metrics")
def get_model_metrics():
    metrics = predictor.metrics
    if not metrics:
        metrics_path = os.path.join(os.path.dirname(__file__), "ml", "saved_models", "model_metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                metrics = json.load(f)
    return metrics

@app.post("/api/admin/retrain-model")
def retrain_model():
    metrics = train_and_save_models()
    predictor.load_model()
    return {"message": "Model retrained and re-calibrated successfully.", "metrics": metrics}

@app.get("/api/admin/config")
def get_config():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM app_config WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

@app.post("/api/admin/config")
def update_config(req: ConfigUpdateRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE app_config 
        SET default_circle_rate = ?, default_multiplier = ?, default_solatium_pct = ?, high_risk_threshold = ?, medium_risk_threshold = ?
        WHERE id = 1
    """, (
        req.default_circle_rate,
        req.default_multiplier,
        req.default_solatium_pct,
        req.high_risk_threshold,
        req.medium_risk_threshold
    ))
    conn.commit()
    conn.close()
    return {"message": "Configuration updated successfully."}

@app.post("/api/demo/reset-seed")
def reset_seed():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cases")
    cursor.execute("DELETE FROM claimants")
    cursor.execute("DELETE FROM court_records")
    cursor.execute("DELETE FROM documents")
    cursor.execute("DELETE FROM case_history")
    conn.commit()
    conn.close()
    
    seed_demo_data()
    return {"message": "Database reset and seeded with realistic demo cases."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
