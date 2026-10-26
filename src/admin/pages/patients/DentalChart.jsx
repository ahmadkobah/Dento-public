import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Info, Printer, Clock, AlertTriangle, Eye, X, ClipboardList, Stethoscope } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';
import { escapeHTML } from '../../../utils/sanitize';
import { Odontogram } from 'react-odontogram';
import 'react-odontogram/dist/index.css';
import { useToast } from '../../../hooks/useToast';

// Tooth conditions with colors
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

// Tooth surfaces
const SURFACES = ['occlusal', 'mesial', 'distal', 'buccal', 'lingual'];

// Adult teeth numbering (Universal Numbering System)
const ADULT_UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const ADULT_LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

// Child teeth numbering (Primary/Deciduous - letters A-T)
const CHILD_UPPER_TEETH = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const CHILD_LOWER_TEETH = ['T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K'];

// Adult tooth names
const ADULT_TOOTH_NAMES = {
  1: 'Upper Right 3rd Molar', 2: 'Upper Right 2nd Molar', 3: 'Upper Right 1st Molar',
  4: 'Upper Right 2nd Premolar', 5: 'Upper Right 1st Premolar', 6: 'Upper Right Canine',
  7: 'Upper Right Lateral Incisor', 8: 'Upper Right Central Incisor',
  9: 'Upper Left Central Incisor', 10: 'Upper Left Lateral Incisor', 11: 'Upper Left Canine',
  12: 'Upper Left 1st Premolar', 13: 'Upper Left 2nd Premolar', 14: 'Upper Left 1st Molar',
  15: 'Upper Left 2nd Molar', 16: 'Upper Left 3rd Molar',
  17: 'Lower Left 3rd Molar', 18: 'Lower Left 2nd Molar', 19: 'Lower Left 1st Molar',
  20: 'Lower Left 2nd Premolar', 21: 'Lower Left 1st Premolar', 22: 'Lower Left Canine',
  23: 'Lower Left Lateral Incisor', 24: 'Lower Left Central Incisor',
  25: 'Lower Right Central Incisor', 26: 'Lower Right Lateral Incisor', 27: 'Lower Right Canine',
  28: 'Lower Right 1st Premolar', 29: 'Lower Right 2nd Premolar', 30: 'Lower Right 1st Molar',
  31: 'Lower Right 2nd Molar', 32: 'Lower Right 3rd Molar',
};

// Child tooth names (Primary/Deciduous)
const CHILD_TOOTH_NAMES = {
  'A': 'Upper Right 2nd Molar', 'B': 'Upper Right 1st Molar', 'C': 'Upper Right Canine',
  'D': 'Upper Right Lateral Incisor', 'E': 'Upper Right Central Incisor',
  'F': 'Upper Left Central Incisor', 'G': 'Upper Left Lateral Incisor', 'H': 'Upper Left Canine',
  'I': 'Upper Left 1st Molar', 'J': 'Upper Left 2nd Molar',
  'K': 'Lower Left 2nd Molar', 'L': 'Lower Left 1st Molar', 'M': 'Lower Left Canine',
  'N': 'Lower Left Lateral Incisor', 'O': 'Lower Left Central Incisor',
  'P': 'Lower Right Central Incisor', 'Q': 'Lower Right Lateral Incisor', 'R': 'Lower Right Canine',
  'S': 'Lower Right 1st Molar', 'T': 'Lower Right 2nd Molar',
};

// Universal ↔ FDI (International) tooth numbering mapping
const UNIVERSAL_TO_FDI = {
  1: '18', 2: '17', 3: '16', 4: '15', 5: '14', 6: '13', 7: '12', 8: '11',
  9: '21', 10: '22', 11: '23', 12: '24', 13: '25', 14: '26', 15: '27', 16: '28',
  17: '38', 18: '37', 19: '36', 20: '35', 21: '34', 22: '33', 23: '32', 24: '31',
  25: '41', 26: '42', 27: '43', 28: '44', 29: '45', 30: '46', 31: '47', 32: '48',
};

const FDI_TO_UNIVERSAL = {};
Object.entries(UNIVERSAL_TO_FDI).forEach(([uni, fdi]) => {
  FDI_TO_UNIVERSAL[fdi] = parseInt(uni);
});

