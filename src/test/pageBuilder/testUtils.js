/**
 * Page Builder Test Utilities
 * 
 * This file provides testing utilities for Page Builder components.
 * Includes mock providers, test data factories, and helper functions.
 */

import { vi, expect } from 'vitest';

// ===========================================
// MOCK DATA FACTORIES
// ===========================================

/**
 * Create a mock section with default values
 */
export const createMockSection = (overrides = {}) => ({
  id: `section-${Math.random().toString(36).substr(2, 9)}`,
  type: 'hero-centered',
  order_index: 0,
  content: {
    heading: 'Test Heading',
    subheading: 'Test Subheading',
    buttonText: 'Learn More',
    buttonLink: '/test',
  },
  settings: {
    backgroundColor: '#ffffff',
    paddingTop: '80px',
    paddingBottom: '80px',
  },
  is_visible: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock page with default values
 */
export const createMockPage = (overrides = {}) => ({
  id: `page-${Math.random().toString(36).substr(2, 9)}`,
  tenant_id: 'test-tenant-id',
  title: 'Test Page',
  slug: 'test-page',
  status: 'draft',
  is_homepage: false,
  meta_title: 'Test Page | Dento',
  meta_description: 'A test page for unit testing',
  sections: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  published_at: null,
  ...overrides,
});

/**
 * Create a mock section template
 */
export const createMockSectionTemplate = (overrides = {}) => ({
  id: `template-${Math.random().toString(36).substr(2, 9)}`,
  type: 'hero-centered',
  name: 'Test Hero Template',
  description: 'A test hero section template',
  thumbnail_url: '/images/templates/hero-centered.png',
  category: 'hero',
  default_content: {
    heading: 'Welcome',
    subheading: 'This is a test',
  },
  default_settings: {
    backgroundColor: '#f8f9fa',
  },
  schema: {
    type: 'object',
    properties: {
      heading: { type: 'string', title: 'Heading' },
      subheading: { type: 'string', title: 'Subheading' },
    },
  },
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock page template
 */
export const createMockPageTemplate = (overrides = {}) => ({
  id: `page-template-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Page Template',
  description: 'A complete page template for testing',
  thumbnail_url: '/images/templates/default-page.png',
  category: 'dental',
  sections: ['hero-centered', 'services-grid', 'cta-simple'],
  default_meta: {
    title: 'Test Page',
    description: 'Test description',
  },
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides = {}) => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  tenant_id: 'test-tenant-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock content lock
 */
export const createMockContentLock = (overrides = {}) => ({
  id: `lock-${Math.random().toString(36).substr(2, 9)}`,
  resource_type: 'page',
  resource_id: 'test-page-id',
  user_id: 'test-user-id',
  user_name: 'Test User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ===========================================
// MOCK SUPABASE CLIENT
// ===========================================

/**
 * Create a mock Supabase client for testing
 */
export const createMockSupabase = (customResponses = {}) => {
  const defaultResponses = {
    select: { data: [], error: null },
    insert: { data: null, error: null },
    update: { data: null, error: null },
    upsert: { data: null, error: null },
    delete: { data: null, error: null },
  };

  const responses = { ...defaultResponses, ...customResponses };

  const createChainableMock = () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => 
        Promise.resolve(responses.select)
      ),
      maybeSingle: vi.fn().mockImplementation(() => 
        Promise.resolve(responses.select)
      ),
      then: (resolve) => resolve(responses.select),
    };
    return chain;
  };

  return {
    from: vi.fn().mockImplementation(() => createChainableMock()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: createMockUser() }, 
        error: null 
      }),
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { access_token: 'test-token' } }, 
        error: null 
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  };
};

// ===========================================
// MOCK HOOKS
// ===========================================

/**
 * Create mock implementations of page builder hooks
 */
export const createMockPageBuilderHooks = () => ({
  usePage: vi.fn().mockReturnValue({
    page: createMockPage(),
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  
  usePageSections: vi.fn().mockReturnValue({
    sections: [createMockSection()],
    loading: false,
    error: null,
    addSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSections: vi.fn(),
  }),
  
  useSectionTemplates: vi.fn().mockReturnValue({
    templates: [createMockSectionTemplate()],
    loading: false,
    error: null,
  }),
  
  useAutoSave: vi.fn().mockReturnValue({
    status: 'IDLE',
    lastSaved: null,
    triggerSave: vi.fn(),
    hasUnsavedChanges: false,
  }),
  
  useContentLock: vi.fn().mockReturnValue({
    lockStatus: 'UNLOCKED',
    lockHolder: null,
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn(),
    forceTakeLock: vi.fn().mockResolvedValue(true),
    canEdit: true,
  }),
});

// ===========================================
// RENDER HELPERS
// ===========================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Wait for a specific condition to be true
 */
export const waitFor = async (condition, { timeout = 5000, interval = 50 } = {}) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Condition not met within timeout');
};

// ===========================================
// ASSERTION HELPERS
// ===========================================

/**
 * Assert that a section has valid structure
 */
export const assertValidSection = (section) => {
  expect(section).toHaveProperty('id');
  expect(section).toHaveProperty('type');
  expect(section).toHaveProperty('content');
  expect(section).toHaveProperty('settings');
  expect(typeof section.order_index).toBe('number');
};

/**
 * Assert that a page has valid structure
 */
export const assertValidPage = (page) => {
  expect(page).toHaveProperty('id');
  expect(page).toHaveProperty('title');
  expect(page).toHaveProperty('slug');
  expect(page).toHaveProperty('status');
  expect(['draft', 'published', 'archived']).toContain(page.status);
};

/**
 * Assert that content was auto-saved
 */
export const assertAutoSaved = async (mockSave, expectedContent) => {
  await waitFor(() => mockSave.mock.calls.length > 0);
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining(expectedContent)
  );
};

// ===========================================
// MOCK CRAFT.JS UTILITIES
// ===========================================

/**
 * Create a mock Craft.js editor context
 */
export const createMockCraftEditor = () => ({
  enabled: true,
  canUndo: false,
  canRedo: false,
  nodes: {},
  events: {
    selected: new Set(),
    dragged: new Set(),
  },
  actions: {
    add: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
    setProp: vi.fn(),
    setCustom: vi.fn(),
    setHidden: vi.fn(),
    setEvents: vi.fn(),
    selectNode: vi.fn(),
    clearEvents: vi.fn(),
    history: {
      undo: vi.fn(),
      redo: vi.fn(),
      clear: vi.fn(),
    },
  },
  query: {
    node: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({}),
      ancestors: vi.fn().mockReturnValue([]),
      descendants: vi.fn().mockReturnValue([]),
    }),
    getSerializedNodes: vi.fn().mockReturnValue({}),
    parseReactElement: vi.fn(),
    parseSerializedNode: vi.fn(),
    getOptions: vi.fn().mockReturnValue({}),
  },
});

/**
 * Mock the useEditor hook from Craft.js
 */
export const mockUseEditor = (overrides = {}) => ({
  connectors: {
    connect: vi.fn((el) => el),
    drag: vi.fn((el) => el),
    create: vi.fn((el) => el),
  },
  selected: null,
  hovered: null,
  isActive: false,
  enabled: true,
  actions: {
    add: vi.fn(),
    delete: vi.fn(),
    selectNode: vi.fn(),
    setProp: vi.fn(),
    history: {
      undo: vi.fn(),
      redo: vi.fn(),
    },
  },
  query: {
    getSerializedNodes: vi.fn().mockReturnValue({}),
  },
  ...overrides,
});

/**
 * Mock the useNode hook from Craft.js
 */
export const mockUseNode = (overrides = {}) => ({
  connectors: {
    connect: vi.fn((el) => el),
    drag: vi.fn((el) => el),
  },
  selected: false,
  hovered: false,
  id: 'test-node-id',
  actions: {
    setProp: vi.fn(),
    setCustom: vi.fn(),
  },
  ...overrides,
});

// ===========================================
// LOCAL STORAGE MOCK
// ===========================================

/**
 * Create a mock localStorage for testing
 */
export const createMockLocalStorage = () => {
  let store = {};
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index) => Object.keys(store)[index] || null),
  };
};

// ===========================================
// SETUP & TEARDOWN HELPERS
// ===========================================

/**
 * Setup function to run before each test
 */
export const setupPageBuilderTests = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: createMockLocalStorage(),
    writable: true,
  });

  // Mock scrollTo
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
};

/**
 * Cleanup function to run after each test
 */
export const cleanupPageBuilderTests = () => {
  vi.clearAllMocks();
  window.localStorage.clear();
};

// ===========================================
// EXPORT ALL
// ===========================================

export default {
  // Factories
  createMockSection,
  createMockPage,
  createMockSectionTemplate,
  createMockPageTemplate,
  createMockUser,
  createMockContentLock,
  
  // Mocks
  createMockSupabase,
  createMockPageBuilderHooks,
  createMockCraftEditor,
  mockUseEditor,
  mockUseNode,
  createMockLocalStorage,
  
  // Helpers
  waitForAsync,
  waitFor,
  assertValidSection,
  assertValidPage,
  assertAutoSaved,
  
  // Setup/Teardown
  setupPageBuilderTests,
  cleanupPageBuilderTests,
};
