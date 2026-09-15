import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Upload, 
  Scale, 
  Users, 
  Building2, 
  Sparkles, 
  HelpCircle, 
  History, 
  ExternalLink,
  PlusCircle,
  FileCheck,
  FileWarning,
  Eye,
  Check,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { uploadCaseDocument, getDocumentSampleImageUrl } from '../api';

export default function CaseDetail({ 
  caseData, 
  onBack, 
  onOpenLogAction, 
  onRefreshCase 
}) {
  const [activeTab, setActiveTab] = useState('xai'); // 'xai', 'docs', 'verification', 'history'
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('7_12_EXTRACT');
  const [previewDoc, setPreviewDoc] = useState(null);

  if (!caseData || !caseData.case) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Loading acquisition case details...</p>
      </div>
    );
  }

  const { case: c, claimants, documents, court_records, history, rules, prediction, recommended_actions } = caseData;
  const { completeness, ownership_check, compensation_check, has_active_court_stay } = rules;

  // Format Explainability data for Bar Chart
  const chartData = (prediction?.explainability?.all_evaluated_factors || []).map(f => ({
    name: f.factor_name,
    impact: Math.round(f.weight * 100),
    direction: f.impact_direction,
    description: f.description
  }));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', selectedDocType);
      formData.append('title', selectedDocType.replace(/_/g, ' ').toUpperCase());

      await uploadCaseDocument(c.land_id, formData);
      await onRefreshCase(c.land_id);
      alert(`Document uploaded and processed with OCR successfully!`);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getRiskColor = (level) => {
    if (level === 'High') return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-300', fill: '#ef4444' };
    if (level === 'Medium') return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', fill: '#f59e0b' };
    return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300', fill: '#10b981' };
  };

  const riskTheme = getRiskColor(prediction?.risk_level);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-sm font-extrabold text-gov-900 bg-gov-100 px-2.5 py-0.5 rounded border border-gov-300">
                {c.land_id}
              </span>
              <h1 className="text-lg font-black text-slate-900">{c.project_name}</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                {c.project_type}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Survey No: <strong className="text-slate-800">{c.survey_no}</strong> • Village: <strong className="text-slate-800">{c.location_village}</strong>, District: <strong className="text-slate-800">{c.location_district}</strong> • Area: <strong className="text-slate-800">{c.total_area_acres} Acres</strong>
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onOpenLogAction(c)}
            className="bg-gov-800 hover:bg-gov-900 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-1.5 text-amber-400" />
            Log Officer Action & Re-evaluate
          </button>
        </div>
      </div>

      {/* AI Risk Score & Explainability Summary Ribbon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ML Prediction Metric Gauge */}
        <div className={`p-6 rounded-xl border ${riskTheme.border} ${riskTheme.bg} shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                AI Delay Risk Score
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${riskTheme.bg} ${riskTheme.text} border ${riskTheme.border}`}>
                {prediction?.risk_level} Risk Tier
              </span>
            </div>

            <div className="mt-4 flex items-baseline space-x-3">
              <h2 className={`text-4xl font-black ${riskTheme.text}`}>
                {prediction?.delay_probability_percent}%
              </h2>
              <span className="text-xs font-semibold text-slate-500">Delay Probability</span>
            </div>

            {/* Probability Bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${prediction?.delay_probability_percent}%`,
                  backgroundColor: riskTheme.fill 
                }}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-300/60 flex justify-between items-center text-xs">
            <div>
              <p className="text-slate-500 font-medium">Expected Delay Timeline</p>
              <p className="text-base font-extrabold text-slate-800 flex items-center mt-0.5">
                <Clock className="w-4 h-4 mr-1 text-slate-600" />
                +{prediction?.expected_delay_days} Days
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">Surveillance Status</p>
              <span className="inline-block mt-0.5 font-bold text-slate-700">{c.status}</span>
            </div>
          </div>
        </div>

        {/* Explainability Summary Insights */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-1.5 text-gov-700" />
                Explainable AI (XAI) — Root Cause Attribution
              </h3>
              <span className="text-[11px] text-slate-500">
                RandomForest Tree SHAP Attribution
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200">
              {prediction?.explainability?.summary}
            </p>

            {/* Top 3 Contributing Risk Drivers */}
            <div className="mt-4 space-y-2.5">
              {(prediction?.explainability?.factors || []).slice(0, 3).map((f, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg border text-xs flex items-start justify-between ${
                    f.impact_direction === 'increases_risk' 
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {f.impact_direction === 'increases_risk' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">{f.factor_name}</span>
                      <p className="text-[11px] opacity-90 mt-0.5">{f.description}</p>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-white/80 border border-slate-200 shrink-0">
                    {f.percentage_impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Decision Support Note: Human officer discretion required before passing statutory awards.</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('xai')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'xai'
              ? 'border-gov-800 text-gov-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Feature Contribution Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'docs'
              ? 'border-gov-800 text-gov-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-gov-600" />
          <span>Document Checklist & OCR ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'verification'
              ? 'border-gov-800 text-gov-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>Statutory Verification Checks</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-gov-800 text-gov-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-slate-600" />
          <span>Action Log & History ({history.length})</span>
        </button>
      </div>

      {/* TAB 1: Feature Contribution Chart & Recommended Next Actions */}
      {activeTab === 'xai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contribution Bar Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Factor Impact on Delay Probability</h3>
                <p className="text-xs text-slate-500">Horizontal bars represent percentage shift in expected delay risk</p>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-medium">
                <span className="flex items-center text-rose-600">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm mr-1"></span> Increases Delay Risk
                </span>
                <span className="flex items-center text-emerald-600">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm mr-1"></span> Mitigates Delay Risk
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 140, bottom: 5 }}
                >
                  <XAxis 
                    type="number" 
                    unit="%" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#334155' }} 
                    width={130}
                  />
                  <Tooltip 
                    formatter={(val) => [`${val > 0 ? '+' : ''}${val}% Impact`, 'Contribution']}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.impact > 0 ? '#ef4444' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">How to interpret this explainability chart:</p>
              <p>• Positive percentages (Red bars) push the case into the High Risk tier and require officer intervention.</p>
              <p>• Negative percentages (Green bars) confirm compliant statutory gates (e.g. clean title search, verified award calculation).</p>
            </div>
          </div>

          {/* Recommended Next Actions Checklist */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-amber-500" />
                  Recommended Next Actions
                </h3>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                  {recommended_actions.length} Action Items
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Prescriptive next steps generated by the decision-support engine:
              </p>

              <div className="mt-4 space-y-3">
                {recommended_actions.map((act) => (
                  <div 
                    key={act.id} 
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-gov-400 transition-all text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        act.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                        act.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {act.priority} • {act.category}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Target: {act.recommended_sla_days} Days
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900">{act.title}</h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onOpenLogAction(c)}
              className="mt-4 w-full bg-gov-800 hover:bg-gov-900 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center transition-colors"
            >
              Take Action & Update Case
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Document Completeness & OCR Hub */}
      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mandatory Checklist */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Mandatory Document Checklist</h3>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  completeness.is_complete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {completeness.present_count} of {completeness.total_required} Present
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Project Category Standard: <strong className="text-slate-700">{c.project_type}</strong>
              </p>
            </div>

            <div className="space-y-2.5">
              {completeness.checklist.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    item.is_present 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50/60 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {item.is_present ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <FileWarning className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <span className="text-[10px] opacity-75">
                        {item.is_mandatory ? 'Mandatory Statutory Record' : 'Optional Supplemental'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                    {item.is_present ? 'UPLOADED' : 'MISSING'}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Upload Box */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Upload & OCR Process Scanned Document</h4>
              <div className="space-y-2">
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  {completeness.checklist.map(item => (
                    <option key={item.doc_type} value={item.doc_type}>
                      {item.title} {item.is_present ? '(Already Uploaded)' : '(Missing)'}
                    </option>
                  ))}
                </select>

                <label className="w-full bg-amber-500 hover:bg-amber-400 text-gov-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center cursor-pointer transition-all">
                  <Upload className="w-4 h-4 mr-1.5" />
                  {uploading ? 'Processing OCR Extraction...' : 'Choose File / Scanned Image to OCR'}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.bmp,.webp,.txt"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Uploaded Documents & OCR Entity Inspector */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">OCR Extracted Records & Entity Verification</h3>
                <p className="text-xs text-slate-500">Extracted metadata parsed from scanned revenue files</p>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-medium">No documents uploaded yet for this case.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div className="flex items-center space-x-2.5">
                        <FileCheck className="w-5 h-5 text-gov-700" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{doc.title}</h4>
                          <p className="text-[11px] text-slate-500">{doc.filename} • Uploaded {doc.uploaded_at}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={getDocumentSampleImageUrl(c.land_id, doc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-gov-800 text-[11px] font-medium rounded border border-slate-200 flex items-center shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Certificate
                        </a>
                      </div>
                    </div>

                    {/* OCR Entities Grid */}
                    {doc.ocr_entities && (
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">Survey No Extracted</span>
                          <p className="font-mono font-bold text-gov-900 mt-0.5">
                            {doc.ocr_entities.survey_numbers?.join(', ') || 'None found'}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">Claimant Identified</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {doc.ocr_entities.claimant_names?.join(', ') || 'None found'}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">Land Area Extracted</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {doc.ocr_entities.land_area_extracted || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Extracted Raw OCR Text Snippet */}
                    <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] leading-relaxed max-h-28 overflow-y-auto">
                      <div className="text-[10px] text-amber-400 font-bold mb-1">// OCR Text Stream:</div>
                      {doc.ocr_extracted_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Statutory Verification Checks */}
      {activeTab === 'verification' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Court Dispute Verification */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center">
                <Scale className="w-4 h-4 mr-1.5 text-gov-700" />
                Judiciary Court Registry Check
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                has_active_court_stay ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {has_active_court_stay ? 'LITIGATION FOUND' : 'CLEAR TITLE'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Queried against District Court, High Court, and Land Tribunal pending registries.
            </p>

            {court_records.length > 0 ? (
              <div className="space-y-3 pt-2">
                {court_records.map((cr) => (
                  <div key={cr.id} className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-rose-900">
                      <span>{cr.case_number}</span>
                      <span className="bg-rose-200/80 px-1.5 py-0.2 rounded text-[10px]">{cr.status}</span>
                    </div>
                    <p className="text-slate-700 font-medium">{cr.court_name}</p>
                    <p className="text-slate-600 text-[11px]">Dispute: {cr.dispute_type}</p>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-rose-200/60 flex justify-between">
                      <span>Petitioner: {cr.petitioner}</span>
                      <span>Next: {cr.next_hearing_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="font-semibold">Zero pending writ petitions or stay orders recorded for Survey {c.survey_no}.</p>
              </div>
            )}
          </div>

          {/* Ownership Conflict Check */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-gov-700" />
                Claimants & Title Shares
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                ownership_check.has_conflict ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {ownership_check.has_conflict ? 'CONFLICT DETECTED' : 'SHARES VALID'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Total Recorded Title Share: <strong className="text-slate-800">{ownership_check.total_share_pct}%</strong> (Expected: 100%)
            </p>

            <div className="space-y-2 pt-2">
              {claimants.map((cl) => (
                <div 
                  key={cl.id} 
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    cl.is_disputed ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-900">{cl.name}</span>
                    <span className="text-gov-800 font-mono">{cl.share_pct}% Share</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Aadhaar Ref: ****{cl.aadhar_last4 || '1234'}</span>
                    <span className={cl.is_disputed ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>
                      {cl.is_disputed ? 'Contested Claim' : 'Verified Claim'}
                    </span>
                  </div>
                  {cl.notes && <p className="text-[10px] text-slate-600 italic">{cl.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Compensation Formula Matcher */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center">
                <Building2 className="w-4 h-4 mr-1.5 text-gov-700" />
                Compensation Formula Matcher
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                compensation_check.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {compensation_check.status}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Land Parcel Area:</span>
                <span className="font-bold text-slate-800">{c.total_area_acres} Acres</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Circle Rate (Per Acre):</span>
                <span className="font-bold text-slate-800">₹{c.circle_rate_per_acre?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Multiplier Factor:</span>
                <span className="font-bold text-slate-800">{c.multiplier}x (Rural/Urban)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Solatium Allowance:</span>
                <span className="font-bold text-slate-800">{c.solatium_pct}% (100% statutory)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Statutory Entitlement:</span>
                <span className="text-gov-800 font-mono">₹{compensation_check.statutory_total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Entered Award Amount:</span>
                <span className="font-mono text-slate-800">₹{c.offered_compensation?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] font-semibold">
                <span>Formula Discrepancy:</span>
                <span className={compensation_check.verified ? 'text-emerald-700' : 'text-rose-600'}>
                  {compensation_check.discrepancy_pct > 0 ? `+${compensation_check.discrepancy_pct}%` : `${compensation_check.discrepancy_pct}%`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {compensation_check.message}
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Case History & Action Timeline */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Case Action & Audit Trail History</h3>
            <p className="text-xs text-slate-500">Complete log of officer interventions and subsequent AI risk score transitions</p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {history.map((log) => (
              <div key={log.id} className="relative group">
                <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-gov-700 border-2 border-white"></span>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex flex-wrap justify-between items-center text-xs">
                    <h4 className="font-bold text-slate-900">{log.action}</h4>
                    <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] font-medium">
                    Logged by: <strong className="text-slate-700">{log.actor_name}</strong> ({log.actor_role})
                  </p>
                  <p className="text-slate-700 text-xs bg-white p-2.5 rounded border border-slate-100">
                    {log.notes}
                  </p>
                  {(log.prev_risk_level || log.new_risk_level) && (
                    <div className="pt-2 flex items-center space-x-2 text-[11px] text-slate-500 font-medium">
                      <span>Risk Transition:</span>
                      <span className="font-bold text-slate-700">{log.prev_risk_level || 'N/A'}</span>
                      <span>→</span>
                      <span className="font-bold text-gov-800">{log.new_risk_level}</span>
                      <span className="text-slate-400">| Expected Delay: {log.new_delay_days} days</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
