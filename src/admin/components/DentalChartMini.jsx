import { useState, useCallback, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Odontogram } from 'react-odontogram';
import 'react-odontogram/dist/index.css';

// Tooth conditions with colors (shared with DentalChart)
const CONDITIONS = {
  healthy: { label: 'Healthy', color: '#22c55e', bgColor: '#dcfce7' },
  cavity: { label: 'Cavity', color: '#ef4444', bgColor: '#fee2e2' },
  filling: { label: 'Filling', color: '#3b82f6', bgColor: '#dbeafe' },
  crown: { label: 'Crown', color: '#f59e0b', bgColor: '#fef3c7' },
  bridge: { label: 'Bridge', color: '#8b5cf6', bgColor: '#ede9fe' },
  implant: { label: 'Implant', color: '#06b6d4', bgColor: '#cffafe' },
  missing: { label: 'Missing', color: '#6b7280', bgColor: '#f3f4f6' },
  rct: { label: 'Root Canal', color: '#ec4899', bgColor: '#fce7f3' },
  extraction_needed: { label: 'Extraction Needed', color: '#dc2626', bgColor: '#fecaca' },
  periodontal: { label: 'Periodontal', color: '#84cc16', bgColor: '#ecfccb' },
};

// Universal ↔ FDI tooth numbering mapping
const UNIVERSAL_TO_FDI = {
  1: '18', 2: '17', 3: '16', 4: '15', 5: '14', 6: '13', 7: '12', 8: '11',
  9: '21', 10: '22', 11: '23', 12: '24', 13: '25', 14: '26', 15: '27', 16: '28',
  17: '38', 18: '37', 19: '36', 20: '35', 21: '34', 22: '33', 23: '32', 24: '31',
  25: '41', 26: '42', 27: '43', 28: '44', 29: '45', 30: '46', 31: '47', 32: '48',
};

// Reverse mapping: FDI → Universal
const FDI_TO_UNIVERSAL = Object.fromEntries(
  Object.entries(UNIVERSAL_TO_FDI).map(([u, f]) => [f, parseInt(u)])
);

// Status colors for treatment plan items
const STATUS_COLORS = {
  completed: { fill: '#dcfce7', stroke: '#22c55e' },
  in_progress: { fill: '#dbeafe', stroke: '#3b82f6' },
  pending: { fill: '#f3f4f6', stroke: '#9ca3af' },
  cancelled: { fill: '#fef2f2', stroke: '#ef4444' },
};

/**
 * Generate dynamic CSS for tooth condition/status coloring on Odontogram SVG
 * @param {Object} teethData - Map of tooth number → tooth data (with condition)
 * @param {Object} highlightTeeth - Map of tooth number → { status, color } for status-based highlighting
 */
const generateMiniCSS = (teethData = {}, highlightTeeth = {}) => {
  const rules = [];
  const id = Math.random().toString(36).slice(2, 8);
  
  // Condition-based coloring from teethData
  Object.entries(teethData).forEach(([toothNum, toothData]) => {
    const fdi = UNIVERSAL_TO_FDI[toothNum];
    if (!fdi || !toothData?.condition || toothData.condition === 'healthy') return;
    const condInfo = CONDITIONS[toothData.condition];
    if (!condInfo) return;
    rules.push(
      `.dcm-${id} .Odontogram g.teeth-${fdi} path:first-of-type { fill: ${condInfo.bgColor}; stroke: ${condInfo.color}; stroke-width: 1.5; }`,
      `.dcm-${id} .Odontogram g.teeth-${fdi} path:nth-of-type(2) { fill: ${condInfo.color}; opacity: 0.3; }`
    );
    if (toothData.condition === 'missing') {
      rules.push(`.dcm-${id} .Odontogram g.teeth-${fdi} { opacity: 0.4; }`);
    }
  });

  // Status-based highlighting (for treatment plan items)
  Object.entries(highlightTeeth).forEach(([toothNum, info]) => {
    const fdi = UNIVERSAL_TO_FDI[toothNum];
    if (!fdi) return;
    const statusColor = STATUS_COLORS[info.status] || STATUS_COLORS.pending;
    rules.push(
      `.dcm-${id} .Odontogram g.teeth-${fdi} path:first-of-type { fill: ${statusColor.fill}; stroke: ${statusColor.stroke}; stroke-width: 2; }`,
      `.dcm-${id} .Odontogram g.teeth-${fdi} path:nth-of-type(2) { fill: ${statusColor.stroke}; opacity: 0.4; }`
    );
  });

  return { css: rules.join('\n'), className: `dcm-${id}` };
};