// Generate dynamic CSS for tooth condition coloring on the Odontogram SVG
const generateConditionCSS = (data) => {
  const rules = [];
  Object.entries(data).forEach(([toothNum, toothData]) => {
    const fdi = UNIVERSAL_TO_FDI[toothNum];
    if (!fdi) return;
    
    // Notice indicator — red dashed outline + pulsing glow on teeth with notices
    if (toothData?.notice) {
      rules.push(
        `.dental-chart-wrapper .Odontogram g.teeth-${fdi} path:first-of-type { filter: drop-shadow(0 0 3px #ef4444); }`,
        `.dental-chart-wrapper .Odontogram g.teeth-${fdi} { animation: notice-pulse 2s ease-in-out infinite; }`,
      );
    }
    
    if (!toothData?.condition || toothData.condition === 'healthy') return;
    const condInfo = CONDITIONS[toothData.condition];
    if (!condInfo) return;
    rules.push(
      `.dental-chart-wrapper .Odontogram g.teeth-${fdi} path:first-of-type { fill: ${condInfo.bgColor}; stroke: ${condInfo.color}; stroke-width: 1.5;${toothData?.notice ? ' filter: drop-shadow(0 0 3px #ef4444);' : ''} }`,
      `.dental-chart-wrapper .Odontogram g.teeth-${fdi} path:nth-of-type(2) { fill: ${condInfo.color}; opacity: 0.3; }`
    );
    if (toothData.condition === 'missing') {
      rules.push(`.dental-chart-wrapper .Odontogram g.teeth-${fdi} { opacity: 0.4; }`);
    }
  });
  // Notice pulse animation
  if (Object.values(data).some(d => d?.notice)) {
    rules.push(`@keyframes notice-pulse { 0%, 100% { filter: drop-shadow(0 0 2px rgba(239,68,68,0.4)); } 50% { filter: drop-shadow(0 0 6px rgba(239,68,68,0.8)); } }`);
  }
  return rules.join('\n');
};

// Child Tooth Component (react-odontogram only supports adult/permanent teeth)
const ChildTooth = ({ number, data, isSelected, onClick, isUpper }) => {
  const condition = data?.condition || 'healthy';
  const conditionInfo = CONDITIONS[condition] || CONDITIONS.healthy;
  
  const getShape = (num) => {
    if (['A', 'B', 'I', 'J', 'K', 'L', 'S', 'T'].includes(num)) return 'molar';
    if (['C', 'H', 'M', 'R'].includes(num)) return 'canine';
    return 'incisor';
  };

  const shape = getShape(number);
  const width = shape === 'molar' ? 'w-11' : shape === 'canine' ? 'w-9' : 'w-8';

  return (
    <button
      onClick={() => onClick(number)}
      className={`
        ${width} h-14 relative flex flex-col items-center justify-center gap-0.5
        rounded-lg border-2 transition-all cursor-pointer
        ${isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200 scale-105 z-10' 
          : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
        }
      `}
      style={{ 
        backgroundColor: conditionInfo.bgColor,
        borderColor: isSelected ? '#3b82f6' : conditionInfo.color 
      }}
      title={`${number} - ${CHILD_TOOTH_NAMES[number]}`}
    >
      <span className="font-bold text-gray-700 text-sm">{number}</span>
      <div 
        className={`
          ${shape === 'molar' ? 'w-7 h-5' : 'w-4 h-6'}
          ${isUpper ? 'rounded-b-full rounded-t-md' : 'rounded-t-full rounded-b-md'}
          border-2
        `}
        style={{ 
          backgroundColor: condition === 'missing' ? '#e5e7eb' : 'white',
          borderColor: conditionInfo.color,
          opacity: condition === 'missing' ? 0.5 : 1
        }}
      />
      {condition !== 'healthy' && (
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: conditionInfo.color }}
        />
      )}
      {data?.notice && (
        <div className="absolute -top-1 -left-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        </div>
      )}
    </button>
  );
};

