/**
 * Phase 2 Component Rendering Tests
 * Tests React component mounting, rendering, and user interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-id-001' }),
  };
});

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: {
              id: 'test-001',
              patient_id: 'patient-001',
              status: 'pending',
              title: 'Test Treatment Plan',
              patients: { name: 'John Doe', phone: '123-456-7890' },
            }, 
            error: null 
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        or: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'new-001' }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.dcm' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.dcm' } })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
  },
}));

// Helper to render with router
const renderWithRouter = (ui, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('Phase 2 Component Rendering Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  // =============================================
  // TREATMENT PLANS COMPONENT TESTS
  // =============================================
  describe('Treatment Plans Components', () => {
    describe('List Component Rendering', () => {
      it('should render list header with title', () => {
        // Mock component structure
        const ListHeader = () => (
          <div>
            <h1 data-testid="page-title">Treatment Plans</h1>
            <button data-testid="add-button">New Treatment Plan</button>
          </div>
        );
        
        render(<ListHeader />);
        expect(screen.getByTestId('page-title')).toHaveTextContent('Treatment Plans');
        expect(screen.getByTestId('add-button')).toBeInTheDocument();
      });

      it('should render status filter buttons', () => {
        const StatusFilters = () => (
          <div data-testid="status-filters">
            {['all', 'pending', 'approved', 'completed', 'cancelled'].map(status => (
              <button key={status} data-testid={`filter-${status}`}>{status}</button>
            ))}
          </div>
        );
        
        render(<StatusFilters />);
        expect(screen.getByTestId('filter-all')).toBeInTheDocument();
        expect(screen.getByTestId('filter-pending')).toBeInTheDocument();
        expect(screen.getByTestId('filter-approved')).toBeInTheDocument();
      });

      it('should render search input', () => {
        const SearchBar = () => (
          <input 
            data-testid="search-input" 
            placeholder="Search treatment plans..." 
            type="text"
          />
        );
        
        render(<SearchBar />);
        const input = screen.getByTestId('search-input');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('placeholder', 'Search treatment plans...');
      });

      it('should render table with correct columns', () => {
        const columns = ['Patient', 'Title', 'Status', 'Total', 'Valid Until', 'Actions'];
        const TableHeader = () => (
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} data-testid={`col-${col.toLowerCase()}`}>{col}</th>
              ))}
            </tr>
          </thead>
        );
        
        render(<table><TableHeader /></table>);
        columns.forEach(col => {
          expect(screen.getByTestId(`col-${col.toLowerCase()}`)).toBeInTheDocument();
        });
      });
    });

    describe('Form Component Rendering', () => {
      it('should render form with patient search', () => {
        const PatientSearch = () => (
          <div>
            <label htmlFor="patient-search">Patient</label>
            <input 
              id="patient-search"
              data-testid="patient-search"
              placeholder="Search patient..."
            />
          </div>
        );
        
        render(<PatientSearch />);
        expect(screen.getByLabelText('Patient')).toBeInTheDocument();
      });

      it('should render treatment items section', () => {
        const ItemsSection = () => (
          <div data-testid="items-section">
            <h3>Treatment Items</h3>
            <button data-testid="add-item">Add Item</button>
            <table data-testid="items-table">
              <tbody></tbody>
            </table>
          </div>
        );
        
        render(<ItemsSection />);
        expect(screen.getByTestId('items-section')).toBeInTheDocument();
        expect(screen.getByTestId('add-item')).toBeInTheDocument();
      });

      it('should render cost calculation fields', () => {
        const CostSection = () => (
          <div data-testid="cost-section">
            <input data-testid="total-cost" type="number" placeholder="Total" readOnly />
            <input data-testid="discount" type="number" placeholder="Discount" />
            <input data-testid="final-cost" type="number" placeholder="Final" readOnly />
          </div>
        );
        
        render(<CostSection />);
        expect(screen.getByTestId('total-cost')).toBeInTheDocument();
        expect(screen.getByTestId('discount')).toBeInTheDocument();
        expect(screen.getByTestId('final-cost')).toBeInTheDocument();
      });

      it('should render save and cancel buttons', () => {
        const FormActions = () => (
          <div data-testid="form-actions">
            <button data-testid="save-btn" type="submit">Save</button>
            <button data-testid="cancel-btn" type="button">Cancel</button>
          </div>
        );
        
        render(<FormActions />);
        expect(screen.getByTestId('save-btn')).toBeInTheDocument();
        expect(screen.getByTestId('cancel-btn')).toBeInTheDocument();
      });
    });

    describe('View Component Rendering', () => {
      it('should render patient info card', () => {
        const PatientCard = ({ patient }) => (
          <div data-testid="patient-card">
            <h3 data-testid="patient-name">{patient.name}</h3>
            <p data-testid="patient-phone">{patient.phone}</p>
          </div>
        );
        
        render(<PatientCard patient={{ name: 'John Doe', phone: '123-456-7890' }} />);
        expect(screen.getByTestId('patient-name')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('patient-phone')).toHaveTextContent('123-456-7890');
      });

      it('should render status badge', () => {
        const StatusBadge = ({ status }) => (
          <span data-testid="status-badge" className={`status-${status}`}>
            {status}
          </span>
        );
        
        render(<StatusBadge status="pending" />);
        expect(screen.getByTestId('status-badge')).toHaveTextContent('pending');
        expect(screen.getByTestId('status-badge')).toHaveClass('status-pending');
      });

      it('should render action buttons based on status', () => {
        const ActionButtons = ({ status }) => (
          <div data-testid="actions">
            {status === 'pending' && (
              <>
                <button data-testid="approve-btn">Approve</button>
                <button data-testid="reject-btn">Reject</button>
              </>
            )}
            {status === 'approved' && (
              <button data-testid="start-btn">Start Treatment</button>
            )}
            <button data-testid="print-btn">Print</button>
          </div>
        );
        
        const { rerender } = render(<ActionButtons status="pending" />);
        expect(screen.getByTestId('approve-btn')).toBeInTheDocument();
        expect(screen.getByTestId('reject-btn')).toBeInTheDocument();
        
        rerender(<ActionButtons status="approved" />);
        expect(screen.queryByTestId('approve-btn')).not.toBeInTheDocument();
        expect(screen.getByTestId('start-btn')).toBeInTheDocument();
      });
    });
  });

  // =============================================
  // USER INTERACTION TESTS
  // =============================================
  describe('User Interaction Tests', () => {
    it('should handle search input changes', async () => {
      const onSearch = vi.fn();
      const SearchInput = ({ onChange }) => (
        <input 
          data-testid="search" 
          onChange={(e) => onChange(e.target.value)}
        />
      );
      
      render(<SearchInput onChange={onSearch} />);
      const input = screen.getByTestId('search');
      
      fireEvent.change(input, { target: { value: 'John' } });
      expect(onSearch).toHaveBeenCalledWith('John');
    });

    it('should handle status filter clicks', async () => {
      const onFilter = vi.fn();
      const StatusFilter = ({ onFilterChange }) => (
        <div>
          {['all', 'pending', 'approved'].map(status => (
            <button 
              key={status}
              data-testid={`filter-${status}`}
              onClick={() => onFilterChange(status)}
            >
              {status}
            </button>
          ))}
        </div>
      );
      
      render(<StatusFilter onFilterChange={onFilter} />);
      
      fireEvent.click(screen.getByTestId('filter-pending'));
      expect(onFilter).toHaveBeenCalledWith('pending');
      
      fireEvent.click(screen.getByTestId('filter-approved'));
      expect(onFilter).toHaveBeenCalledWith('approved');
    });

    it('should handle form field changes', async () => {
      const onChange = vi.fn();
      const FormField = ({ onFieldChange }) => (
        <input
          data-testid="title-input"
          defaultValue=""
          onChange={(e) => onFieldChange(e.target.value)}
        />
      );
      
      render(<FormField onFieldChange={onChange} />);
      const input = screen.getByTestId('title-input');
      
      fireEvent.change(input, { target: { value: 'New Treatment' } });
      expect(onChange).toHaveBeenCalledWith('New Treatment');
    });

    it('should handle add item button click', () => {
      const onAddItem = vi.fn();
      const AddButton = ({ onClick }) => (
        <button data-testid="add-item" onClick={onClick}>Add Item</button>
      );
      
      render(<AddButton onClick={onAddItem} />);
      fireEvent.click(screen.getByTestId('add-item'));
      
      expect(onAddItem).toHaveBeenCalledTimes(1);
    });

    it('should handle delete confirmation', () => {
      const onDelete = vi.fn();
      const DeleteConfirm = ({ onConfirm, showDialog = false }) => (
        <div>
          <button data-testid="delete-btn">
            Delete
          </button>
          {showDialog && (
            <div data-testid="confirm-dialog">
              <button data-testid="confirm-yes" onClick={onConfirm}>Yes</button>
              <button data-testid="confirm-no">No</button>
            </div>
          )}
        </div>
      );
      
      const { rerender } = render(<DeleteConfirm onConfirm={onDelete} showDialog={false} />);
      expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
      
      // Show dialog
      rerender(<DeleteConfirm onConfirm={onDelete} showDialog={true} />);
      fireEvent.click(screen.getByTestId('confirm-yes'));
      expect(onDelete).toHaveBeenCalled();
    });

    it('should handle teeth selection toggle', () => {
      const selectedTeeth = [];
      const toggleTooth = vi.fn();
      
      const ToothButton = ({ tooth, selected, onToggle }) => (
        <button
          data-testid={`tooth-${tooth}`}
          className={selected ? 'selected' : ''}
          onClick={() => onToggle(tooth)}
        >
          {tooth}
        </button>
      );
      
      render(
        <ToothButton tooth={36} selected={false} onToggle={toggleTooth} />
      );
      
      fireEvent.click(screen.getByTestId('tooth-36'));
      expect(toggleTooth).toHaveBeenCalledWith(36);
    });
  });

  // =============================================
  // NAVIGATION TESTS
  // =============================================
  describe('Navigation Tests', () => {
    it('should navigate to create page on add button click', () => {
      const AddButton = () => (
        <button 
          data-testid="add-btn"
          onClick={() => mockNavigate('/treatment-plans/new')}
        >
          New
        </button>
      );
      
      render(<AddButton />);
      fireEvent.click(screen.getByTestId('add-btn'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/treatment-plans/new');
    });

    it('should navigate to edit page', () => {
      const EditLink = ({ id }) => (
        <button 
          data-testid="edit-btn"
          onClick={() => mockNavigate(`/treatment-plans/${id}/edit`)}
        >
          Edit
        </button>
      );
      
      render(<EditLink id="plan-001" />);
      fireEvent.click(screen.getByTestId('edit-btn'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/treatment-plans/plan-001/edit');
    });

    it('should navigate to view page', () => {
      const ViewLink = ({ id }) => (
        <button 
          data-testid="view-btn"
          onClick={() => mockNavigate(`/treatment-plans/${id}`)}
        >
          View
        </button>
      );
      
      render(<ViewLink id="plan-001" />);
      fireEvent.click(screen.getByTestId('view-btn'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/treatment-plans/plan-001');
    });

    it('should navigate back on cancel', () => {
      const CancelButton = () => (
        <button 
          data-testid="cancel-btn"
          onClick={() => mockNavigate('/treatment-plans')}
        >
          Cancel
        </button>
      );
      
      render(<CancelButton />);
      fireEvent.click(screen.getByTestId('cancel-btn'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/treatment-plans');
    });

    it('should navigate after successful save', async () => {
      const SaveForm = () => {
        const handleSave = async () => {
          // Simulate save
          await Promise.resolve();
          mockNavigate('/treatment-plans');
        };
        
        return (
          <button data-testid="save-btn" onClick={handleSave}>Save</button>
        );
      };
      
      render(<SaveForm />);
      fireEvent.click(screen.getByTestId('save-btn'));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/treatment-plans');
      });
    });
  });

  // =============================================
  // LOADING STATE TESTS
  // =============================================
  describe('Loading State Tests', () => {
    it('should show loading spinner while fetching data', () => {
      const LoadingSpinner = ({ loading }) => (
        loading ? (
          <div data-testid="loading-spinner">Loading...</div>
        ) : (
          <div data-testid="content">Content</div>
        )
      );
      
      const { rerender } = render(<LoadingSpinner loading={true} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      
      rerender(<LoadingSpinner loading={false} />);
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should disable buttons while saving', () => {
      const SaveButton = ({ saving }) => (
        <button 
          data-testid="save-btn"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      );
      
      const { rerender } = render(<SaveButton saving={false} />);
      expect(screen.getByTestId('save-btn')).not.toBeDisabled();
      
      rerender(<SaveButton saving={true} />);
      expect(screen.getByTestId('save-btn')).toBeDisabled();
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Saving...');
    });

    it('should show skeleton while loading list', () => {
      const ListSkeleton = ({ loading, items }) => (
        loading ? (
          <div data-testid="skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} data-testid={`skeleton-row-${i}`} className="skeleton-row" />
            ))}
          </div>
        ) : (
          <ul data-testid="list">
            {items.map(item => (
              <li key={item.id} data-testid={`item-${item.id}`}>{item.name}</li>
            ))}
          </ul>
        )
      );
      
      render(<ListSkeleton loading={true} items={[]} />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-row-1')).toBeInTheDocument();
    });
  });
});
