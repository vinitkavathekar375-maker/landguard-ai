const API_BASE = "https://landguard-ai-backend.onrender.com/api";

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard statistics");
  return res.json();
}

export async function fetchCases(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.project_type) query.append("project_type", params.project_type);
  if (params.risk_level) query.append("risk_level", params.risk_level);
  if (params.status) query.append("status", params.status);
  if (params.priority_only) query.append("priority_only", "true");
  if (params.sort_by) query.append("sort_by", params.sort_by);

  const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

export async function fetchCaseDetail(landId) {
  const res = await fetch(`${API_BASE}/cases/${landId}`);
  if (!res.ok) throw new Error(`Failed to fetch case ${landId}`);
  return res.json();
}

export async function createCase(data) {
  const res = await fetch(`${API_BASE}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create case");
  }
  return res.json();
}

export async function logOfficerAction(landId, actionData) {
  const res = await fetch(`${API_BASE}/cases/${landId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(actionData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to log action");
  }
  return res.json();
}

export async function uploadCaseDocument(landId, formData) {
  const res = await fetch(`${API_BASE}/cases/${landId}/documents/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to upload document");
  }
  return res.json();
}

export async function fetchModelMetrics() {
  const res = await fetch(`${API_BASE}/admin/model-metrics`);
  if (!res.ok) throw new Error("Failed to fetch model metrics");
  return res.json();
}

export async function retrainModel() {
  const res = await fetch(`${API_BASE}/admin/retrain-model`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to retrain model");
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/admin/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function updateConfig(configData) {
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(configData)
  });
  if (!res.ok) throw new Error("Failed to update config");
  return res.json();
}

export async function resetDemoDatabase() {
  const res = await fetch(`${API_BASE}/demo/reset-seed`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to reset demo database");
  return res.json();
}

export function getDocumentSampleImageUrl(landId, docId) {
  return `${API_BASE}/cases/${landId}/documents/${docId}/sample-image`;
}
