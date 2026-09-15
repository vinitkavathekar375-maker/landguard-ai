import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Building2, Calculator, Users } from 'lucide-react';
import { createCase } from '../api';

export default function NewCaseModal({ isOpen, onClose, onCaseCreated }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    land_id: `LG-${Math.floor(1000 + Math.random() * 9000)}`,
    project_name: 'Western Bypass High-Speed Link',
    project_type: 'Highway',
    location_village: 'Khed Shivapur',
    location_district: 'Pune',
    survey_no: '214/1',
    total_area_acres: 3.50,
    circle_rate_per_acre: 3000000,
    multiplier: 1.5,
    solatium_pct: 100,
    offered_compensation: 31500000,
    forest_clearance_required: false,
    forest_clearance_obtained: true,
    gram_sabha_noc_obtained: true,
  });

  const [claimants, setClaimants] = useState([
    { name: 'Ramesh Narayan Deshmukh', share_pct: 100.0, aadhar_last4: '4192', is_disputed: false, notes: 'Primary khatedar' }
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Live calculation of Statutory Minimum Compensation
  const statutoryCalculated = (formData.total_area_acres * formData.circle_rate_per_acre * formData.multiplier) * (1 + (formData.solatium_pct / 100));

  const handleAddClaimant = () => {
    setClaimants([
      ...claimants,
      { name: '', share_pct: 50.0, aadhar_last4: '1234', is_disputed: false, notes: '' }
    ]);
  };

  const handleRemoveClaimant = (index) => {
    setClaimants(claimants.filter((_, i) => i !== index));
  };

  const handleClaimantChange = (index, field, value) => {
    const updated = [...claimants];
    updated[index][field] = value;
    setClaimants(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        total_area_acres: parseFloat(formData.total_area_acres),
        circle_rate_per_acre: parseFloat(formData.circle_rate_per_acre),
        multiplier: parseFloat(formData.multiplier),
        solatium_pct: parseFloat(formData.solatium_pct),
        offered_compensation: parseFloat(formData.offered_compensation),
        claimants: claimants.map(c => ({
          ...c,
          share_pct: parseFloat(c.share_pct)
        }))
      };

      const res = await createCase(payload);
      alert(`Case ${res.land_id} successfully created! Initial delay risk evaluated as ${res.prediction.risk_level}.`);
      onCaseCreated(res.land_id);
      onClose();
    } catch (err) {
      alert(`Error creating case: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gov-700" />
              Register New Land Acquisition Case
            </h2>
            <p className="text-xs text-slate-500">Initiate statutory surveillance and baseline delay risk scoring</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Land ID (Unique Key)</label>
              <input
                type="text"
                required
                value={formData.land_id}
                onChange={(e) => setFormData({ ...formData, land_id: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-gov-900 focus:outline-none focus:ring-2 focus:ring-gov-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
              <input
                type="text"
                required
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-gov-600"
              />
            </div>
          </div>

          {/* Row 2: Category & Survey */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Project Category</label>
              <select
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none"
              >
                <option value="Highway">Highway</option>
                <option value="Railway">Railway</option>
                <option value="Metro">Metro</option>
                <option value="Airport">Airport</option>
                <option value="Hospital">Hospital</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Survey / Gat No</label>
              <input
                type="text"
                required
                value={formData.survey_no}
                onChange={(e) => setFormData({ ...formData, survey_no: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village</label>
              <input
                type="text"
                required
                value={formData.location_village}
                onChange={(e) => setFormData({ ...formData, location_village: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                required
                value={formData.location_district}
                onChange={(e) => setFormData({ ...formData, location_district: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Land Valuation & Compensation Formula */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center">
              <Calculator className="w-4 h-4 mr-1.5 text-gov-700" />
              Statutory Valuation Parameters (RFCTLARR Act)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Area (Acres)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.total_area_acres}
                  onChange={(e) => setFormData({ ...formData, total_area_acres: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Circle Rate / Acre (₹)</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={formData.circle_rate_per_acre}
                  onChange={(e) => setFormData({ ...formData, circle_rate_per_acre: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Multiplier Factor</label>
                <select
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                >
                  <option value={1.5}>1.5x (Rural)</option>
                  <option value={1.25}>1.25x (Semi-Urban)</option>
                  <option value={1.0}>1.0x (Urban Municipal)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Offered Award (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.offered_compensation}
                  onChange={(e) => setFormData({ ...formData, offered_compensation: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="p-2.5 bg-gov-50/70 border border-gov-200 rounded-lg flex justify-between items-center text-[11px]">
              <span className="text-slate-600 font-medium">Statutory Entitlement Benchmark ($Area \times Rate \times Mult \times 2$):</span>
              <span className="font-mono font-bold text-gov-900">₹{statutoryCalculated.toLocaleString()}</span>
            </div>
          </div>

          {/* Row 4: Claimants Manager */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-gov-700" />
                Claimant / Landowner Co-sharers
              </h4>
              <button
                type="button"
                onClick={handleAddClaimant}
                className="text-gov-700 hover:text-gov-900 font-semibold flex items-center text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Claimant
              </button>
            </div>

            <div className="space-y-2">
              {claimants.map((c, index) => (
                <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Claimant Full Name"
                    value={c.name}
                    onChange={(e) => handleClaimantChange(index, 'name', e.target.value)}
                    className="flex-1 p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 font-medium"
                  />
                  <input
                    type="number"
                    step="1"
                    placeholder="Share %"
                    value={c.share_pct}
                    onChange={(e) => handleClaimantChange(index, 'share_pct', e.target.value)}
                    className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 font-mono font-bold"
                  />
                  <label className="flex items-center space-x-1 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={c.is_disputed}
                      onChange={(e) => handleClaimantChange(index, 'is_disputed', e.target.checked)}
                      className="rounded text-gov-600"
                    />
                    <span>Disputed?</span>
                  </label>
                  {claimants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveClaimant(index)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
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
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gov-950 font-extrabold rounded-lg shadow-md flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {submitting ? 'Registering & Evaluating Risk...' : 'Register Case & Run AI Scoring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