const DentalChart = () => {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const tenantId = useSelectedTenantId();
  const toast = useToast();
  
  const [patient, setPatient] = useState(null);
  const [teethData, setTeethData] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [chartType, setChartType] = useState('adult');
  
  // Chart history
  const [chartHistory, setChartHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(null); // snapshot being viewed
  const [viewingCurrentState, setViewingCurrentState] = useState(false); // toggle to show saved DB state
  
  // Session-local teeth data: only teeth modified in THIS session show on chart
  const [sessionTeethData, setSessionTeethData] = useState({});
  
  // Key to force Odontogram remount (e.g. after saving to clear selection)
  const [chartKey, setChartKey] = useState(0);
  
  // Tooth condition form (with case_label and notice fields)
  const [toothForm, setToothForm] = useState({
    condition: 'healthy',
    surface: '',
    notes: '',
    case_label: '',
    notice: ''
  });

  const _printRef = useRef(null);

  // Data to display: empty by default, session-modified teeth, or a snapshot
  const displayData = useMemo(() => {
    if (viewingHistory) return viewingHistory.chart_data || {};
    if (viewingCurrentState) return teethData;
    return sessionTeethData;
  }, [viewingHistory, viewingCurrentState, teethData, sessionTeethData]);

  // Generate condition CSS for the Odontogram
  const conditionCSS = useMemo(() => generateConditionCSS(displayData), [displayData]);

  // Get current teeth arrays based on chart type
  const currentUpperTeeth = chartType === 'adult' ? ADULT_UPPER_TEETH : CHILD_UPPER_TEETH;
  const currentLowerTeeth = chartType === 'adult' ? ADULT_LOWER_TEETH : CHILD_LOWER_TEETH;
  const currentToothNames = chartType === 'adult' ? ADULT_TOOTH_NAMES : CHILD_TOOTH_NAMES;
  const totalTeeth = chartType === 'adult' ? 32 : 20;

  // Handle Odontogram tooth selection (adult chart)
  const handleOdontogramChange = useCallback((selectedTeeth) => {
    if (viewingHistory || viewingCurrentState) return; // read-only when viewing history/current state
    if (selectedTeeth.length === 0) {
      setSelectedTooth(null);
    } else {
      const tooth = selectedTeeth[selectedTeeth.length - 1];
      const universalNum = parseInt(tooth.notations.universal);
      if (!isNaN(universalNum)) {
        setSelectedTooth(universalNum);
      }
    }
  }, [viewingHistory]);

  // Tooltip renderer for Odontogram
  const renderToothTooltip = useCallback((tooth) => {
    if (!tooth) return null;
    const universalNum = parseInt(tooth.notations.universal);
    const data = displayData[universalNum];
    const condition = data?.condition || 'healthy';
    const condInfo = CONDITIONS[condition] || CONDITIONS.healthy;
    return (
      <div className="p-2 min-w-[140px]">
        <p className="font-semibold text-sm text-gray-900">#{universalNum} — {tooth.type}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: condInfo.color }} />
          <span className="text-xs" style={{ color: condInfo.color }}>{condInfo.label}</span>
        </div>
        {data?.case_label && (
          <p className="text-xs text-gray-600 mt-1">Case: {data.case_label}</p>
        )}
        {data?.notice && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {data.notice}
          </p>
        )}
        {data?.notes && (
          <p className="text-xs text-gray-500 mt-1 italic">{data.notes}</p>
        )}
      </div>
    );
  }, [displayData]);

  // Fetch patient and dental chart data
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name, first_name, last_name, patient_code')
        .eq('id', patientId)
        .eq('tenant_id', tenantId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: chartData, error: chartError } = await supabase
        .from('dental_charts')
        .select('*')
        .eq('patient_id', patientId)
        .eq('tenant_id', tenantId);

      if (chartError) throw chartError;

      const teethMap = {};
      chartData?.forEach(tooth => {
        teethMap[tooth.tooth_number] = tooth;
      });
      setTeethData(teethMap);

      const { data: historyData } = await supabase
        .from('dental_chart_history')
        .select('id, recorded_at, notes, source, case_summary, treatment_plan_id')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(20);
      
      setChartHistory(historyData || []);
    } catch (err) {
      console.error('Error fetching dental chart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // View a historical chart snapshot (read-only)
  const viewHistorySnapshot = async (historyId) => {
    try {
      const { data, error } = await supabase
        .from('dental_chart_history')
        .select('*')
        .eq('id', historyId)
        .single();

      if (data && !error) {
        setViewingHistory(data);
        setSelectedTooth(null);
        setChartKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error loading history snapshot:', err);
    }
  };

  // Return to current chart from history view
  const backToCurrentChart = () => {
    setViewingHistory(null);
    setViewingCurrentState(false);
    setSelectedTooth(null);
    setChartKey(prev => prev + 1);
  };

  // Save current chart as history snapshot
  const saveChartSnapshot = async () => {
    try {
      const { error } = await supabase
        .from('dental_chart_history')
        .insert({
          patient_id: patientId,
          chart_data: teethData,
          notes: `Snapshot — ${new Date().toLocaleDateString()}`,
          source: 'manual'
        });

      if (error) throw error;
      fetchData();
      toast.success('Chart snapshot saved successfully!');
    } catch (err) {
      console.error('Error saving snapshot:', err);
      toast.error('Failed to save snapshot');
    }
  };

  // Sync form when selected tooth changes — load from DB data so user sees existing conditions
  useEffect(() => {
    const data = teethData[selectedTooth];
    if (selectedTooth && data) {
      setToothForm({
        condition: data.condition || 'healthy',
        surface: data.surface || '',
        notes: data.notes || '',
        case_label: data.case_label || '',
        notice: data.notice || ''
      });
    } else {
      setToothForm({
        condition: 'healthy',
        surface: '',
        notes: '',
        case_label: '',
        notice: ''
      });
    }
  }, [selectedTooth, teethData]);

  // Handle tooth click (child chart)
  const handleToothClick = (toothNumber) => {
    if (viewingHistory || viewingCurrentState) return;
    setSelectedTooth(toothNumber === selectedTooth ? null : toothNumber);
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setToothForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Apply condition to selected tooth and clear form after save
  const applyToothCondition = async () => {
    if (!selectedTooth || viewingHistory) return;

    setIsSaving(true);
    try {
      const existingRecord = teethData[selectedTooth];
      
      const payload = {
        patient_id: patientId,
        tooth_number: selectedTooth,
        condition: toothForm.condition,
        surface: toothForm.surface || null,
        notes: toothForm.notes || null,
        case_label: toothForm.case_label || null,
        notice: toothForm.notice || null,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };

      if (existingRecord) {
        const { error } = await supabase
          .from('dental_charts')
          .update(payload)
          .eq('id', existingRecord.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dental_charts')
          .insert([payload]);
        if (error) throw error;
      }

      // Update local state (both DB cache and session display)
      setTeethData(prev => ({
        ...prev,
        [selectedTooth]: { ...prev[selectedTooth], ...payload }
      }));
      setSessionTeethData(prev => ({
        ...prev,
        [selectedTooth]: { ...prev[selectedTooth], ...payload }
      }));
      
      // Clear form and selection after successful save
      setSelectedTooth(null);
      setToothForm({ condition: 'healthy', surface: '', notes: '', case_label: '', notice: '' });
      setHasChanges(false);
      setChartKey(prev => prev + 1); // Reset Odontogram selection
    } catch (err) {
      console.error('Error saving tooth data:', err);
      toast.error('Failed to save tooth data');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset all changes
  const resetChart = () => {
    fetchData();
    setSelectedTooth(null);
    setViewingHistory(null);
    setViewingCurrentState(false);
    setSessionTeethData({});
    setHasChanges(false);
    setChartKey(prev => prev + 1);
  };

  // Print dental chart
  const handlePrint = () => {
    const patientName = escapeHTML(patient?.name || `${patient?.first_name} ${patient?.last_name}`);
    const printData = displayData;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dental Chart - ${patientName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { font-size: 14px; color: #666; }
            .chart-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .chart-info div { font-size: 12px; }
            .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
            .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; }
            .legend-color { width: 12px; height: 12px; border-radius: 2px; border: 1px solid #999; }
            .arch { margin-bottom: 30px; }
            .arch-label { text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 14px; }
            .teeth-row { display: flex; justify-content: center; gap: 3px; }
            .tooth { width: 35px; height: 50px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; }
            .tooth-number { font-weight: bold; }
            .tooth-condition { font-size: 8px; margin-top: 2px; }
            .summary { margin-top: 20px; }
            .summary h3 { font-size: 14px; margin-bottom: 10px; }
            .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
            .summary-item { text-align: center; padding: 10px; border: 1px solid #ddd; }
            .summary-item .count { font-size: 18px; font-weight: bold; }
            .summary-item .label { font-size: 10px; color: #666; }
            .notes { margin-top: 20px; }
            .notes h3 { font-size: 14px; margin-bottom: 10px; }
            .notes-list { font-size: 11px; }
            .notes-item { padding: 5px 0; border-bottom: 1px dashed #ddd; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dental Chart${viewingHistory ? ' (Historical Snapshot)' : ''}</h1>
            <p>${patientName} ${patient?.patient_code ? '• ' + patient.patient_code : ''}</p>
            <p style="margin-top: 5px;">Date: ${viewingHistory ? new Date(viewingHistory.recorded_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="chart-info">
            <div><strong>Chart Type:</strong> ${chartType === 'adult' ? 'Adult (32 teeth)' : 'Child/Primary (20 teeth)'}</div>
          </div>

          <div class="legend">
            ${Object.entries(CONDITIONS).map(([, val]) => `
              <div class="legend-item">
                <div class="legend-color" style="background-color: ${val.bgColor}; border-color: ${val.color}"></div>
                <span>${val.label}</span>
              </div>
            `).join('')}
          </div>

          <div class="arch">
            <div class="arch-label">UPPER ARCH (Maxilla)</div>
            <div class="teeth-row">
              ${currentUpperTeeth.map(tooth => {
                const data = printData[tooth];
                const condition = data?.condition || 'healthy';
                const condInfo = CONDITIONS[condition];
                return `
                  <div class="tooth" style="background-color: ${condInfo.bgColor}; border-color: ${condInfo.color}">
                    <div class="tooth-number">${tooth}</div>
                    <div class="tooth-condition">${condInfo.label}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="arch">
            <div class="teeth-row">
              ${currentLowerTeeth.map(tooth => {
                const data = printData[tooth];
                const condition = data?.condition || 'healthy';
                const condInfo = CONDITIONS[condition];
                return `
                  <div class="tooth" style="background-color: ${condInfo.bgColor}; border-color: ${condInfo.color}">
                    <div class="tooth-number">${tooth}</div>
                    <div class="tooth-condition">${condInfo.label}</div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="arch-label" style="margin-top: 10px;">LOWER ARCH (Mandible)</div>
          </div>

          <div class="summary">
            <h3>Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="count" style="color: #22c55e">${stats.healthy}</div>
                <div class="label">Healthy</div>
              </div>
              <div class="summary-item">
                <div class="count" style="color: #ef4444">${(stats.cavity || 0) + (stats.extraction_needed || 0)}</div>
                <div class="label">Need Treatment</div>
              </div>
              <div class="summary-item">
                <div class="count" style="color: #3b82f6">${(stats.filling || 0) + (stats.crown || 0) + (stats.rct || 0)}</div>
                <div class="label">Restored</div>
              </div>
              <div class="summary-item">
                <div class="count" style="color: #06b6d4">${(stats.implant || 0) + (stats.bridge || 0)}</div>
                <div class="label">Prosthetics</div>
              </div>
              <div class="summary-item">
                <div class="count" style="color: #6b7280">${stats.missing || 0}</div>
                <div class="label">Missing</div>
              </div>
            </div>
          </div>

          <div class="notes">
            <h3>Teeth with Notes</h3>
            <div class="notes-list">
              ${Object.entries(printData)
                .filter(([, data]) => data?.notes)
                .map(([tooth, data]) => `
                  <div class="notes-item">
                    <strong>Tooth ${tooth}:</strong> ${data.notes}
                    ${data.case_label ? '<br/><em>Case: ' + data.case_label + '</em>' : ''}
                    ${data.notice ? '<br/><span style="color:#d97706">⚠ ' + data.notice + '</span>' : ''}
                  </div>
                `).join('') || '<p style="color: #999; font-style: italic;">No notes recorded</p>'}
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Get statistics
  const getStats = () => {
    const stats = { total: totalTeeth, healthy: 0 };
    Object.keys(CONDITIONS).forEach(c => { stats[c] = 0; });
    
    const teethToCount = chartType === 'adult' 
      ? [...ADULT_UPPER_TEETH, ...ADULT_LOWER_TEETH]
      : [...CHILD_UPPER_TEETH, ...CHILD_LOWER_TEETH];
    
    teethToCount.forEach(tooth => {
      const condition = displayData[tooth]?.condition || 'healthy';
      stats[condition] = (stats[condition] || 0) + 1;
    });
    return stats;
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dental Chart</h1>
            <p className="text-gray-500">
              {patient?.name || `${patient?.first_name} ${patient?.last_name}`} 
              {patient?.patient_code && ` • ${patient.patient_code}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showHistory 
                ? 'border-primary-500 bg-primary-50 text-primary-600' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            History
          </button>
          {/* Chart Type Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => { setChartType('adult'); setSelectedTooth(null); setChartKey(k => k + 1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                chartType === 'adult' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Adult (32)
            </button>
            <button
              onClick={() => { setChartType('child'); setSelectedTooth(null); setChartKey(k => k + 1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                chartType === 'child' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Child (20)
            </button>
          </div>
          <button
            onClick={resetChart}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* History Snapshot Banner */}
      {viewingHistory && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Viewing Historical Snapshot</p>
              <p className="text-sm text-amber-600">
                {new Date(viewingHistory.recorded_at).toLocaleDateString()} — {viewingHistory.notes || 'No description'}
                {viewingHistory.source && viewingHistory.source !== 'manual' && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-200 rounded text-xs">{viewingHistory.source}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={backToCurrentChart}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Back to New Chart
          </button>
        </div>
      )}

      {/* Current State Banner */}
      {viewingCurrentState && !viewingHistory && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Viewing Current Saved State</p>
              <p className="text-sm text-blue-600">
                Showing {Object.keys(teethData).length} teeth with recorded conditions
              </p>
            </div>
          </div>
          <button
            onClick={backToCurrentChart}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Back to New Chart
          </button>
        </div>
      )}

      {/* Chart History Panel */}
      {showHistory && !viewingHistory && !viewingCurrentState && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Chart History</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setViewingHistory(null);
                  setViewingCurrentState(true);
                  setSelectedTooth(null);
                  setChartKey(prev => prev + 1);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                  viewingCurrentState
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                Current State
              </button>
              <button
                onClick={saveChartSnapshot}
                className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                Save Snapshot
              </button>
            </div>
          </div>
          
          {chartHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No history snapshots saved yet. Click &quot;Save Snapshot&quot; to create one.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">Click &quot;View&quot; to see a snapshot of the chart from that date:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {chartHistory.map(h => {
                  const sourceConfig = {
                    treatment_plan: { icon: ClipboardList, label: 'Treatment Plan', color: 'bg-green-100 text-green-700' },
                    treatment: { icon: Stethoscope, label: 'Treatment', color: 'bg-purple-100 text-purple-700' },
                    manual: { icon: Clock, label: 'Manual', color: 'bg-gray-100 text-gray-600' },
                  };
                  const src = sourceConfig[h.source] || sourceConfig.manual;
                  const SrcIcon = src.icon;
                  return (
                  <div 
                    key={h.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SrcIcon className="w-4 h-4 shrink-0" style={{ color: h.source === 'treatment_plan' ? '#16a34a' : h.source === 'treatment' ? '#9333ea' : '#6b7280' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(h.recorded_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{h.case_summary || h.notes || 'Snapshot'}</p>
                        {h.source && h.source !== 'manual' && (
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${src.color}`}>{src.label}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => viewHistorySnapshot(h.id)}
                      className="ml-3 px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-100 flex items-center gap-1 shrink-0"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Condition Legend</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CONDITIONS).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: value.bgColor, borderColor: value.color }}
              />
              <span className="text-sm text-gray-600">{value.label}</span>
              <span className="text-xs text-gray-400">({stats[key] || 0})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dental Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {chartType === 'adult' ? 'Adult Dentition (32 Teeth)' : 'Primary/Child Dentition (20 Teeth)'}
          </h2>
          
          {chartType === 'adult' ? (
            /* Adult Chart — Professional SVG via react-odontogram */
            <div className="dental-chart-wrapper relative">
              <style>{conditionCSS}</style>
              <Odontogram
                key={chartKey}
                notation="Universal"
                theme="light"
                colors={{}}
                defaultSelected={[]}
                onChange={handleOdontogramChange}
                maxTeeth={8}
                showTooltip={true}
                tooltip={{
                  placement: 'top',
                  content: renderToothTooltip
                }}
              />
            </div>
          ) : (
            /* Child Chart — Custom rendering for primary teeth */
            <>
              {/* Child Upper Arch */}
              <div className="mb-8">
                <div className="text-center mb-2">
                  <span className="text-sm font-medium text-gray-500">UPPER ARCH (Maxilla) — Primary Teeth</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className="flex gap-1 border-r-2 border-gray-300 pr-3 mr-3">
                    {CHILD_UPPER_TEETH.slice(0, 5).map(letter => (
                      <ChildTooth
                        key={letter}
                        number={letter}
                        data={displayData[letter]}
                        isSelected={selectedTooth === letter}
                        onClick={handleToothClick}
                        isUpper={true}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {CHILD_UPPER_TEETH.slice(5, 10).map(letter => (
                      <ChildTooth
                        key={letter}
                        number={letter}
                        data={displayData[letter]}
                        isSelected={selectedTooth === letter}
                        onClick={handleToothClick}
                        isUpper={true}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-1 mt-1 text-xs text-gray-400">
                  <span className="w-[240px] text-right pr-3">Right</span>
                  <span className="w-[240px] text-left">Left</span>
                </div>
              </div>

              {/* Child Lower Arch */}
              <div>
                <div className="flex items-center justify-center gap-1">
                  <div className="flex gap-1 border-r-2 border-gray-300 pr-3 mr-3">
                    {CHILD_LOWER_TEETH.slice(0, 5).map(letter => (
                      <ChildTooth
                        key={letter}
                        number={letter}
                        data={displayData[letter]}
                        isSelected={selectedTooth === letter}
                        onClick={handleToothClick}
                        isUpper={false}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {CHILD_LOWER_TEETH.slice(5, 10).map(letter => (
                      <ChildTooth
                        key={letter}
                        number={letter}
                        data={displayData[letter]}
                        isSelected={selectedTooth === letter}
                        onClick={handleToothClick}
                        isUpper={false}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm font-medium text-gray-500">LOWER ARCH (Mandible) — Primary Teeth</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tooth Details Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedTooth ? `Tooth ${chartType === 'child' ? '' : '#'}${selectedTooth}` : 'Select a Tooth'}
          </h2>

          {selectedTooth ? (
            <div className="space-y-4">
              {/* Tooth Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{currentToothNames[selectedTooth]}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {chartType === 'adult' ? (
                    <>
                      {selectedTooth <= 16 ? 'Upper' : 'Lower'} • 
                      {[1,2,3,14,15,16,17,18,19,30,31,32].includes(selectedTooth) ? ' Molar' :
                       [4,5,12,13,20,21,28,29].includes(selectedTooth) ? ' Premolar' :
                       [6,11,22,27].includes(selectedTooth) ? ' Canine' : ' Incisor'}
                    </>
                  ) : (
                    <>
                      {['A','B','C','D','E','F','G','H','I','J'].includes(selectedTooth) ? 'Upper' : 'Lower'} • 
                      {['A','B','I','J','K','L','S','T'].includes(selectedTooth) ? ' Primary Molar' :
                       ['C','H','M','R'].includes(selectedTooth) ? ' Primary Canine' : ' Primary Incisor'}
                    </>
                  )}
                </p>
              </div>

              {(viewingHistory || viewingCurrentState) ? (
                /* Read-only view when viewing history or current state */
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg border ${viewingHistory ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <p className={`text-xs font-medium mb-1 ${viewingHistory ? 'text-amber-700' : 'text-blue-700'}`}>
                      Read-Only ({viewingHistory ? 'Historical Snapshot' : 'Current Saved State'})
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CONDITIONS[toothForm.condition]?.color || '#22c55e' }} />
                      <span className="text-sm font-medium">{CONDITIONS[toothForm.condition]?.label || 'Healthy'}</span>
                    </div>
                    {toothForm.surface && <p className="text-xs text-gray-600 mt-1">Surface: {toothForm.surface}</p>}
                    {toothForm.case_label && <p className="text-xs text-gray-600 mt-1">Case: {toothForm.case_label}</p>}
                    {toothForm.notice && <p className="text-xs text-amber-600 mt-1">⚠ {toothForm.notice}</p>}
                    {toothForm.notes && <p className="text-xs text-gray-500 mt-1 italic">{toothForm.notes}</p>}
                  </div>
                </div>
              ) : (
                /* Editable form */
                <>
                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(CONDITIONS).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => handleFormChange('condition', key)}
                          className={`
                            px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all
                            ${toothForm.condition === key 
                              ? 'ring-2 ring-offset-1' 
                              : 'opacity-70 hover:opacity-100'
                            }
                          `}
                          style={{ 
                            backgroundColor: value.bgColor, 
                            borderColor: value.color,
                            color: value.color
                          }}
                        >
                          {value.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Surface */}
                  {['cavity', 'filling', 'rct'].includes(toothForm.condition) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Affected Surface</label>
                      {/* 5-Surface Interactive Tooth Diagram */}
                      <div className="flex flex-col items-center gap-2">
                        <svg viewBox="0 0 120 120" width="120" height="120" className="cursor-pointer">
                          {/* Buccal - top */}
                          <path
                            d="M60 5 L95 25 L95 45 L60 35 L25 45 L25 25 Z"
                            fill={toothForm.surface === 'buccal' ? '#3b82f6' : '#f3f4f6'}
                            stroke="#d1d5db" strokeWidth="1.5"
                            onClick={() => handleFormChange('surface', toothForm.surface === 'buccal' ? '' : 'buccal')}
                            className="hover:opacity-80 transition-opacity"
                          />
                          <text x="60" y="27" textAnchor="middle" fontSize="9" fill={toothForm.surface === 'buccal' ? '#fff' : '#6b7280'} className="pointer-events-none">B</text>
                          
                          {/* Lingual - bottom */}
                          <path
                            d="M60 115 L95 95 L95 75 L60 85 L25 75 L25 95 Z"
                            fill={toothForm.surface === 'lingual' ? '#3b82f6' : '#f3f4f6'}
                            stroke="#d1d5db" strokeWidth="1.5"
                            onClick={() => handleFormChange('surface', toothForm.surface === 'lingual' ? '' : 'lingual')}
                            className="hover:opacity-80 transition-opacity"
                          />
                          <text x="60" y="99" textAnchor="middle" fontSize="9" fill={toothForm.surface === 'lingual' ? '#fff' : '#6b7280'} className="pointer-events-none">L</text>

                          {/* Mesial - left */}
                          <path
                            d="M5 60 L25 25 L25 45 L35 60 L25 75 L25 95 Z"
                            fill={toothForm.surface === 'mesial' ? '#3b82f6' : '#f3f4f6'}
                            stroke="#d1d5db" strokeWidth="1.5"
                            onClick={() => handleFormChange('surface', toothForm.surface === 'mesial' ? '' : 'mesial')}
                            className="hover:opacity-80 transition-opacity"
                          />
                          <text x="18" y="63" textAnchor="middle" fontSize="9" fill={toothForm.surface === 'mesial' ? '#fff' : '#6b7280'} className="pointer-events-none">M</text>

                          {/* Distal - right */}
                          <path
                            d="M115 60 L95 25 L95 45 L85 60 L95 75 L95 95 Z"
                            fill={toothForm.surface === 'distal' ? '#3b82f6' : '#f3f4f6'}
                            stroke="#d1d5db" strokeWidth="1.5"
                            onClick={() => handleFormChange('surface', toothForm.surface === 'distal' ? '' : 'distal')}
                            className="hover:opacity-80 transition-opacity"
                          />
                          <text x="102" y="63" textAnchor="middle" fontSize="9" fill={toothForm.surface === 'distal' ? '#fff' : '#6b7280'} className="pointer-events-none">D</text>

                          {/* Occlusal - center */}
                          <path
                            d="M35 60 L60 35 L85 60 L60 85 Z"
                            fill={toothForm.surface === 'occlusal' ? '#3b82f6' : '#e5e7eb'}
                            stroke="#d1d5db" strokeWidth="1.5"
                            onClick={() => handleFormChange('surface', toothForm.surface === 'occlusal' ? '' : 'occlusal')}
                            className="hover:opacity-80 transition-opacity"
                          />
                          <text x="60" y="63" textAnchor="middle" fontSize="9" fill={toothForm.surface === 'occlusal' ? '#fff' : '#6b7280'} className="pointer-events-none">O</text>
                        </svg>
                        <p className="text-xs text-gray-500">
                          {toothForm.surface 
                            ? <span>Selected: <span className="font-medium text-primary-600 capitalize">{toothForm.surface}</span></span>
                            : 'Click a surface to select'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Case Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Case / Diagnosis</label>
                    <input
                      type="text"
                      value={toothForm.case_label}
                      onChange={(e) => handleFormChange('case_label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g. Class II Cavity, Periapical Abscess..."
                    />
                  </div>

                  {/* Notice / Warning */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Notice / Warning
                    </label>
                    <textarea
                      value={toothForm.notice}
                      onChange={(e) => handleFormChange('notice', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 bg-amber-50/50"
                      placeholder="e.g. Patient allergic to amalgam, sensitive to cold..."
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={toothForm.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      placeholder="Add notes about this tooth..."
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={applyToothCondition}
                    disabled={isSaving}
                    className={`
                      w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors
                      ${hasChanges 
                        ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Tooth
                      </>
                    )}
                  </button>

                  {/* Last updated info */}
                  {teethData[selectedTooth]?.updated_at && (
                    <p className="text-xs text-gray-400 text-center">
                      Last updated: {new Date(teethData[selectedTooth].updated_at).toLocaleDateString()}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🦷</span>
              </div>
              <p className="text-sm">Click on a tooth to view and edit its condition</p>
              {viewingHistory && (
                <p className="text-xs text-amber-600 mt-2">Currently viewing a historical snapshot (read-only)</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chart Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
            <p className="text-xs text-gray-500">Healthy</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{stats.cavity + stats.extraction_needed}</p>
            <p className="text-xs text-gray-500">Need Treatment</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.filling + stats.crown + stats.rct}</p>
            <p className="text-xs text-gray-500">Restored</p>
          </div>
          <div className="text-center p-3 bg-cyan-50 rounded-lg">
            <p className="text-2xl font-bold text-cyan-600">{stats.implant + stats.bridge}</p>
            <p className="text-xs text-gray-500">Prosthetics</p>
          </div>
          <div className="text-center p-3 bg-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-600">{stats.missing}</p>
            <p className="text-xs text-gray-500">Missing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalChart;
