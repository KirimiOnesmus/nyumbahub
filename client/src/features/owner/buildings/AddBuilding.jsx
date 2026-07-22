import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { toast } from 'react-toastify';
import { UNIT_TYPES } from '../../../components/constast/Constasts.js';
import { createBuilding } from '../../../services/building.service.js';

const initialForm = { name: '', address: '' };

const buildInitialUnitTypesForm = () =>
  UNIT_TYPES.reduce((acc, t) => {
    acc[t.key] = { enabled: false, quantity: '', rent: '' };
    return acc;
  }, {});

const AddBuilding = ({ onClose, onCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [unitTypesForm, setUnitTypesForm] = useState(buildInitialUnitTypesForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleToggleUnitType = (key) => () => {
    setUnitTypesForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
    setErrors((prev) => {
      if (!prev.unitTypesGeneral && !prev.unitTypes?.[key]) return prev;
      const nextUnitTypes = { ...prev.unitTypes };
      delete nextUnitTypes[key];
      return { ...prev, unitTypesGeneral: undefined, unitTypes: nextUnitTypes };
    });
  };

  const handleUnitTypeFieldChange = (key, field) => (e) => {
    const { value } = e.target;
    setUnitTypesForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setErrors((prev) => {
      if (!prev.unitTypes?.[key]?.[field]) return prev;
      return {
        ...prev,
        unitTypes: {
          ...prev.unitTypes,
          [key]: { ...prev.unitTypes[key], [field]: undefined },
        },
      };
    });
  };

  const getEnabledTypes = () => UNIT_TYPES.filter((t) => unitTypesForm[t.key].enabled);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Building name is required.';
    if (!form.address.trim()) next.address = 'Address is required.';

    const enabledTypes = getEnabledTypes();

    if (enabledTypes.length === 0) {
      next.unitTypesGeneral = 'Select at least one unit type.';
    } else {
      const unitTypeErrors = {};
      enabledTypes.forEach((t) => {
        const { quantity, rent } = unitTypesForm[t.key];
        const quantityNum = Number(quantity);
        const rentNum = Number(rent);
        const fieldErrors = {};

        if (quantity === '' || !Number.isInteger(quantityNum) || quantityNum <= 0) {
          fieldErrors.quantity = 'Enter a whole number greater than 0.';
        }
        if (rent === '' || Number.isNaN(rentNum) || rentNum <= 0) {
          fieldErrors.rent = 'Enter a rent amount greater than 0.';
        }
        if (Object.keys(fieldErrors).length > 0) {
          unitTypeErrors[t.key] = fieldErrors;
        }
      });
      if (Object.keys(unitTypeErrors).length > 0) {
        next.unitTypes = unitTypeErrors;
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const enabledTypes = getEnabledTypes();
    const unitTypeBreakdown = enabledTypes.map((t) => ({
      type: t.key,
      label: t.label,
      quantity: Number(unitTypesForm[t.key].quantity),
      rentAmount: Number(unitTypesForm[t.key].rent),
    }));

    setSubmitting(true);
    try {
  
      const { building } = await createBuilding({
        name: form.name.trim(),
        address: form.address.trim(),
        unitTypes: unitTypeBreakdown,
      });
      toast.success(`"${building.name}" was added successfully.`);
      onCreated(building);
    } catch (err) {
      toast.error(err.message || 'We couldn\u2019t create this building. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
          <h2 className="font-bold text-slate-900">Add Building</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400  p-1 rounded-lg hover:bg-canvas transition-colors cursor-pointer hover:text-red-500"
          >
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="building-name" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Building Name <span className="text-red-400">*</span>
              </label>
              <input
                id="building-name"
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="e.g. Sunrise Apartments"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
              />
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="building-address" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Address <span className="text-red-400">*</span>
              </label>
              <input
                id="building-address"
                type="text"
                value={form.address}
                onChange={handleChange('address')}
                placeholder="e.g. Kilimani, Nairobi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
              />
              {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Unit Types <span className="text-red-400">*</span>
                </span>
              </div>
              {errors.unitTypesGeneral && (
                <p className="text-red-500 text-xs">{errors.unitTypesGeneral}</p>
              )}

              <div className="flex flex-col gap-2">
                {UNIT_TYPES.map((t) => {
                  const typeState = unitTypesForm[t.key];
                  const typeErrors = errors.unitTypes?.[t.key];
                  return (
                    <div
                      key={t.key}
                      className={`rounded-xl border transition-colors ${
                        typeState.enabled ? 'border-brand-700 bg-brand-50/40' : 'border-slate-200'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typeState.enabled}
                          onChange={handleToggleUnitType(t.key)}
                          className="w-4 h-4 rounded accent-brand-700 shrink-0"
                        />
                        <span className="text-sm font-semibold text-slate-700">{t.label}</span>
                      </label>

                      {typeState.enabled && (
                        <div className="grid grid-cols-2 gap-3 px-3.5 pb-3.5">
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`${t.key}-quantity`}
                              className="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                            >
                              Quantity
                            </label>
                            <input
                              id={`${t.key}-quantity`}
                              type="number"
                              min="1"
                              step="1"
                              value={typeState.quantity}
                              onChange={handleUnitTypeFieldChange(t.key, 'quantity')}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="e.g. 4"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
                            />
                            {typeErrors?.quantity && (
                              <p className="text-red-500 text-xs">{typeErrors.quantity}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`${t.key}-rent`}
                              className="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                            >
                              Rent (KES)
                            </label>
                            <input
                              id={`${t.key}-rent`}
                              type="number"
                              min="1"
                              step="1"
                              value={typeState.rent}
                              onChange={handleUnitTypeFieldChange(t.key, 'rent')}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="e.g. 15000"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
                            />
                            {typeErrors?.rent && (
                              <p className="text-red-500 text-xs">{typeErrors.rent}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-5 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700  cursor-pointer hover:bg-canvas text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 cursor-pointer hover:bg-brand-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
              {submitting ? 'Saving…' : 'Save Building'}
            </button>
          </div>
        </form>
      </div> 
    </div>
  );
};

export default AddBuilding;