import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Printer,
  Send,
  FileText,
  User,
  Stethoscope,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  Share2,
  PenTool,
  MessageCircle,
  Receipt
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';
import DentalChartMini from '../../components/DentalChartMini';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const ITEM_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

const TreatmentPlanView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { tenantId } = useTenant();
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [linkedInvoice, setLinkedInvoice] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    loadPlan();
    loadLinkedInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadLinkedInvoice = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount')
        .eq('treatment_plan_id', id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (data) {
        setLinkedInvoice(data);
      }
    } catch {
      // No linked invoice - that's ok
    }
  };

  const generateInvoice = async () => {
    if (!plan || !plan.treatment_plan_items?.length) {
      setMessage({ type: 'error', text: 'No procedures to invoice' });
      return;
    }

    setGeneratingInvoice(true);
    try {
      // Generate invoice number
      const today = new Date();
      const invoiceNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          invoice_number: invoiceNumber,
          patient_id: plan.patient_id,
          treatment_plan_id: plan.id,
          issue_date: today.toISOString().split('T')[0],
          due_date: new Date(today.setDate(today.getDate() + 30)).toISOString().split('T')[0],
          status: 'draft',
          subtotal: plan.total_cost || 0,
          discount_percentage: plan.discount_type === 'percentage' ? plan.discount_value : 0,
          discount_amount: plan.discount_type === 'fixed' ? plan.discount_value : 0,
          tax_percentage: 0,
          total_amount: plan.final_cost || plan.total_cost || 0,
          amount_paid: 0,
          notes: `Invoice generated from Treatment Plan: ${plan.title}`,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from treatment plan items
      const invoiceItems = plan.treatment_plan_items.map(item => ({
        tenant_id: tenantId,
        invoice_id: invoice.id,
        service_id: item.service_id,
        description: item.procedure_name + (item.tooth_number ? ` (Tooth ${item.tooth_number})` : ''),
        quantity: 1,
        unit_price: item.cost || 0,
        discount: 0,
        total: item.cost || 0,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      setLinkedInvoice(invoice);
      setMessage({ type: 'success', text: 'Invoice generated successfully!' });
      
      // Navigate to the invoice
      setTimeout(() => {
        navigate(`/invoices/${invoice.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error generating invoice:', error);
      setMessage({ type: 'error', text: 'Failed to generate invoice' });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const loadPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email),
          doctors:doctor_id (id, name_en, name_ar, specialty_en),
          treatment_plan_items (
            *,
            services:service_id (name_en, name_ar),
            appointments:appointment_id (id, appointment_date, start_time, status)
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      
      // Sort items by sequence
      if (data.treatment_plan_items) {
        data.treatment_plan_items.sort((a, b) => a.sequence_order - b.sequence_order);
      }
      
      setPlan(data);
    } catch (error) {
      console.error('Error loading plan:', error);
      setMessage({ type: 'error', text: 'Failed to load treatment plan' });
    } finally {
      setLoading(false);
    }
  };

  const updatePlanStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setPlan(prev => ({ ...prev, status: newStatus }));
      setMessage({ type: 'success', text: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ type: 'error', text: 'Failed to update status' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateItemStatus = async (itemId, newStatus) => {
    try {
      const { error } = await supabase
        .from('treatment_plan_items')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', itemId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      // Refresh plan
      loadPlan();
    } catch (error) {
      console.error('Error updating item status:', error);
      setMessage({ type: 'error', text: 'Failed to update procedure status' });
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  // Use the formatCurrency from regional settings
  const fmtCurrency = (amount) => formatCurrency(amount, defaultCurrency?.code);

  const getProgress = () => {
    if (!plan?.treatment_plan_items?.length) return 0;
    const completed = plan.treatment_plan_items.filter(item => item.status === 'completed').length;
    return Math.round((completed / plan.treatment_plan_items.length) * 100);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Treatment Plan Not Found</h2>
        <p className="text-gray-500 mb-4">The requested treatment plan could not be found.</p>
        <Link to="/treatment-plans" className="text-primary-600 hover:text-primary-700">
          ← Back to Treatment Plans
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const progress = getProgress();

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.title}</h1>
            <p className="text-gray-500">Treatment Plan Details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => toast.info('Send to patient feature coming soon')}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          {linkedInvoice ? (
            <Link
              to={`/invoices/${linkedInvoice.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <Receipt className="w-4 h-4" />
              View Invoice
            </Link>
          ) : (
            <button
              onClick={generateInvoice}
              disabled={generatingInvoice || plan.status === 'cancelled'}
              className="inline-flex items-center gap-2 px-4 py-2 text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingInvoice ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              Generate Invoice
            </button>
          )}
          <Link
            to={`/treatment-plans/edit/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg print:hidden ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Treatment Plan</h1>
        <p className="text-gray-600">{plan.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {status.label}
                </span>
                
                {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                  <select
                    value={plan.status}
                    onChange={(e) => updatePlanStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 print:hidden"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-xl font-bold text-primary-600">{progress}%</p>
                </div>
                <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {plan.description && (
              <p className="mt-4 text-gray-600">{plan.description}</p>
            )}
          </div>

          {/* Dental Chart Visual */}
          {plan.patient_id && (() => {
            const highlightTeeth = {};
            plan.treatment_plan_items?.forEach(item => {
              if (item.tooth_number) {
                String(item.tooth_number).split(',').forEach(t => {
                  const num = parseInt(t.trim());
                  if (!isNaN(num)) highlightTeeth[num] = { status: item.status || 'pending' };
                });
              }
            });
            if (Object.keys(highlightTeeth).length === 0) return null;
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Dental Chart Overview</h2>
                <DentalChartMini
                  highlightTeeth={highlightTeeth}
                  readOnly
                  label="Teeth in this treatment plan"
                />
              </div>
            );
          })()}

          {/* Procedures */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Procedures</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase">Procedure</th>
                    <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase">Tooth</th>
                    <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase">Cost</th>
                    <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plan.treatment_plan_items?.map((item, index) => {
                    const itemStatus = ITEM_STATUS_CONFIG[item.status] || ITEM_STATUS_CONFIG.pending;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="py-3">
                          <p className="font-medium text-gray-900">{item.procedure_name}</p>
                          {item.surface && <p className="text-xs text-gray-500">Surface: {item.surface}</p>}
                          {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                        </td>
                        <td className="py-3 text-sm">{item.tooth_number || '-'}</td>
                        <td className="py-3 text-sm font-medium">{fmtCurrency(item.cost)}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${itemStatus.color}`}>
                            {itemStatus.label}
                          </span>
                        </td>
                        <td className="py-3 text-right print:hidden">
                          {item.status !== 'completed' && item.status !== 'cancelled' && (
                            <select
                              value={item.status}
                              onChange={(e) => updateItemStatus(item.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{getPatientName(plan.patients)}</p>
              </div>
              {plan.patients?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{plan.patients.phone}</p>
                </div>
              )}
              {plan.patients?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{plan.patients.email}</p>
                </div>
              )}
              <Link
                to={`/patients/${plan.patient_id}/view`}
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 print:hidden"
              >
                View Patient Profile →
              </Link>
            </div>
          </div>

          {/* Doctor Info */}
          {plan.doctors && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-gray-400" />
                Doctor
              </h3>
              <div className="space-y-2">
                <p className="font-medium">{plan.doctors.name_en || plan.doctors.name_ar}</p>
                {plan.doctors.specialty_en && (
                  <p className="text-sm text-gray-500">{plan.doctors.specialty_en}</p>
                )}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              Pricing
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{fmtCurrency(plan.total_cost)}</span>
              </div>
              {plan.discount_value > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({plan.discount_type === 'percentage' ? `${plan.discount_value}%` : 'Fixed'})</span>
                  <span>-{fmtCurrency(plan.total_cost - plan.final_cost)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{fmtCurrency(plan.final_cost)}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Dates
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">{new Date(plan.created_at).toLocaleDateString()}</p>
              </div>
              {plan.valid_until && (
                <div>
                  <p className="text-sm text-gray-500">Valid Until</p>
                  <p className="font-medium">{new Date(plan.valid_until).toLocaleDateString()}</p>
                </div>
              )}
              {plan.signed_at && (
                <div>
                  <p className="text-sm text-gray-500">Signed</p>
                  <p className="font-medium">{new Date(plan.signed_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Signature (if signed) */}
          {plan.patient_signature && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-gray-400" />
                Patient Signature
              </h3>
              <img 
                src={plan.patient_signature} 
                alt="Patient Signature" 
                className="max-w-full h-20 object-contain border border-gray-200 rounded"
              />
              <p className="text-xs text-gray-500 mt-2">
                Signed on {new Date(plan.signed_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Notes */}
          {plan.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{plan.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Generated on {new Date().toLocaleDateString()} | Dento Dental Clinic</p>
      </div>
    </div>
  );
};

export default TreatmentPlanView;
