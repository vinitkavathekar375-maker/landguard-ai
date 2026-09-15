MANDATORY_DOCUMENTS_BY_PROJECT = {
    "Highway": [
        {"doc_type": "7_12_EXTRACT", "title": "7/12 RoR Record of Rights", "is_mandatory": True},
        {"doc_type": "MUTATION_CERT", "title": "Mutation Certificate (Form 6)", "is_mandatory": True},
        {"doc_type": "ALIGNMENT_MAP", "title": "NHAI Gazetted Alignment Map", "is_mandatory": True},
        {"doc_type": "COMPENSATION_NOTICE", "title": "Section 3A/3D Gazetted Notice", "is_mandatory": True},
        {"doc_type": "FOREST_CLEARANCE", "title": "MoEFCC Forest Clearance NOC", "is_mandatory": True},
        {"doc_type": "GRAM_SABHA_NOC", "title": "Gram Sabha Resolution / NOC", "is_mandatory": False}
    ],
    "Railway": [
        {"doc_type": "7_12_EXTRACT", "title": "7/12 RoR Record of Rights", "is_mandatory": True},
        {"doc_type": "MUTATION_CERT", "title": "Mutation Certificate (Form 6)", "is_mandatory": True},
        {"doc_type": "SURVEY_MAP", "title": "Railway Cadastral Survey Map", "is_mandatory": True},
        {"doc_type": "COMPENSATION_NOTICE", "title": "Section 20A Notification", "is_mandatory": True},
        {"doc_type": "FOREST_CLEARANCE", "title": "Forest & Wildlife Clearance", "is_mandatory": True},
        {"doc_type": "VALUATION_REPORT", "title": "Tree/Structure Valuation Report", "is_mandatory": True}
    ],
    "Metro": [
        {"doc_type": "7_12_EXTRACT", "title": "Property Card / Title Deed", "is_mandatory": True},
        {"doc_type": "MUTATION_CERT", "title": "Revenue Mutation Entry", "is_mandatory": True},
        {"doc_type": "URBAN_NOC", "title": "Municipal Corporation No-Objection", "is_mandatory": True},
        {"doc_type": "SURVEY_MAP", "title": "Metro Demarcation & Utility Map", "is_mandatory": True},
        {"doc_type": "COMPENSATION_NOTICE", "title": "Direct Purchase / Consent Award Agreement", "is_mandatory": True}
    ],
    "Airport": [
        {"doc_type": "7_12_EXTRACT", "title": "7/12 RoR Record of Rights", "is_mandatory": True},
        {"doc_type": "MUTATION_CERT", "title": "Mutation Certificate", "is_mandatory": True},
        {"doc_type": "AAI_CLEARANCE", "title": "AAI Obstacle Limitation Surface Clearance", "is_mandatory": True},
        {"doc_type": "ENV_CLEARANCE", "title": "EIA Environmental Clearance (MoEFCC)", "is_mandatory": True},
        {"doc_type": "COMPENSATION_NOTICE", "title": "Section 11 Preliminary Notification", "is_mandatory": True}
    ],
    "Hospital": [
        {"doc_type": "7_12_EXTRACT", "title": "7/12 RoR Record of Rights", "is_mandatory": True},
        {"doc_type": "MUTATION_CERT", "title": "Mutation Certificate", "is_mandatory": True},
        {"doc_type": "TOWN_PLANNING", "title": "Town Planning & Zoning Change NOC", "is_mandatory": True},
        {"doc_type": "COMPENSATION_NOTICE", "title": "Rehabilitation & Resettlement Award", "is_mandatory": True}
    ],
    "Other": [
        {"doc_type": "7_12_EXTRACT", "title": "7/12 RoR Record of Rights", "is_mandatory": True},
        {"doc_type": "MUTATION_CERT", "title": "Mutation Certificate", "is_mandatory": True},
        {"doc_type": "SURVEY_MAP", "title": "Cadastral Survey Map", "is_mandatory": True},
        {"doc_type": "COMPENSATION_NOTICE", "title": "Acquisition Award Notice", "is_mandatory": True}
    ]
}

