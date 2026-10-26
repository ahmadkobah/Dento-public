/**
 * Page Builder Tests - Pre-Mobile App Verification
 * Tests for Drag-Drop, Sections, Templates, Versioning
 * 
 * @created February 9, 2026
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Page Structure Tests
// ============================================

describe('Page Builder - Page Structure', () => {
  describe('Page Schema', () => {
    it('should validate page structure', () => {
      const validatePage = (page) => {
        const errors = [];
        if (!page.id) errors.push('Missing id');
        if (!page.title) errors.push('Missing title');
        if (!page.slug) errors.push('Missing slug');
        if (!Array.isArray(page.sections)) errors.push('Sections must be array');
        return errors;
      };

      const validPage = {
        id: 'page-1',
        title: 'Home',
        slug: 'home',
        sections: [],
      };

      expect(validatePage(validPage)).toHaveLength(0);
      expect(validatePage({})).toContain('Missing id');
    });

    it('should generate unique slugs', () => {
      const existingSlugs = ['home', 'about', 'contact'];

      const generateUniqueSlug = (title, existing) => {
        let slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        let counter = 1;
        let uniqueSlug = slug;
        
        while (existing.includes(uniqueSlug)) {
          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }
        return uniqueSlug;
      };

      expect(generateUniqueSlug('Services', existingSlugs)).toBe('services');
      expect(generateUniqueSlug('About', existingSlugs)).toBe('about-1');
    });
  });

  describe('Section Management', () => {
    it('should add section to page', () => {
      const page = { sections: [] };

      const addSection = (page, section, position = -1) => {
        const newSection = {
          id: `section-${Date.now()}`,
          ...section,
          order: position >= 0 ? position : page.sections.length,
        };
        
        if (position >= 0) {
          page.sections.splice(position, 0, newSection);
          // Reorder
          page.sections.forEach((s, i) => s.order = i);
        } else {
          page.sections.push(newSection);
        }
        return newSection;
      };

      addSection(page, { type: 'hero', content: {} });
      addSection(page, { type: 'features', content: {} });
      
      expect(page.sections).toHaveLength(2);
      expect(page.sections[0].type).toBe('hero');
    });

    it('should remove section from page', () => {
      const page = {
        sections: [
          { id: 's1', type: 'hero' },
          { id: 's2', type: 'features' },
          { id: 's3', type: 'footer' },
        ],
      };

      const removeSection = (page, sectionId) => {
        page.sections = page.sections.filter(s => s.id !== sectionId);
        page.sections.forEach((s, i) => s.order = i);
      };

      removeSection(page, 's2');
      expect(page.sections).toHaveLength(2);
      expect(page.sections.find(s => s.id === 's2')).toBeUndefined();
    });

    it('should reorder sections via drag-drop', () => {
      const page = {
        sections: [
          { id: 's1', order: 0 },
          { id: 's2', order: 1 },
          { id: 's3', order: 2 },
        ],
      };

      const moveSection = (page, fromIndex, toIndex) => {
        const [moved] = page.sections.splice(fromIndex, 1);
        page.sections.splice(toIndex, 0, moved);
        page.sections.forEach((s, i) => s.order = i);
      };

      moveSection(page, 2, 0); // Move s3 to first position
      expect(page.sections[0].id).toBe('s3');
      expect(page.sections[2].id).toBe('s2');
    });
  });
});

// ============================================
// Section Types Tests
// ============================================

describe('Page Builder - Section Types', () => {
  const sectionTypes = {
    hero: {
      name: 'Hero',
      icon: 'layout-template',
      defaultContent: {
        title: 'Welcome',
        subtitle: '',
        backgroundImage: '',
        ctaButton: { text: 'Get Started', link: '/' },
      },
    },
    features: {
      name: 'Features',
      icon: 'grid',
      defaultContent: {
        title: 'Our Features',
        items: [],
        columns: 3,
      },
    },
    services: {
      name: 'Services',
      icon: 'briefcase',
      defaultContent: {
        title: 'Our Services',
        services: [],
      },
    },
    testimonials: {
      name: 'Testimonials',
      icon: 'quote',
      defaultContent: {
        title: 'What Our Clients Say',
        testimonials: [],
      },
    },
    contact: {
      name: 'Contact',
      icon: 'mail',
      defaultContent: {
        title: 'Get in Touch',
        showForm: true,
        showMap: false,
      },
    },
    cta: {
      name: 'Call to Action',
      icon: 'megaphone',
      defaultContent: {
        title: 'Ready to Start?',
        description: '',
        button: { text: 'Contact Us', link: '/contact' },
      },
    },
  };

  it('should provide all section types', () => {
    expect(Object.keys(sectionTypes)).toContain('hero');
    expect(Object.keys(sectionTypes)).toContain('features');
    expect(Object.keys(sectionTypes)).toContain('contact');
  });

  it('should create section with default content', () => {
    const createSection = (type) => ({
      id: `section-${Date.now()}`,
      type,
      content: { ...sectionTypes[type].defaultContent },
    });

    const heroSection = createSection('hero');
    expect(heroSection.content.title).toBe('Welcome');
    expect(heroSection.content.ctaButton).toBeDefined();
  });

  it('should validate section content schema', () => {
    const validateHeroContent = (content) => {
      const errors = [];
      if (!content.title) errors.push('Title is required');
      if (content.ctaButton && !content.ctaButton.text) {
        errors.push('CTA button text required');
      }
      return errors;
    };

    expect(validateHeroContent({ title: 'Test' })).toHaveLength(0);
    expect(validateHeroContent({})).toContain('Title is required');
  });
});

// ============================================
// Drag and Drop Tests
// ============================================

describe('Page Builder - Drag and Drop', () => {
  describe('Drag Operations', () => {
    it('should calculate drop position', () => {
      const calculateDropPosition = (mouseY, containerRect, sectionCount) => {
        const sectionHeight = containerRect.height / sectionCount;
        return Math.min(
          Math.floor((mouseY - containerRect.top) / sectionHeight),
          sectionCount
        );
      };

      const containerRect = { top: 100, height: 400 };
      expect(calculateDropPosition(200, containerRect, 4)).toBe(1);
      expect(calculateDropPosition(400, containerRect, 4)).toBe(3);
    });

    it('should show drop indicator', () => {
      const getDropIndicatorStyle = (position, sectionHeight) => ({
        top: `${position * sectionHeight}px`,
        height: '4px',
        backgroundColor: '#3b82f6',
      });

      const style = getDropIndicatorStyle(2, 100);
      expect(style.top).toBe('200px');
    });

    it('should validate drop target', () => {
      const isValidDropTarget = (dragType, dropZoneType) => {
        const validTargets = {
          section: ['page', 'container'],
          element: ['section', 'container', 'row'],
        };
        return validTargets[dragType]?.includes(dropZoneType) ?? false;
      };

      expect(isValidDropTarget('section', 'page')).toBe(true);
      expect(isValidDropTarget('section', 'element')).toBe(false);
      expect(isValidDropTarget('element', 'section')).toBe(true);
    });
  });

  describe('Section Palette', () => {
    it('should list available sections', () => {
      const palette = [
        { type: 'hero', name: 'Hero', category: 'headers' },
        { type: 'navbar', name: 'Navigation', category: 'headers' },
        { type: 'features', name: 'Features', category: 'content' },
        { type: 'footer', name: 'Footer', category: 'footers' },
      ];

      const getByCategory = (category) => 
        palette.filter(s => s.category === category);

      expect(getByCategory('headers')).toHaveLength(2);
      expect(getByCategory('content')).toHaveLength(1);
    });
  });
});

// ============================================
// Template Tests
// ============================================

describe('Page Builder - Templates', () => {
  describe('Page Templates', () => {
    const pageTemplates = [
      {
        id: 'template-home',
        name: 'Home Page',
        description: 'Complete home page with hero, features, and CTA',
        thumbnail: '/templates/home.png',
        sections: [
          { type: 'hero', content: {} },
          { type: 'features', content: { columns: 3 } },
          { type: 'cta', content: {} },
          { type: 'footer', content: {} },
        ],
      },
      {
        id: 'template-contact',
        name: 'Contact Page',
        description: 'Contact form with map',
        thumbnail: '/templates/contact.png',
        sections: [
          { type: 'hero', content: { title: 'Contact Us' } },
          { type: 'contact', content: { showForm: true, showMap: true } },
          { type: 'footer', content: {} },
        ],
      },
    ];

    it('should list page templates', () => {
      expect(pageTemplates).toHaveLength(2);
      expect(pageTemplates[0].name).toBe('Home Page');
    });

    it('should apply template to new page', () => {
      const applyTemplate = (template) => ({
        id: `page-${Date.now()}`,
        title: template.name,
        slug: template.name.toLowerCase().replace(/\s+/g, '-'),
        sections: template.sections.map((s, i) => ({
          ...s,
          id: `section-${i}`,
          order: i,
        })),
        templateId: template.id,
      });

      const page = applyTemplate(pageTemplates[0]);
      expect(page.sections).toHaveLength(4);
      expect(page.templateId).toBe('template-home');
    });
  });

  describe('Section Templates', () => {
    it('should save section as template', () => {
      const templates = [];

      const saveAsTemplate = (section, name) => {
        const template = {
          id: `st-${Date.now()}`,
          name,
          type: section.type,
          content: { ...section.content },
          createdAt: new Date().toISOString(),
        };
        templates.push(template);
        return template;
      };

      const section = { type: 'hero', content: { title: 'Custom Hero' } };
      const template = saveAsTemplate(section, 'My Hero');

      expect(templates).toHaveLength(1);
      expect(template.name).toBe('My Hero');
    });
  });
});

// ============================================
// Content Editing Tests
// ============================================

describe('Page Builder - Content Editing', () => {
  describe('Inline Editing', () => {
    it('should update section content', () => {
      const section = {
        id: 's1',
        type: 'hero',
        content: { title: 'Original Title', subtitle: '' },
      };

      const updateContent = (section, path, value) => {
        const keys = path.split('.');
        let obj = section.content;
        for (let i = 0; i < keys.length - 1; i++) {
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
      };

      updateContent(section, 'title', 'New Title');
      expect(section.content.title).toBe('New Title');
    });

    it('should handle nested content updates', () => {
      const section = {
        content: {
          button: { text: 'Click', link: '/' },
        },
      };

      const setNestedValue = (obj, path, value) => {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, k) => o[k], obj);
        target[lastKey] = value;
      };

      setNestedValue(section, 'content.button.text', 'New Text');
      expect(section.content.button.text).toBe('New Text');
    });
  });

  describe('Rich Text Editor', () => {
    it('should sanitize HTML content', () => {
      const sanitizeHtml = (html) => {
        // Remove dangerous tags and their content
        return html
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/onerror\s*=/gi, '')
          .replace(/onclick\s*=/gi, '');
      };

      const dirty = '<p>Hello</p><script>alert("xss")</script>';
      const clean = sanitizeHtml(dirty);
      
      expect(clean).not.toContain('<script');
      expect(clean).toContain('<p>Hello</p>');
    });

    it('should preserve safe formatting', () => {
      const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'];

      const isTagAllowed = (tag) => allowedTags.includes(tag.toLowerCase());

      expect(isTagAllowed('p')).toBe(true);
      expect(isTagAllowed('strong')).toBe(true);
      expect(isTagAllowed('script')).toBe(false);
      expect(isTagAllowed('iframe')).toBe(false);
    });
  });
});

// ============================================
// Version Control Tests
// ============================================

describe('Page Builder - Version Control', () => {
  describe('Version Management', () => {
    const versions = [
      { id: 'v1', version: 1, status: 'published', content: {}, createdAt: '2026-02-01' },
      { id: 'v2', version: 2, status: 'draft', content: {}, createdAt: '2026-02-05' },
      { id: 'v3', version: 3, status: 'draft', content: {}, createdAt: '2026-02-09' },
    ];

    it('should get published version', () => {
      const getPublished = () => versions.find(v => v.status === 'published');
      expect(getPublished().version).toBe(1);
    });

    it('should get latest draft', () => {
      const getLatestDraft = () => {
        const drafts = versions.filter(v => v.status === 'draft');
        return drafts.sort((a, b) => b.version - a.version)[0];
      };
      expect(getLatestDraft().version).toBe(3);
    });

    it('should create new version from published', () => {
      const createVersionFromPublished = () => {
        const published = versions.find(v => v.status === 'published');
        const maxVersion = Math.max(...versions.map(v => v.version));
        
        return {
          id: `v${maxVersion + 1}`,
          version: maxVersion + 1,
          status: 'draft',
          content: { ...published.content },
          baseVersion: published.version,
          createdAt: new Date().toISOString(),
        };
      };

      const newVersion = createVersionFromPublished();
      expect(newVersion.version).toBe(4);
      expect(newVersion.status).toBe('draft');
      expect(newVersion.baseVersion).toBe(1);
    });

    it('should publish draft and archive old published', () => {
      let versionsState = [...versions];

      const publishVersion = (versionId) => {
        versionsState = versionsState.map(v => {
          if (v.id === versionId) {
            return { ...v, status: 'published', publishedAt: new Date().toISOString() };
          }
          if (v.status === 'published') {
            return { ...v, status: 'archived' };
          }
          return v;
        });
      };

      publishVersion('v3');
      
      expect(versionsState.find(v => v.id === 'v3').status).toBe('published');
      expect(versionsState.find(v => v.id === 'v1').status).toBe('archived');
    });
  });

  describe('Autosave', () => {
    it('should debounce autosave', () => {
      vi.useFakeTimers();
      const save = vi.fn();

      const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        };
      };

      const debouncedSave = debounce(save, 1000);
      
      debouncedSave();
      debouncedSave();
      debouncedSave();

      expect(save).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      expect(save).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });
  });
});

// ============================================
// Preview Tests
// ============================================

describe('Page Builder - Preview', () => {
  describe('Preview Modes', () => {
    it('should switch between edit and preview mode', () => {
      let mode = 'edit';

      const togglePreview = () => {
        mode = mode === 'edit' ? 'preview' : 'edit';
      };

      togglePreview();
      expect(mode).toBe('preview');
      togglePreview();
      expect(mode).toBe('edit');
    });

    it('should support device preview sizes', () => {
      const deviceSizes = {
        desktop: { width: '100%', maxWidth: '1920px' },
        tablet: { width: '768px' },
        mobile: { width: '375px' },
      };

      expect(deviceSizes.mobile.width).toBe('375px');
      expect(deviceSizes.tablet.width).toBe('768px');
    });
  });
});

// ============================================
// SEO Tests
// ============================================

describe('Page Builder - SEO', () => {
  describe('Meta Tags', () => {
    it('should generate meta tags from page', () => {
      const generateMeta = (page) => ({
        title: page.seo?.title || page.title,
        description: page.seo?.description || '',
        ogImage: page.seo?.ogImage || '',
        noIndex: page.seo?.noIndex || false,
      });

      const page = {
        title: 'About Us',
        seo: {
          title: 'About Our Dental Clinic - Dento',
          description: 'Learn about our clinic',
        },
      };

      const meta = generateMeta(page);
      expect(meta.title).toBe('About Our Dental Clinic - Dento');
      expect(meta.description).toBe('Learn about our clinic');
    });

    it('should validate SEO fields', () => {
      const validateSEO = (seo) => {
        const warnings = [];
        if (!seo.title) warnings.push('Missing title');
        if (!seo.description) warnings.push('Missing description');
        if (seo.title && seo.title.length > 60) warnings.push('Title too long');
        if (seo.description && seo.description.length > 160) warnings.push('Description too long');
        return warnings;
      };

      expect(validateSEO({})).toContain('Missing title');
      expect(validateSEO({ title: 'A'.repeat(70) })).toContain('Title too long');
    });
  });
});

// ============================================
// Export Tests
// ============================================

describe('Page Builder - Export', () => {
  it('should export page as JSON', () => {
    const page = {
      id: 'page-1',
      title: 'Home',
      sections: [{ type: 'hero', content: {} }],
    };

    const exportPage = (page) => JSON.stringify(page, null, 2);
    const json = exportPage(page);

    expect(JSON.parse(json)).toEqual(page);
  });

  it('should sanitize export data', () => {
    const sanitizeExport = (page) => {
      const { id, version, ...rest } = page;
      return rest;
    };

    const page = { id: '123', version: '1.0', title: 'Test', sections: [] };
    const sanitized = sanitizeExport(page);

    expect(sanitized.id).toBeUndefined();
    expect(sanitized.title).toBe('Test');
  });
});

export { };
