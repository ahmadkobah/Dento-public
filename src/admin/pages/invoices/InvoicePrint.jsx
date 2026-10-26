import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  partial: { label: 'Partial', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
};

const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to format with invoice currency
  const fmtCurrency = (amount) => formatCurrency(amount, invoice?.currency || defaultCurrency?.code);

  useEffect(() => {
    loadData();
  }, [id, tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Load invoice
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single();

      if (error || !invoiceData) {
        setLoading(false);
        return;
      }

      setInvoice(invoiceData);

      // Load patient
      if (invoiceData.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', invoiceData.patient_id)
          .single();
        setPatient(patientData);
      }

      // Load items
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('invoice_id', id);
      setItems(itemsData || []);

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('invoice_id', id)
        .order('payment_date', { ascending: true });
      setPayments(paymentsData || []);

      // Load clinic info
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .in('key', ['clinic_info', 'general']);

      if (settingsData) {
        const settings = {};
        settingsData.forEach(s => {
          try {
            settings[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch {
            settings[s.key] = s.value;
          }
        });
        setClinicInfo(settings);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const balanceDue = invoice ? (parseFloat(invoice.total_amount) || 0) - totalPaid : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
  const clinic = clinicInfo?.clinic_info || clinicInfo?.general || {};

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Bar - Hidden when printing */}
      <div className="print:hidden bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/invoices/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoice
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
        <div 
          ref={printRef}
          className="bg-white shadow-lg print:shadow-none p-8 print:p-6"
          style={{ minHeight: '297mm' }}
        >
          {/* Clinic Header */}
          <div className="border-b-2 border-gray-300 pb-4 mb-4">
            <div className="flex items-start gap-4">
              {clinic.logo_url && (
                <img 
                  src={clinic.logo_url} 
                  alt="Clinic Logo" 
                  className="w-20 h-20 object-contain"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {clinic.name_en || clinic.name || 'Dental Clinic'}
                </h1>
                {clinic.name_ar && (
                  <h2 className="text-xl font-semibold text-gray-700 text-right" dir="rtl">
                    {clinic.name_ar}
                  </h2>
                )}
                <p className="text-gray-600 mt-1">
                  {clinic.address || clinic.address_en || ''}
                </p>
                <p className="text-gray-600">
                  {clinic.phone && `Phone: ${clinic.phone}`}
                  {clinic.phone && clinic.email && ' | '}
                  {clinic.email && `Email: ${clinic.email}`}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
            <div className="flex justify-center gap-8 mt-2 text-gray-600">
              <span>Invoice #: <strong>{invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}</strong></span>
              <span>Date: <strong>{formatDate(invoice.invoice_date || invoice.created_at)}</strong></span>
            </div>
            {invoice.due_date && (
              <p className="text-gray-600 mt-1">
                Due Date: <strong>{formatDate(invoice.due_date)}</strong>
              </p>
            )}
          </div>

          {/* Bill To & Status */}
          <div className="grid grid-cols-2 gap-6 mb-6 border border-gray-300 rounded-lg p-4">
            {/* Bill To */}
            <div>
              <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                BILL TO
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>{getPatientName(patient)}</strong></p>
                {patient?.phone && <p>Phone: {patient.phone}</p>}
                {patient?.email && <p>Email: {patient.email}</p>}
                {patient?.address && <p>Address: {patient.address}</p>}
              </div>
            </div>

            {/* Status */}
            <div className="text-right">
              <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                STATUS
              </h3>
              <span className={`inline-block px-4 py-2 rounded-lg font-bold text-lg ${status.color}`}>
                {status.label.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 border-b-2 border-gray-300 pb-1 mb-4 text-lg">
              ITEMS
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">#</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold w-16">Qty</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold w-28">Unit Price</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {item.description || item.service_name || 'Service'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {item.quantity || 1}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">
                      {fmtCurrency(item.unit_price || item.price || 0)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                      {fmtCurrency(item.total || (item.quantity || 1) * (item.unit_price || item.price || 0))}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-gray-300 px-3 py-4 text-center text-gray-500">
                      No items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-72">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{fmtCurrency(invoice.subtotal || invoice.total_amount || 0)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount{invoice.discount_type === 'percentage' ? ` (${invoice.discount_value}%)` : ''}:</span>
                    <span>- {fmtCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax{invoice.tax_rate ? ` (${invoice.tax_rate}%)` : ''}:</span>
                    <span>+ {fmtCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>{fmtCurrency(invoice.total_amount || 0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="text-green-600">{fmtCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance Due:</span>
                  <span className={balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
                    {fmtCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms & Signatures */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">PAYMENT TERMS</h3>
            <ul className="text-sm text-gray-600 list-disc list-inside mb-6">
              <li>Payment is due within 30 days</li>
              <li>Late payments may incur additional charges</li>
            </ul>

            <div className="flex justify-between mt-12">
              <div className="text-center">
                <div className="w-48 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">Cashier Signature</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">Patient Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoicePrint;
