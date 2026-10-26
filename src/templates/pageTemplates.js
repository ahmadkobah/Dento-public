// Page Templates - Complete page layouts for quick setup
// These templates combine multiple section templates into full pages

import { sectionTemplates } from './sectionTemplates';

export const pageTemplates = [
  // ===== HOME PAGE TEMPLATES =====
  {
    id: 'home-modern',
    name: 'Modern Home',
    name_ar: 'الصفحة الرئيسية الحديثة',
    slug: 'home-modern',
    description: 'A modern, clean homepage with all essential sections',
    category: 'home',
    thumbnail: '/templates/pages/home-modern.jpg',
    is_premium: false,
    sections: [
      { template_id: 'hero-centered', locked: true },
      { template_id: 'services-grid-3', locked: true },
      { template_id: 'about-clinic', locked: true },
      { template_id: 'testimonials-carousel', locked: true },
      { template_id: 'cta-simple', locked: true },
    ],
    default_settings: {
      seo_title: 'Welcome to {{clinic_name}} | Dental Clinic',
      seo_description: 'Professional dental care at {{clinic_name}}. Book your appointment today.',
    },
  },
  {
    id: 'home-classic',
    name: 'Classic Home',
    name_ar: 'الصفحة الرئيسية الكلاسيكية',
    slug: 'home-classic',
    description: 'A classic, professional homepage layout',
    category: 'home',
    thumbnail: '/templates/pages/home-classic.jpg',
    is_premium: false,
    sections: [
      { template_id: 'hero-split', locked: true },
      { template_id: 'services-grid-3', locked: true },
      { template_id: 'team-grid', locked: true },
      { template_id: 'faq-accordion', locked: true },
      { template_id: 'contact-split', locked: true },
    ],
    default_settings: {
      seo_title: '{{clinic_name}} - Your Trusted Dental Care Provider',
      seo_description: 'Expert dental services for the whole family at {{clinic_name}}.',
    },
  },
  {
    id: 'home-premium',
    name: 'Premium Home',
    name_ar: 'الصفحة الرئيسية المميزة',
    slug: 'home-premium',
    description: 'A premium, feature-rich homepage with advanced sections',
    category: 'home',
    thumbnail: '/templates/pages/home-premium.jpg',
    is_premium: true,
    sections: [
      { template_id: 'hero-centered', locked: true },
      { template_id: 'services-featured', locked: true },
      { template_id: 'about-clinic', locked: true },
      { template_id: 'team-grid', locked: true },
      { template_id: 'testimonials-grid', locked: true },
      { template_id: 'gallery-grid', locked: false },
      { template_id: 'cta-with-image', locked: true },
      { template_id: 'contact-fullwidth', locked: true },
    ],
    default_settings: {
      seo_title: '{{clinic_name}} - Premium Dental Care',
      seo_description: 'Experience world-class dental services at {{clinic_name}}.',
    },
  },

  // ===== SERVICES PAGE TEMPLATES =====
  {
    id: 'services-list',
    name: 'Services List',
    name_ar: 'قائمة الخدمات',
    slug: 'services-list',
    description: 'A dedicated services page with detailed listings',
    category: 'services',
    thumbnail: '/templates/pages/services-list.jpg',
    is_premium: false,
    sections: [
      {
        template_id: 'hero-centered',
        locked: true,
        content_overrides: {
          headline: 'Our Dental Services',
          headline_ar: 'خدماتنا السنية',
          subheadline: 'Comprehensive care for your entire family',
          subheadline_ar: 'رعاية شاملة لجميع أفراد عائلتك',
        },
      },
      { template_id: 'services-grid-3', locked: true },
      { template_id: 'cta-simple', locked: true },
    ],
    default_settings: {
      seo_title: 'Our Services | {{clinic_name}}',
      seo_description: 'Explore our comprehensive dental services at {{clinic_name}}.',
    },
  },

  // ===== ABOUT PAGE TEMPLATES =====
  {
    id: 'about-full',
    name: 'About Us',
    name_ar: 'من نحن',
    slug: 'about-full',
    description: 'Complete about us page with team and testimonials',
    category: 'about',
    thumbnail: '/templates/pages/about-full.jpg',
    is_premium: false,
    sections: [
      {
        template_id: 'hero-split',
        locked: true,
        content_overrides: {
          headline: 'About {{clinic_name}}',
          headline_ar: 'عن {{clinic_name}}',
          subheadline: 'Learn about our story and mission',
          subheadline_ar: 'تعرف على قصتنا ورسالتنا',
        },
      },
      { template_id: 'about-clinic', locked: true },
      { template_id: 'team-grid', locked: true },
      { template_id: 'testimonials-carousel', locked: true },
    ],
    default_settings: {
      seo_title: 'About Us | {{clinic_name}}',
      seo_description: 'Learn about {{clinic_name}} and our dedicated team of dental professionals.',
    },
  },

  // ===== CONTACT PAGE TEMPLATES =====
  {
    id: 'contact-standard',
    name: 'Contact Us',
    name_ar: 'اتصل بنا',
    slug: 'contact-standard',
    description: 'Standard contact page with form and map',
    category: 'contact',
    thumbnail: '/templates/pages/contact-standard.jpg',
    is_premium: false,
    sections: [
      {
        template_id: 'hero-centered',
        locked: true,
        content_overrides: {
          headline: 'Contact Us',
          headline_ar: 'اتصل بنا',
          subheadline: "We'd love to hear from you",
          subheadline_ar: 'يسعدنا سماع رأيك',
        },
      },
      { template_id: 'contact-split', locked: true },
      { template_id: 'map-fullwidth', locked: true },
    ],
    default_settings: {
      seo_title: 'Contact Us | {{clinic_name}}',
      seo_description: 'Get in touch with {{clinic_name}}. Book an appointment or send us a message.',
    },
  },

  // ===== BOOKING PAGE TEMPLATE =====
  {
    id: 'booking-page',
    name: 'Online Booking',
    name_ar: 'الحجز الإلكتروني',
    slug: 'booking-page',
    description: 'Dedicated online booking page',
    category: 'booking',
    thumbnail: '/templates/pages/booking-page.jpg',
    is_premium: false,
    sections: [
      {
        template_id: 'hero-centered',
        locked: true,
        content_overrides: {
          headline: 'Book Your Appointment',
          headline_ar: 'احجز موعدك',
          subheadline: 'Schedule your visit in just a few clicks',
          subheadline_ar: 'حدد موعد زيارتك بنقرات قليلة',
        },
      },
      { template_id: 'booking-widget', locked: true },
      { template_id: 'faq-accordion', locked: true },
    ],
    default_settings: {
      seo_title: 'Book Appointment | {{clinic_name}}',
      seo_description: 'Book your dental appointment online at {{clinic_name}}.',
    },
  },

  // ===== FAQ PAGE TEMPLATE =====
  {
    id: 'faq-page',
    name: 'FAQ Page',
    name_ar: 'صفحة الأسئلة الشائعة',
    slug: 'faq-page',
    description: 'Frequently asked questions page',
    category: 'faq',
    thumbnail: '/templates/pages/faq-page.jpg',
    is_premium: false,
    sections: [
      {
        template_id: 'hero-centered',
        locked: true,
        content_overrides: {
          headline: 'Frequently Asked Questions',
          headline_ar: 'الأسئلة الشائعة',
          subheadline: 'Find answers to common questions',
          subheadline_ar: 'اعثر على إجابات للأسئلة الشائعة',
        },
      },
      { template_id: 'faq-accordion', locked: true },
      { template_id: 'cta-simple', locked: true },
    ],
    default_settings: {
      seo_title: 'FAQ | {{clinic_name}}',
      seo_description: 'Find answers to frequently asked questions about dental care at {{clinic_name}}.',
    },
  },

  // ===== TESTIMONIALS PAGE TEMPLATE =====
  {
    id: 'testimonials-page',
    name: 'Testimonials',
    name_ar: 'آراء المرضى',
    slug: 'testimonials-page',
    description: 'Patient testimonials and reviews page',
    category: 'testimonials',
    thumbnail: '/templates/pages/testimonials-page.jpg',
    is_premium: false,
    sections: [
      {
        template_id: 'hero-centered',
        locked: true,
        content_overrides: {
          headline: 'What Our Patients Say',
          headline_ar: 'ماذا يقول مرضانا',
          subheadline: 'Real stories from real patients',
          subheadline_ar: 'قصص حقيقية من مرضى حقيقيين',
        },
      },
      { template_id: 'testimonials-carousel', locked: true },
      { template_id: 'cta-simple', locked: true },
    ],
    default_settings: {
      seo_title: 'Patient Testimonials | {{clinic_name}}',
      seo_description: 'Read what our patients say about their experience at {{clinic_name}}.',
    },
  },

  // ===== DENTAL TOURISM PAGE TEMPLATE =====
  {
    id: 'dental-tourism',
    name: 'Dental Tourism',
    name_ar: 'سياحة الأسنان',
    slug: 'dental-tourism',
    description: 'Specialized page for international patients',
    category: 'special',
    thumbnail: '/templates/pages/dental-tourism.jpg',
    is_premium: true,
    sections: [
      {
        template_id: 'hero-centered',
        locked: true,
        content_overrides: {
          headline: 'Dental Tourism',
          headline_ar: 'سياحة الأسنان',
          subheadline: 'World-class dental care for international patients',
          subheadline_ar: 'رعاية أسنان عالمية المستوى للمرضى الدوليين',
        },
      },
      { template_id: 'services-featured', locked: true },
      { template_id: 'testimonials-carousel', locked: true },
      { template_id: 'about-clinic', locked: true },
      { template_id: 'contact-split', locked: true },
    ],
    default_settings: {
      seo_title: 'Dental Tourism | {{clinic_name}}',
      seo_description: 'International dental care packages at {{clinic_name}}.',
    },
  },
];

