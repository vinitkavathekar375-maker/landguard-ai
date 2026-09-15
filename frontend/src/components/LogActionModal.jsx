import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, FileCheck, Scale, AlertCircle } from 'lucide-react';
import { logOfficerAction } from '../api';

export default function LogActionModal({ isOpen, onClose, caseItem, onActionSuccess }) {
  if (!isOpen || !caseItem) return null;

  const [actionTitle, setActionTitle] = useState('Engaged Government Counsel & Filed Counter Affidavit');
  const [notes, setNotes] = useState('Submitted urgency affidavit under Section 40 to vacate stay. Certified copy of village revenue mutation submitted.');
  const [resolveDispute, setResolveDispute] = useState(caseItem.legal_dispute === 1);
  const [resolveOwnership, setResolveOwnership] = useState(false);
  const [updatedCompensation, setUpdatedCompensation] = useState('');
  const [markForestCleared, setMarkForestCleared] = useState(false);
  const [markGramSabhaPassed, setMarkGramSabhaPassed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        action: actionTitle,
        notes: notes,
        actor_name: 'Shri R. K. Verma',
        actor_role: 'Special Land Acquisition Officer (SLAO)',
        resolve_dispute: resolveDispute ? true : undefined,
        resolve_ownership: resolveOwnership ? true : undefined,
        update_compensation: updatedCompensation ? parseFloat(updatedCompensation) : undefined,
        mark_forest_cleared: markForestCleared ? true : undefined,
        mark_gram_sabha_passed: markGramSabhaPassed ? true : undefined
      };

      const res = await logOfficerAction(caseItem.land_id, payload);
      alert(`Action logged successfully! Risk transitioned from ${res.prev_risk_level} (${res.prev_delay_days}d) to ${res.new_risk_level} (${res.new_delay_days}d).`);
      onActionSuccess(caseItem.land_id);
      onClose();
    } catch (err) {
      alert(`Error logging action: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Log Officer Intervention</h2>
            <p className="text-xs text-slate-500">Case: <span className="font-mono font-bold text-gov-800">{caseItem.land_id}</span> ({caseItem.project_name})</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Action Template */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Standard Action Category / Title</label>
            <select
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-gov-600"
            >
              <option value="Engaged Government Counsel & Filed Counter Affidavit">Engaged Government Counsel & Filed Counter Affidavit (Stay Vacation)</option>
              <option value="Convened Section 64 Apportionment Hearing">Convened Section 64 Apportionment Hearing (Claimant Dispute)</option>
              <option value="Recalculated Compensation Award to Statutory Circle Rate">Recalculated Compensation Award to Statutory Circle Rate</option>
              <option value="Obtained Parivesh Stage-1 Forest Clearance NOC">Obtained Parivesh Stage-1 Forest Clearance NOC</option>
              <option value="Secured Gram Sabha Resolution & Consent Certificate">Secured Gram Sabha Resolution & Consent Certificate</option>
              <option value="Custom Officer Review & Inspection Note">Custom Officer Review & Inspection Note</option>
            </select>
          </div>

          {/* Action Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Notes / Affidavit Details</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              placeholder="Provide procedural details, hearing dates, or Tahsildar correspondence..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-600"
            />
          </div>

          {/* Corrective State Toggles */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs">State Mitigations (Triggers Instant ML Risk Re-evaluation)</h4>
            
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={resolveDispute}
                onChange={(e) => setResolveDispute(e.target.checked)}
                className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500"
              />
              <span className="font-medium text-slate-700">Mark Legal Dispute / Court Injunction Vacated & Resolved</span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={resolveOwnership}
                onChange={(e) => setResolveOwnership(e.target.checked)}
                className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500"
              />
              <span className="font-medium text-slate-700">Mark Ownership Title Conflict Settled</span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={markForestCleared}
                onChange={(e) => setMarkForestCleared(e.target.checked)}
                className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500"
              />
              <span className="font-medium text-slate-700">Mark MoEFCC Forest Clearance Obtained</span>
            </label>

            <div className="pt-2">
              <label className="block font-semibold text-slate-700 mb-1">Update Offered Award Amount (Optional, ₹)</label>
              <input
                type="number"
                value={updatedCompensation}
                onChange={(e) => setUpdatedCompensation(e.target.value)}
                placeholder={`Current: ₹${caseItem.offered_compensation?.toLocaleString()}`}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gov-800 hover:bg-gov-900 text-white font-bold rounded-lg shadow-md flex items-center"
            >
              {submitting ? 'Updating & Evaluating ML Model...' : 'Save & Re-evaluate Risk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