/**
 * DentalChartMini — Reusable mini dental chart component
 * 
 * Modes:
 * - Select mode: Click teeth to select/deselect. Fires onSelectTooth callback.
 * - Display mode: Read-only chart showing tooth conditions/statuses.
 * 
 * Props:
 * @param {Object} teethData - Map of tooth number → { condition, notes, case_label, notice }
 * @param {number[]} selectedTeeth - Array of currently selected Universal tooth numbers
 * @param {Function} onSelectTooth - (toothNumber: number) => void — called when tooth is clicked
 * @param {boolean} readOnly - If true, chart is non-interactive (display mode)
 * @param {Object} highlightTeeth - Map of tooth number → { status: 'completed'|'in_progress'|'pending' }
 * @param {string} showHalf - 'upper' | 'lower' | 'full' (default: 'full')
 * @param {string} label - Optional label shown above the chart
 * @param {boolean} compact - If true, uses smaller sizing
 */
const DentalChartMini = ({ 
  teethData = {}, 
  selectedTeeth = [], 
  onSelectTooth, 
  readOnly = false,
  highlightTeeth = {},
  showHalf = 'full',
  label,
  compact = false
}) => {
  const [chartKey, setChartKey] = useState(0);

  // Generate unique CSS for this instance
  const { css, className } = useMemo(
    () => generateMiniCSS(teethData, highlightTeeth),
    [teethData, highlightTeeth]
  );

  // Convert selected teeth to FDI format for defaultSelected
  const defaultSelected = useMemo(() => {
    return selectedTeeth
      .map(num => UNIVERSAL_TO_FDI[num])
      .filter(Boolean)
      .map(fdi => `teeth-${fdi}`);
  }, [selectedTeeth]);

  // Handle tooth selection
  const handleChange = useCallback((selected) => {
    if (readOnly || !onSelectTooth) return;
    
    if (selected.length === 0) {
      onSelectTooth(null);
    } else {
      const tooth = selected[selected.length - 1];
      const universalNum = parseInt(tooth.notations.universal);
      if (!isNaN(universalNum)) {
        onSelectTooth(universalNum);
      }
    }
    // Force re-render to update selection
    setChartKey(prev => prev + 1);
  }, [readOnly, onSelectTooth]);

  // Tooltip renderer
  const renderTooltip = useCallback((tooth) => {
    if (!tooth) return null;
    const universalNum = parseInt(tooth.notations.universal);
    const data = teethData[universalNum];
    const condition = data?.condition || 'healthy';
    const condInfo = CONDITIONS[condition] || CONDITIONS.healthy;
    const highlight = highlightTeeth[universalNum];

    return (
      <div className="p-2 min-w-[120px]">
        <p className="font-semibold text-xs text-gray-900">#{universalNum} — {tooth.type}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: condInfo.color }} />
          <span className="text-[10px]" style={{ color: condInfo.color }}>{condInfo.label}</span>
        </div>
        {highlight && (
          <p className="text-[10px] text-gray-600 mt-0.5 capitalize">Status: {highlight.status?.replace('_', ' ')}</p>
        )}
        {data?.notice && (
          <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" /> {data.notice}
          </p>
        )}
      </div>
    );
  }, [teethData, highlightTeeth]);

  return (
    <div className={`${className} ${compact ? 'max-w-md' : 'max-w-lg'} mx-auto`}>
      <style>{css}</style>
      
      {label && (
        <p className="text-xs font-medium text-gray-500 text-center mb-1">{label}</p>
      )}
      
      <Odontogram
        key={`${chartKey}-${defaultSelected.join(',')}`}
        notation="Universal"
        theme="light"
        colors={{}}
        onChange={readOnly ? undefined : handleChange}
        defaultSelected={defaultSelected}
        maxTeeth={8}
        showTooltip={true}
        showHalf={showHalf}
        tooltip={{
          placement: 'top',
          content: renderTooltip
        }}
      />

      {/* Mini legend for highlighted teeth */}
      {Object.keys(highlightTeeth).length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          {Object.entries(STATUS_COLORS).map(([status, colors]) => {
            const count = Object.values(highlightTeeth).filter(h => h.status === status).length;
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center gap-1">
                <div 
                  className="w-2.5 h-2.5 rounded-sm border" 
                  style={{ backgroundColor: colors.fill, borderColor: colors.stroke }}
                />
                <span className="text-[10px] text-gray-500 capitalize">{status.replace('_', ' ')} ({count})</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DentalChartMini;
export { CONDITIONS, UNIVERSAL_TO_FDI, FDI_TO_UNIVERSAL, STATUS_COLORS };
