import DOMPurify from 'dompurify';

// Configure DOMPurify to remove javascript: from CSS
if (typeof window !== 'undefined') {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    // Check style attributes for javascript:
    if (data.attrName === 'style') {
      data.attrValue = data.attrValue.replace(/javascript:/gi, '');
      data.attrValue = data.attrValue.replace(/expression\s*\(/gi, '');
      data.attrValue = data.attrValue.replace(/url\s*\(\s*["']?\s*javascript:/gi, 'url(');
    }
  });
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this for any user-generated or database-stored HTML content
 * that needs to be rendered with dangerouslySetInnerHTML
 * 
 * @param {string} html - The HTML string to sanitize
 * @param {object} options - Optional DOMPurify configuration
 * @returns {string} Sanitized HTML string
 */
export const sanitizeHTML = (html, options = {}) => {
  if (!html) return '';
  
  // Default configuration - allows common formatting but removes dangerous elements
  const defaultConfig = {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'hr', 'span', 'div',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'sub', 'sup', 'small', 'mark',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      // Links and media (safe)
      'a', 'img',
      // Semantic
      'article', 'section', 'header', 'footer', 'aside', 'nav',
      'blockquote', 'pre', 'code', 'figure', 'figcaption',
      // Forms (display only, no inputs)
      'fieldset', 'legend',
    ],
    ALLOWED_ATTR: [
      // Common attributes
      'class', 'id', 'title', 'lang', 'dir',
      // Link attributes
      'href', 'target', 'rel',
      // Image attributes
      'src', 'alt', 'width', 'height',
      // Table attributes
      'colspan', 'rowspan', 'scope',
      // Accessibility
      'role', 'aria-label', 'aria-describedby', 'aria-hidden',
    ],
    // Forbid dangerous protocols in href/src
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Remove script and data URIs
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
    // Remove data: URLs from images
    DATA_URI_TAGS: [],
  };

  const config = { ...defaultConfig, ...options };
  
  return DOMPurify.sanitize(html, config);
};

/**
 * Escape HTML entities to prevent XSS when inserting text into HTML context
 * Use this for plain text that should NOT be rendered as HTML
 * 
 * @param {string} text - The text string to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
export const escapeHTML = (text) => {
  if (!text) return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return String(text).replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
};

/**
 * Sanitize HTML for consent forms - more restrictive
 * Allows formatting but removes all interactive elements
 * 
 * @param {string} html - The HTML string to sanitize
 * @returns {string} Sanitized HTML string
 */
export const sanitizeConsentForm = (html) => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'span', 'div',
      'strong', 'b', 'em', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre',
    ],
    ALLOWED_ATTR: ['class', 'style'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'a', 'img'],
    FORBID_ATTR: ['href', 'src', 'onclick', 'onerror', 'onload'],
  });
};

/**
 * Strip all HTML tags, returning only text content
 * Use this when you need plain text from HTML
 * 
 * @param {string} html - The HTML string to strip
 * @returns {string} Plain text without HTML tags
 */
export const stripHTML = (html) => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
};

export default {
  sanitizeHTML,
  escapeHTML,
  sanitizeConsentForm,
  stripHTML,
};
