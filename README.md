# 🏛️ LandGuard AI — Early-Warning Decision-Support System for Land Acquisition Delays

**LandGuard AI** is a full-stack decision-support platform engineered for government land acquisition officers (SLAOs), competent authorities (CALA), and infrastructure project directors. It provides early-warning delay risk surveillance, transparent root-cause explainability (Tree SHAP / feature contributions), statutory compliance verification, and actionable intervention workflows.

---

## 🌟 Key Features

1. **AI Delay Risk & Expected Timeline Prediction**:
   - **Ensemble Classifier**: Predicts delay probability (0–100%) and categorizes cases into **Low / Medium / High Risk Tiers**.
   - **Regressor Pipeline**: Estimates expected statutory delay in days.
   - **Empirical Diagnostics**: Displays real test-split accuracy, confusion matrix, precision, recall, and ROC-AUC.

2. **Explainable AI (XAI) Attribution**:
   - Instance-level feature contributions rendered in interactive horizontal charts.
   - Plain-language legal/administrative root cause explanations (e.g., *"Active court litigation detected — +32% delay impact"*, *"Statutory award formula mismatch — +18% delay impact"*).

3. **Statutory Document Completeness & OCR Hub**:
   - Dynamic checklist validation tailored to project type (Highway, Railway, Metro, Airport, Hospital, etc.).
   - Integrated OCR text extraction parsing survey numbers, claimant names, acreage, and compensation values from scanned certificates.
   - Built-in visual revenue document preview generator with certified seals.

4. **Automated Statutory Verification Engines**:
   - **Judiciary Dispute Checker**: Simulates searches across High Court and District Court injunction registries.
   - **Ownership Conflict Engine**: Validates claimant share tallies against 100% statutory benchmarks and flags contested titles.
   - **RFCTLARR Act Compensation Matcher**: Verifies offered award amounts against the statutory formula:
     $$\text{Statutory Award} = (\text{Area} \times \text{Circle Rate} \times \text{Multiplier}) \times (1 + \text{Solatium Multiplier})$$

5. **Human-in-the-Loop Officer Interventions**:
   - Prescriptive recommended next actions with target SLA timelines.
   - Interactive action logger (vacating stay, adjusting compensation, settling title disputes) that triggers instant risk re-evaluation and logs chronological audit trails.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python FastAPI with SQLite relational database
- **Machine Learning**: scikit-learn `RandomForestClassifier` & `RandomForestRegressor`
- **OCR Engine**: Tesseract OCR pipeline with intelligent revenue regex entity parser
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts

---

## 🚀 Quickstart Guide

### 1. Backend Setup

```bash
# In project root
# Install Python dependencies
python -m pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn backend.main:app --reload --port 8000
```
Backend Swagger API documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend Setup

```bash
# Open a new terminal in the frontend directory
cd frontend

# Start the Vite development server
npm run dev
```
Access the dashboard at: [http://localhost:5173](http://localhost:5173)

---

## 🔬 Retraining the Machine Learning Model

To retrain the Random Forest model from the CLI or generate fresh synthetic historical datasets:

```bash
python -m backend.ml.dataset_generator
```
Or use the **"Retrain Random Forest Pipeline"** button directly in the **Model & Admin** tab of the web dashboard.

---

## ⚖️ Ethical Governance & Decision-Support Notice
LandGuard AI is designed strictly as a **decision-support advisory tool** for human revenue officers. Output flags, probability tiers, and factor attributions assist officers in identifying bottlenecks early and do not constitute automated legal judgments.
