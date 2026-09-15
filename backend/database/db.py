import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "landguard.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()
    
    # Cases Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        land_id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        project_type TEXT NOT NULL,
        location_village TEXT,
        location_district TEXT,
        survey_no TEXT,
        total_area_acres REAL DEFAULT 1.0,
        num_claimants INTEGER DEFAULT 1,
        offered_compensation REAL DEFAULT 0.0,
        circle_rate_per_acre REAL DEFAULT 2000000.0,
        multiplier REAL DEFAULT 1.5,
        solatium_pct REAL DEFAULT 100.0,
        status TEXT DEFAULT 'Under Assessment',
        documents_complete INTEGER DEFAULT 1,
        legal_dispute INTEGER DEFAULT 0,
        ownership_conflict INTEGER DEFAULT 0,
        compensation_verified INTEGER DEFAULT 1,
        forest_clearance_required INTEGER DEFAULT 0,
        forest_clearance_obtained INTEGER DEFAULT 1,
        gram_sabha_noc_obtained INTEGER DEFAULT 1,
        delay_probability REAL DEFAULT 0.0,
        risk_level TEXT DEFAULT 'Low',
        expected_delay_days INTEGER DEFAULT 0,
        priority_score INTEGER DEFAULT 10,
        created_at TEXT,
        updated_at TEXT
    )
    """)
    
    # Claimants Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claimants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        land_id TEXT NOT NULL,
        name TEXT NOT NULL,
        share_pct REAL DEFAULT 100.0,
        aadhar_last4 TEXT,
        bank_verified INTEGER DEFAULT 1,
        is_disputed INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (land_id) REFERENCES cases (land_id) ON DELETE CASCADE
    )
    """)
    
    # Court Records Lookup (Simulated Judiciary Registry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS court_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_number TEXT NOT NULL,
        court_name TEXT NOT NULL,
        survey_no TEXT,
        land_id TEXT,
        dispute_type TEXT,
        petitioner TEXT,
        respondent TEXT,
        stay_granted INTEGER DEFAULT 0,
        next_hearing_date TEXT,
        status TEXT DEFAULT 'Pending'
    )
    """)
    
    # Documents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        land_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        ocr_extracted_text TEXT,
        ocr_entities_json TEXT,
        uploaded_at TEXT,
        is_mandatory INTEGER DEFAULT 1,
        is_present INTEGER DEFAULT 1,
        verification_status TEXT DEFAULT 'VERIFIED',
        FOREIGN KEY (land_id) REFERENCES cases (land_id) ON DELETE CASCADE
    )
    """)
    
    # Case History / Action Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS case_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        land_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        timestamp TEXT,
        notes TEXT,
        prev_risk_level TEXT,
        new_risk_level TEXT,
        prev_delay_days INTEGER,
        new_delay_days INTEGER,
        FOREIGN KEY (land_id) REFERENCES cases (land_id) ON DELETE CASCADE
    )
    """)
    
    # App Config Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY,
        default_circle_rate REAL DEFAULT 2500000.0,
        default_multiplier REAL DEFAULT 1.5,
        default_solatium_pct REAL DEFAULT 100.0,
        high_risk_threshold REAL DEFAULT 0.65,
        medium_risk_threshold REAL DEFAULT 0.35
    )
    """)
    
    cursor.execute("INSERT OR IGNORE INTO app_config (id, default_circle_rate, default_multiplier, default_solatium_pct, high_risk_threshold, medium_risk_threshold) VALUES (1, 2500000.0, 1.5, 100.0, 0.65, 0.35)")
    
    conn.commit()
    conn.close()
    print("[Database] SQLite database initialized successfully.")

if __name__ == "__main__":
    init_db()
