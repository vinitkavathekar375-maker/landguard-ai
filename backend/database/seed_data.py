import os
import json
from datetime import datetime, timedelta
from .db import get_connection, init_db
from ..ml.predictor import LandGuardPredictor
from ..rules.rule_engine import (
    verify_document_completeness,
    verify_compensation,
    detect_ownership_conflicts,
    generate_recommended_actions,
    MANDATORY_DOCUMENTS_BY_PROJECT
)

def seed_demo_data():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM cases")
    count = cursor.fetchone()[0]
    if count > 5:
        print("[Seed] Database already populated with cases.")
        conn.close()
        return

    predictor = LandGuardPredictor()
    now = datetime.now()

    # 1. Seed Court Records
    court_cases = [
        ("CS-2023/1049", "District Court Pune", "142/3B", "L001", "Succession & Partition Suit", "Suresh Deshmukh", "Rameshwar Shinde", 1, "2026-10-15", "Active Injunction"),
        ("WP-2022/8841", "High Court Bombay", "89/1A", "L003", "Land Valuation Challenge (Sec 64)", "Kalyani Farmers Syndicate", "State Land Acquisition Officer", 1, "2026-11-02", "Interim Stay"),
        ("OS-2024/312", "Senior Civil Judge Thane", "204/2", "L005", "Gram Sabha Forest Right Dispute", "Tribal Land Committee", "NHAI Project Director", 1, "2026-09-28", "Stay Notice Issued"),
        ("CS-2021/552", "Civil Court Nagpur", "56/4", "L007", "Boundary Demarcation Encroachment", "Anilrao Patil", "Central Railway Board", 0, "2026-12-01", "Hearing for Evidence")
    ]
    
    for c in court_cases:
        cursor.execute("""
            INSERT INTO court_records (case_number, court_name, survey_no, land_id, dispute_type, petitioner, respondent, stay_granted, next_hearing_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, c)

    # 2. Rich Demo Cases
    demo_cases_spec = [
        {
            "land_id": "LG-NH48-01",
            "project_name": "NH-48 National Highway 6-Laning",
            "project_type": "Highway",
            "location_village": "Shivapur",
            "location_district": "Pune",
            "survey_no": "142/3B",
            "total_area_acres": 4.85,
            "num_claimants": 4,
            "circle_rate_per_acre": 2800000.0,
            "multiplier": 1.5,
            "solatium_pct": 100.0,
            "offered_compensation": 40740000.0, # matches formula (4.85 * 2.8M * 1.5 * 2 = 40.74M)
            "status": "Injunction Stayed",
            "documents_complete": 0, # Missing Forest Clearance
            "legal_dispute": 1, # Active High Court stay
            "ownership_conflict": 1, # 2 co-sharers disputing partition
            "compensation_verified": 1,
            "forest_clearance_required": 1,
            "forest_clearance_obtained": 0,
            "gram_sabha_noc_obtained": 1,
            "claimants": [
                {"name": "Rameshwar Shankar Shinde", "share_pct": 60.0, "aadhar_last4": "4912", "is_disputed": 0, "notes": "Registered title holder"},
                {"name": "Suresh Babanrao Deshmukh", "share_pct": 50.0, "aadhar_last4": "8821", "is_disputed": 1, "notes": "Filed Civil Suit claiming grandfather heirship"}
            ],
            "docs": ["7_12_EXTRACT", "MUTATION_CERT", "ALIGNMENT_MAP", "COMPENSATION_NOTICE"] # Missing FOREST_CLEARANCE
        },
        {
            "land_id": "LG-METRO-02",
            "project_name": "Pune Metro Line 3 Extension",
            "project_type": "Metro",
            "location_village": "Hinjawadi Phase 1",
            "location_district": "Pune",
            "survey_no": "218/1",
            "total_area_acres": 1.20,
            "num_claimants": 1,
            "circle_rate_per_acre": 12000000.0,
            "multiplier": 1.25,
            "solatium_pct": 100.0,
            "offered_compensation": 36000000.0, # 1.2 * 12M * 1.25 * 2 = 36M
            "status": "Under Documentation",
            "documents_complete": 1,
            "legal_dispute": 0,
            "ownership_conflict": 0,
            "compensation_verified": 1,
            "forest_clearance_required": 0,
            "forest_clearance_obtained": 1,
            "gram_sabha_noc_obtained": 1,
            "claimants": [
                {"name": "TechPark Realty Pvt Ltd", "share_pct": 100.0, "aadhar_last4": "0029", "is_disputed": 0, "notes": "Corporate title clearance verified"}
            ],
            "docs": ["7_12_EXTRACT", "MUTATION_CERT", "URBAN_NOC", "SURVEY_MAP", "COMPENSATION_NOTICE"]
        },
        {
            "land_id": "LG-RLWY-03",
            "project_name": "Dedicated Freight Corridor DFC Package 7",
            "project_type": "Railway",
            "location_village": "Daund",
            "location_district": "Pune",
            "survey_no": "89/1A",
            "total_area_acres": 6.50,
            "num_claimants": 6,
            "circle_rate_per_acre": 1800000.0,
            "multiplier": 1.5,
            "solatium_pct": 100.0,
            "offered_compensation": 24000000.0, # Statutory is 6.5 * 1.8M * 1.5 * 2 = 35.1M -> 31% undervalued!
            "status": "Valuation Dispute",
            "documents_complete": 1,
            "legal_dispute": 1,
            "ownership_conflict": 0,
            "compensation_verified": 0,
            "forest_clearance_required": 1,
            "forest_clearance_obtained": 1,
            "gram_sabha_noc_obtained": 1,
            "claimants": [
                {"name": "Kalyani Agriculture Federation", "share_pct": 100.0, "aadhar_last4": "3391", "is_disputed": 0, "notes": "Objected to circle rate valuation formula"}
            ],
            "docs": ["7_12_EXTRACT", "MUTATION_CERT", "SURVEY_MAP", "COMPENSATION_NOTICE", "FOREST_CLEARANCE", "VALUATION_REPORT"]
        },
        {
            "land_id": "LG-AIRP-04",
            "project_name": "Purandar International Green Airport",
            "project_type": "Airport",
            "location_village": "Vanpuri",
            "location_district": "Pune",
            "survey_no": "304/7",
            "total_area_acres": 14.20,
            "num_claimants": 8,
            "circle_rate_per_acre": 2200000.0,
            "multiplier": 1.5,
            "solatium_pct": 100.0,
            "offered_compensation": 93720000.0, # 14.2 * 2.2M * 1.5 * 2 = 93.72M
            "status": "NOC Pending",
            "documents_complete": 0, # Missing EIA Environment Clearance
            "legal_dispute": 0,
            "ownership_conflict": 1, # Co-sharers total share mismatch
            "compensation_verified": 1,
            "forest_clearance_required": 1,
            "forest_clearance_obtained": 0,
            "gram_sabha_noc_obtained": 0,
            "claimants": [
                {"name": "Anandrao Tukaram Jadhav", "share_pct": 40.0, "aadhar_last4": "1192", "is_disputed": 0, "notes": "Elder brother"},
                {"name": "Pandurang Tukaram Jadhav", "share_pct": 40.0, "aadhar_last4": "1193", "is_disputed": 0, "notes": "Co-owner"},
                {"name": "Sunita Sanjay Kadam", "share_pct": 35.0, "aadhar_last4": "5512", "is_disputed": 1, "notes": "Claiming 1/3rd ancestral share"}
            ],
            "docs": ["7_12_EXTRACT", "MUTATION_CERT", "AAI_CLEARANCE", "COMPENSATION_NOTICE"] # Missing ENV_CLEARANCE
        },
        {
            "land_id": "LG-HOSP-05",
            "project_name": "Regional Multi-Specialty AIIMS Extension",
            "project_type": "Hospital",
            "location_village": "Manchar",
            "location_district": "Pune",
            "survey_no": "45/2",
            "total_area_acres": 8.00,
            "num_claimants": 2,
            "circle_rate_per_acre": 3500000.0,
            "multiplier": 1.25,
            "solatium_pct": 100.0,
            "offered_compensation": 70000000.0, # 8 * 3.5M * 1.25 * 2 = 70M
            "status": "Award Sanctioned",
            "documents_complete": 1,
            "legal_dispute": 0,
            "ownership_conflict": 0,
            "compensation_verified": 1,
            "forest_clearance_required": 0,
            "forest_clearance_obtained": 1,
            "gram_sabha_noc_obtained": 1,
            "claimants": [
                {"name": "Chandrakant Narayan Thorat", "share_pct": 100.0, "aadhar_last4": "7721", "is_disputed": 0, "notes": "Consented to direct award"}
            ],
            "docs": ["7_12_EXTRACT", "MUTATION_CERT", "TOWN_PLANNING", "COMPENSATION_NOTICE"]
        }
    ]

    # Add ~10 more varied cases for realistic dashboard depth
    for idx in range(6, 21):
        pt = ["Highway", "Railway", "Metro", "Airport", "Hospital", "Other"][idx % 6]
        has_disp = 1 if idx % 3 == 0 else 0
        has_own = 1 if idx % 4 == 0 else 0
        has_doc = 0 if idx % 5 == 0 else 1
        has_comp = 0 if idx % 6 == 0 else 1
        
        area = round(2.0 + (idx * 0.75), 2)
        crate = 2000000.0 + (idx * 150000)
        mult = 1.5 if pt in ["Highway", "Railway", "Airport"] else 1.25
        statutory = area * crate * mult * 2.0
        offered = statutory if has_comp else statutory * 0.78
        
        demo_cases_spec.append({
            "land_id": f"LG-{pt[:4].upper()}-{idx:02d}",
            "project_name": f"{pt} Corridor Sector {idx}",
            "project_type": pt,
            "location_village": f"Sector-{idx} Gram",
            "location_district": "Pune",
            "survey_no": f"{110 + idx}/{idx % 4 + 1}",
            "total_area_acres": area,
            "num_claimants": (idx % 4) + 1,
            "circle_rate_per_acre": crate,
            "multiplier": mult,
            "solatium_pct": 100.0,
            "offered_compensation": offered,
            "status": "In Progress" if has_disp or has_own else "Award Approved",
            "documents_complete": has_doc,
            "legal_dispute": has_disp,
            "ownership_conflict": has_own,
            "compensation_verified": has_comp,
            "forest_clearance_required": 1 if pt in ["Highway", "Airport"] else 0,
            "forest_clearance_obtained": 0 if (pt in ["Highway", "Airport"] and idx % 2 == 0) else 1,
            "gram_sabha_noc_obtained": 0 if idx % 7 == 0 else 1,
            "claimants": [
                {"name": f"Landowner Claimant {idx}A", "share_pct": 100.0 if not has_own else 65.0, "aadhar_last4": f"{1000 + idx}", "is_disputed": has_own, "notes": "Verified title"}
            ],
            "docs": ["7_12_EXTRACT", "MUTATION_CERT", "COMPENSATION_NOTICE"]
        })

    for spec in demo_cases_spec:
        # Run ML prediction
        pred = predictor.predict_risk(spec)
        risk_level = pred["risk_level"]
        delay_prob = pred["delay_probability"]
        delay_days = pred["expected_delay_days"]
        
        # Priority score for queue (High risk + long delay = higher priority)
        priority_score = int((delay_prob * 70) + (min(delay_days, 180) / 180.0 * 30))
        
        created_date = (now - timedelta(days=int(30 + hash(spec["land_id"]) % 60))).strftime("%Y-%m-%d %H:%M:%S")
        updated_date = now.strftime("%Y-%m-%d %H:%M:%S")

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
            spec["land_id"], spec["project_name"], spec["project_type"], spec["location_village"],
            spec["location_district"], spec["survey_no"], spec["total_area_acres"],
            spec["num_claimants"], spec["offered_compensation"], spec["circle_rate_per_acre"],
            spec["multiplier"], spec["solatium_pct"], spec["status"], spec["documents_complete"],
            spec["legal_dispute"], spec["ownership_conflict"], spec["compensation_verified"],
            spec["forest_clearance_required"], spec["forest_clearance_obtained"],
            spec["gram_sabha_noc_obtained"], delay_prob, risk_level, delay_days,
            priority_score, created_date, updated_date
        ))

        # Insert Claimants
        for cl in spec.get("claimants", []):
            cursor.execute("""
                INSERT INTO claimants (land_id, name, share_pct, aadhar_last4, bank_verified, is_disputed, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (spec["land_id"], cl["name"], cl.get("share_pct", 100.0), cl.get("aadhar_last4", "1234"), 1, cl.get("is_disputed", 0), cl.get("notes", "")))

        # Insert Documents
        for dtype in spec.get("docs", []):
            cursor.execute("""
                INSERT INTO documents (land_id, doc_type, title, filename, file_size, ocr_extracted_text, ocr_entities_json, uploaded_at, is_mandatory, is_present, verification_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                spec["land_id"],
                dtype,
                dtype.replace("_", " ").title(),
                f"{spec['land_id']}_{dtype.lower()}.pdf",
                142050,
                f"Extract of {dtype} for Parcel {spec['survey_no']} in {spec['location_village']}, Area: {spec['total_area_acres']} Acres. Officer verified.",
                json.dumps({
                    "survey_numbers": [spec["survey_no"]],
                    "claimant_names": [c["name"] for c in spec.get("claimants", [])],
                    "land_area_extracted": f"{spec['total_area_acres']} Acres",
                    "dates_found": ["14/03/2024"],
                    "compensation_amounts": [f"₹ {int(spec['offered_compensation']):,}"],
                    "confidence_score": 0.94
                }),
                created_date,
                1,
                1,
                "VERIFIED"
            ))

        # Insert Initial Case History Log
        cursor.execute("""
            INSERT INTO case_history (land_id, action, actor_name, actor_role, timestamp, notes, prev_risk_level, new_risk_level, prev_delay_days, new_delay_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            spec["land_id"],
            "Initial Acquisition Intake & AI Risk Assessment",
            "System Automation / SLAO Officer",
            "Special Land Acquisition Officer",
            created_date,
            f"Case intake processed. Initial risk evaluated as {risk_level} with expected delay of {delay_days} days.",
            "None",
            risk_level,
            0,
            delay_days
        ))

    conn.commit()
    conn.close()
    print(f"[Seed] Successfully seeded {len(demo_cases_spec)} realistic demo land acquisition cases.")

if __name__ == "__main__":
    seed_demo_data()