def verify_document_completeness(project_type: str, uploaded_doc_types: list) -> dict:
    checklist = MANDATORY_DOCUMENTS_BY_PROJECT.get(project_type, MANDATORY_DOCUMENTS_BY_PROJECT["Other"])
    results = []
    missing_mandatory = []
    
    for item in checklist:
        is_present = item["doc_type"] in uploaded_doc_types
        results.append({
            "doc_type": item["doc_type"],
            "title": item["title"],
            "is_mandatory": item["is_mandatory"],
            "is_present": is_present
        })
        if item["is_mandatory"] and not is_present:
            missing_mandatory.append(item["title"])
            
    is_complete = len(missing_mandatory) == 0
    return {
        "is_complete": is_complete,
        "total_required": len(checklist),
        "present_count": sum(1 for r in results if r["is_present"]),
        "missing_mandatory": missing_mandatory,
        "checklist": results
    }

def verify_compensation(area_acres: float, circle_rate_per_acre: float, multiplier: float, solatium_pct: float, offered_amount: float) -> dict:
    """
    Calculates statutory compensation benchmark according to RFCTLARR Act formula:
    Market Value = Area * Circle Rate * Multiplier
    Solatium = Market Value * (solatium_pct / 100)
    Total Statutory Entitlement = Market Value + Solatium
    """
    market_value = area_acres * circle_rate_per_acre * multiplier
    solatium = market_value * (solatium_pct / 100.0)
    statutory_total = market_value + solatium
    
    if offered_amount <= 0 or statutory_total <= 0:
        return {
            "verified": False,
            "statutory_total": round(statutory_total, 2),
            "offered_amount": round(offered_amount, 2),
            "discrepancy_amount": round(abs(statutory_total - offered_amount), 2),
            "discrepancy_pct": 100.0,
            "status": "UNVERIFIED",
            "message": "Compensation amount not entered or zero."
        }
        
    diff = offered_amount - statutory_total
    diff_pct = (diff / statutory_total) * 100.0
    
    # Within +/- 5% is verified
    is_verified = abs(diff_pct) <= 5.0
    
    if is_verified:
        status = "VERIFIED_COMPLIANT"
        msg = f"Offered award (₹{offered_amount:,.0f}) accurately matches statutory formula entitlement (₹{statutory_total:,.0f})."
    elif diff < 0:
        status = "UNDER_VALUED_RISK"
        msg = f"Offered compensation is ₹{abs(diff):,.0f} ({abs(diff_pct):.1f}%) below statutory entitlement. High risk of landowner arbitration or High Court writ."
    else:
        status = "OVER_VALUED_AUDIT_RISK"
        msg = f"Offered compensation exceeds statutory entitlement by ₹{diff:,.0f} ({diff_pct:.1f}%). May trigger CAG audit observation."
        
    return {
        "verified": is_verified,
        "market_value": round(market_value, 2),
        "solatium": round(solatium, 2),
        "statutory_total": round(statutory_total, 2),
        "offered_amount": round(offered_amount, 2),
        "discrepancy_amount": round(diff, 2),
        "discrepancy_pct": round(diff_pct, 1),
        "status": status,
        "message": msg
    }

