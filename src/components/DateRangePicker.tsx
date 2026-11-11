/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, RotateCcw, ArrowRight } from 'lucide-react';
import { toSriLankaDate } from '../utils/sriLankaTime.ts';

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onChange: (fromDate: string, toDate: string) => void;
  onClear?: () => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  fromDate,
  toDate,
  onChange,
  onClear,
  className = '',
}) => {
  // Preset helper to calculate dates in YYYY-MM-DD
  const setPreset = (preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'ytd') => {
    const slNow = toSriLankaDate();
    const today = new Date(`${slNow.dateStr}T12:00:00Z`);

    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'last7':
        start.setDate(start.getDate() - 6);
        break;
      case 'last30':
        start.setDate(start.getDate() - 29);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'ytd':
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }

    onChange(formatYMD(start), formatYMD(end));
  };

  const handleFromChange = (newFrom: string) => {
    if (toDate && newFrom > toDate) {
      onChange(newFrom, newFrom);
    } else {
      onChange(newFrom, toDate);
    }
  };

  const handleToChange = (newTo: string) => {
    if (fromDate && newTo < fromDate) {
      onChange(newTo, newTo);
    } else {
      onChange(fromDate, newTo);
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        <span className="text-slate-500 mr-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-[#F36B16]" />
          <span>Quick:</span>
        </span>
        <button
          type="button"
          onClick={() => setPreset('today')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#F36B16] text-slate-700 transition-colors cursor-pointer"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setPreset('yesterday')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#F36B16] text-slate-700 transition-colors cursor-pointer"
        >
          Yesterday
        </button>
        <button
          type="button"
          onClick={() => setPreset('last7')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#F36B16] text-slate-700 transition-colors cursor-pointer"
        >
          Last 7 Days
        </button>
        <button
          type="button"
          onClick={() => setPreset('last30')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#F36B16] text-slate-700 transition-colors cursor-pointer"
        >
          Last 30 Days
        </button>
        <button
          type="button"
          onClick={() => setPreset('thisMonth')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#F36B16] text-slate-700 transition-colors cursor-pointer"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => setPreset('lastMonth')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#F36B16] text-slate-700 transition-colors cursor-pointer"
        >
          Last Month
        </button>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              if (onClear) onClear();
              else onChange('', '');
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset date filter"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Date Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">
            From Date (ආරම්භක දිනය):
          </label>
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#F36B16] focus:ring-2 focus:ring-[#F36B16]/20 focus:outline-hidden transition-all shadow-2xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">
            To Date (අවසාන දිනය):
          </label>
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleToChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#F36B16] focus:ring-2 focus:ring-[#F36B16]/20 focus:outline-hidden transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