// Page categories for filtering
export const pageCategories = [
  { id: 'home', label: 'Home Pages', label_ar: 'الصفحات الرئيسية' },
  { id: 'services', label: 'Services Pages', label_ar: 'صفحات الخدمات' },
  { id: 'about', label: 'About Pages', label_ar: 'صفحات عن' },
  { id: 'contact', label: 'Contact Pages', label_ar: 'صفحات الاتصال' },
  { id: 'booking', label: 'Booking Pages', label_ar: 'صفحات الحجز' },
  { id: 'faq', label: 'FAQ Pages', label_ar: 'صفحات الأسئلة' },
  { id: 'testimonials', label: 'Testimonials Pages', label_ar: 'صفحات الشهادات' },
  { id: 'special', label: 'Special Pages', label_ar: 'صفحات خاصة' },
];

// Helper function to get template with expanded sections
export function getPageTemplateWithSections(templateId) {
  const template = pageTemplates.find(t => t.id === templateId);
  if (!template) return null;

  const expandedSections = template.sections.map(section => {
    const sectionTemplate = sectionTemplates.find(st => st.id === section.template_id);
    if (!sectionTemplate) return null;

    return {
      ...sectionTemplate,
      locked: section.locked,
      content: section.content_overrides
        ? { ...sectionTemplate.default_content, ...section.content_overrides }
        : sectionTemplate.default_content,
    };
  }).filter(Boolean);

  return {
    ...template,
    expandedSections,
  };
}

export default pageTemplates;