def detect_ownership_conflicts(claimants: list) -> dict:
    """
    Evaluates claimant shares, contested inheritance, or disputed parcel claims.
    """
    if not claimants:
        return {
            "has_conflict": False,
            "conflict_type": "NONE",
            "message": "No claimant records filed yet.",
            "total_share_pct": 0.0
        }
        
    total_share = sum(float(c.get("share_pct", 0.0)) for c in claimants)
    names = [c.get("name", "").strip().lower() for c in claimants if c.get("name")]
    has_duplicate_name = len(names) != len(set(names))
    has_disputed_flag = any(c.get("is_disputed", False) for c in claimants)
    
    conflicts = []
    if abs(total_share - 100.0) > 0.05 and total_share > 0:
        conflicts.append(f"Claimant share sum is {total_share:.1f}% (Expected 100%).")
    if has_duplicate_name:
        conflicts.append("Duplicate claimant name detected across conflicting succession petitions.")
    if has_disputed_flag:
        conflicts.append("One or more claimants flagged active title objection in revenue record.")
        
    has_conflict = len(conflicts) > 0
    return {
        "has_conflict": has_conflict,
        "conflict_count": len(conflicts),
        "total_share_pct": round(total_share, 1),
        "conflicts": conflicts,
        "message": "Ownership conflict detected: " + "; ".join(conflicts) if has_conflict else "Title shares validated. Single coherent claim family."
    }

def generate_recommended_actions(case_data: dict, risk_prediction: dict, completeness: dict, comp_check: dict, ownership_check: dict) -> list:
    """
    Generates actionable, prescriptive decision-support tasks for acquisition officers.
    """
    actions = []
    
    # 1. Document checklist gaps
    for missing_doc in completeness.get("missing_mandatory", []):
        actions.append({
            "id": f"act_doc_{hash(missing_doc) % 10000}",
            "priority": "HIGH",
            "category": "DOCUMENTATION",
            "title": f"Procure Missing: {missing_doc}",
            "description": f"Serve formal requisition notice to Sub-Divisional Officer (SDO) / Tahsildar to issue {missing_doc}.",
            "recommended_sla_days": 7
        })
        
    # 2. Legal dispute
    if case_data.get("legal_dispute"):
        actions.append({
            "id": "act_legal_01",
            "priority": "CRITICAL",
            "category": "LEGAL_INTERVENTION",
            "title": "Engage Government Standing Counsel for Stay Vacation",
            "description": "Prepare counter-affidavit on public utility urgency under Section 40 urgency clause to vacate interim injunction.",
            "recommended_sla_days": 5
        })
        
    # 3. Ownership conflict
    if ownership_check.get("has_conflict"):
        actions.append({
            "id": "act_owner_01",
            "priority": "HIGH",
            "category": "DISPUTE_RESOLUTION",
            "title": "Convene Joint Hearing under Section 64 (Land Acquisition Authority)",
            "description": "Summon contested co-sharers before Competent Authority for apportionment settlement or escrow deposit under Section 77.",
            "recommended_sla_days": 10
        })
        
    # 4. Compensation mismatch
    if not comp_check.get("verified", True):
        actions.append({
            "id": "act_comp_01",
            "priority": "MEDIUM",
            "category": "VALUATION_CORRECTION",
            "title": "Recalculate Compensation Award with DLR Circle Rate",
            "description": comp_check.get("message", "Re-verify circle rate multiplier and tree/structure solatium calculation."),
            "recommended_sla_days": 3
        })
        
    # 5. Forest Clearance
    if case_data.get("forest_clearance_required") and not case_data.get("forest_clearance_obtained"):
        actions.append({
            "id": "act_forest_01",
            "priority": "HIGH",
            "category": "STATUTORY_CLEARANCE",
            "title": "Fast-Track Parivesh MoEFCC Forest Portal Filing",
            "description": "Follow up with DFO (Divisional Forest Officer) for joint inspection report submission on Parivesh 2.0 portal.",
            "recommended_sla_days": 14
        })

    # Default good standing check
    if not actions:
        actions.append({
            "id": "act_ready_01",
            "priority": "LOW",
            "category": "AWARD_DISBURSEMENT",
            "title": "Proceed to Final Award & Possession (Section 38)",
            "description": "All legal, documentation, and valuation gates cleared. Proceed with RTGS disbursement to verified bank accounts.",
            "recommended_sla_days": 15
        })
        
    return actions
