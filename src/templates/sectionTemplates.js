// Section Templates - Pre-built section configurations for the page builder
// These templates define the structure and default content for each section type

export const sectionTemplates = [
  // ===== HERO SECTIONS =====
  {
    id: 'hero-centered',
    name: 'Hero - Centered',
    name_ar: 'البطل - وسط',
    slug: 'hero-centered',
    description: 'Centered hero section with headline, subtext, and CTA',
    category: 'hero',
    thumbnail: '/templates/sections/hero-centered.jpg',
    is_premium: false,
    structure: {
      type: 'HeroSection',
      variant: 'centered',
      settings: {
        fullHeight: true,
        backgroundType: 'image',
        overlay: true,
        overlayOpacity: 0.5,
      },
    },
    default_content: {
      headline: 'Welcome to Our Dental Clinic',
      headline_ar: 'مرحباً بكم في عيادتنا',
      subheadline: 'Providing quality dental care for your entire family',
      subheadline_ar: 'نقدم رعاية أسنان عالية الجودة لجميع أفراد عائلتك',
      primaryButton: { text: 'Book Appointment', text_ar: 'احجز موعد', href: '/book' },
      secondaryButton: { text: 'Our Services', text_ar: 'خدماتنا', href: '/services' },
      backgroundImage: '/images/hero-dental.jpg',
    },
    editable_fields: [
      'headline', 'headline_ar', 'subheadline', 'subheadline_ar',
      'primaryButton', 'secondaryButton', 'backgroundImage'
    ],
  },
  {
    id: 'hero-split',
    name: 'Hero - Split',
    name_ar: 'البطل - منقسم',
    slug: 'hero-split',
    description: 'Split hero with image on one side and content on the other',
    category: 'hero',
    thumbnail: '/templates/sections/hero-split.jpg',
    is_premium: false,
    structure: {
      type: 'HeroSection',
      variant: 'split',
      settings: {
        imagePosition: 'right',
        contentWidth: 50,
      },
    },
    default_content: {
      headline: 'Your Smile, Our Priority',
      headline_ar: 'ابتسامتك، أولويتنا',
      subheadline: 'Experience modern dentistry with a personal touch',
      subheadline_ar: 'اختبر طب الأسنان الحديث بلمسة شخصية',
      primaryButton: { text: 'Get Started', text_ar: 'ابدأ الآن', href: '/book' },
      image: '/images/dentist-patient.jpg',
    },
    editable_fields: ['headline', 'headline_ar', 'subheadline', 'subheadline_ar', 'primaryButton', 'image'],
  },

  // ===== SERVICES SECTIONS =====
  {
    id: 'services-grid-3',
    name: 'Services - 3 Column Grid',
    name_ar: 'الخدمات - شبكة 3 أعمدة',
    slug: 'services-grid-3',
    description: 'Services displayed in a 3-column grid with icons',
    category: 'services',
    thumbnail: '/templates/sections/services-grid-3.jpg',
    is_premium: false,
    structure: {
      type: 'ServicesSection',
      variant: 'grid',
      settings: {
        columns: 3,
        showIcons: true,
        showDescriptions: true,
        maxItems: 6,
      },
    },
    default_content: {
      title: 'Our Services',
      title_ar: 'خدماتنا',
      subtitle: 'Comprehensive dental care for all ages',
      subtitle_ar: 'رعاية شاملة للأسنان لجميع الأعمار',
      dynamicData: 'services', // Pulls from services table
    },
    editable_fields: ['title', 'title_ar', 'subtitle', 'subtitle_ar'],
  },
  {
    id: 'services-featured',
    name: 'Services - Featured',
    name_ar: 'الخدمات - المميزة',
    slug: 'services-featured',
    description: 'Featured services with large images and descriptions',
    category: 'services',
    thumbnail: '/templates/sections/services-featured.jpg',
    is_premium: true,
    structure: {
      type: 'ServicesSection',
      variant: 'featured',
      settings: {
        layout: 'alternating',
        showPrices: false,
        maxItems: 4,
      },
    },
    default_content: {
      title: 'What We Offer',
      title_ar: 'ما نقدمه',
      dynamicData: 'featured_services',
    },
    editable_fields: ['title', 'title_ar'],
  },

  // ===== ABOUT/TEAM SECTIONS =====
  {
    id: 'about-clinic',
    name: 'About - Clinic Overview',
    name_ar: 'عن - نظرة عامة على العيادة',
    slug: 'about-clinic',
    description: 'About section with clinic description and image',
    category: 'about',
    thumbnail: '/templates/sections/about-clinic.jpg',
    is_premium: false,
    structure: {
      type: 'AboutSection',
      variant: 'default',
      settings: {
        imagePosition: 'left',
        showStats: true,
      },
    },
    default_content: {
      title: 'About Our Clinic',
      title_ar: 'عن عيادتنا',
      content: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>',
      content_ar: '<p>لوريم إيبسوم دولور سيت أميت...</p>',
      image: '/images/clinic-interior.jpg',
      stats: [
        { value: '15+', label: 'Years Experience', label_ar: 'سنوات الخبرة' },
        { value: '10K+', label: 'Happy Patients', label_ar: 'مريض سعيد' },
        { value: '20+', label: 'Dental Services', label_ar: 'خدمة أسنان' },
      ],
    },
    editable_fields: ['title', 'title_ar', 'content', 'content_ar', 'image', 'stats'],
  },
  {
    id: 'team-grid',
    name: 'Team - Grid',
    name_ar: 'الفريق - شبكة',
    slug: 'team-grid',
    description: 'Team members displayed in a grid layout',
    category: 'team',
    thumbnail: '/templates/sections/team-grid.jpg',
    is_premium: false,
    structure: {
      type: 'TeamSection',
      variant: 'grid',
      settings: {
        columns: 4,
        showBio: false,
        showSocialLinks: true,
      },
    },
    default_content: {
      title: 'Meet Our Team',
      title_ar: 'تعرف على فريقنا',
      subtitle: 'Expert dentists dedicated to your care',
      subtitle_ar: 'أطباء أسنان خبراء ملتزمون برعايتك',
      dynamicData: 'doctors',
    },
    editable_fields: ['title', 'title_ar', 'subtitle', 'subtitle_ar'],
  },

  // ===== TESTIMONIALS =====
  {
    id: 'testimonials-carousel',
    name: 'Testimonials - Carousel',
    name_ar: 'الشهادات - عرض متحرك',
    slug: 'testimonials-carousel',
    description: 'Patient testimonials in a carousel slider',
    category: 'testimonials',
    thumbnail: '/templates/sections/testimonials-carousel.jpg',
    is_premium: false,
    structure: {
      type: 'TestimonialsSection',
      variant: 'carousel',
      settings: {
        autoplay: true,
        autoplaySpeed: 5000,
        showRating: true,
        showAvatar: true,
      },
    },
    default_content: {
      title: 'What Our Patients Say',
      title_ar: 'ماذا يقول مرضانا',
      dynamicData: 'testimonials',
    },
    editable_fields: ['title', 'title_ar'],
  },
  {
    id: 'testimonials-grid',
    name: 'Testimonials - Grid',
    name_ar: 'الشهادات - شبكة',
    slug: 'testimonials-grid',
    description: 'Patient testimonials in a masonry grid',
    category: 'testimonials',
    thumbnail: '/templates/sections/testimonials-grid.jpg',
    is_premium: true,
    structure: {
      type: 'TestimonialsSection',
      variant: 'grid',
      settings: {
        columns: 3,
        showRating: true,
        maxItems: 6,
      },
    },
    default_content: {
      title: 'Patient Stories',
      title_ar: 'قصص المرضى',
      dynamicData: 'testimonials',
    },
    editable_fields: ['title', 'title_ar'],
  },

  // ===== CONTACT SECTIONS =====
  {
    id: 'contact-split',
    name: 'Contact - Split Form',
    name_ar: 'اتصل بنا - نموذج منقسم',
    slug: 'contact-split',
    description: 'Contact section with form and info side by side',
    category: 'contact',
    thumbnail: '/templates/sections/contact-split.jpg',
    is_premium: false,
    structure: {
      type: 'ContactSection',
      variant: 'split',
      settings: {
        showMap: true,
        showSocialLinks: true,
        formFields: ['name', 'email', 'phone', 'message'],
      },
    },
    default_content: {
      title: 'Get in Touch',
      title_ar: 'تواصل معنا',
      subtitle: "We'd love to hear from you",
      subtitle_ar: 'يسعدنا سماع رأيك',
      dynamicData: 'contact_info',
    },
    editable_fields: ['title', 'title_ar', 'subtitle', 'subtitle_ar'],
  },
  {
    id: 'contact-fullwidth',
    name: 'Contact - Full Width',
    name_ar: 'اتصل بنا - عرض كامل',
    slug: 'contact-fullwidth',
    description: 'Full width contact section with large map',
    category: 'contact',
    thumbnail: '/templates/sections/contact-fullwidth.jpg',
    is_premium: true,
    structure: {
      type: 'ContactSection',
      variant: 'fullwidth',
      settings: {
        mapHeight: 400,
        showWorkingHours: true,
      },
    },
    default_content: {
      title: 'Visit Our Clinic',
      title_ar: 'زوروا عيادتنا',
      dynamicData: 'contact_info',
    },
    editable_fields: ['title', 'title_ar'],
  },

  // ===== FAQ SECTIONS =====
  {
    id: 'faq-accordion',
    name: 'FAQ - Accordion',
    name_ar: 'الأسئلة الشائعة - أكورديون',
    slug: 'faq-accordion',
    description: 'Frequently asked questions with expandable answers',
    category: 'faq',
    thumbnail: '/templates/sections/faq-accordion.jpg',
    is_premium: false,
    structure: {
      type: 'FAQSection',
      variant: 'accordion',
      settings: {
        allowMultipleOpen: false,
        showCategories: true,
      },
    },
    default_content: {
      title: 'Frequently Asked Questions',
      title_ar: 'الأسئلة الشائعة',
      dynamicData: 'faqs',
    },
    editable_fields: ['title', 'title_ar'],
  },

  // ===== CTA SECTIONS =====
  {
    id: 'cta-simple',
    name: 'CTA - Simple',
    name_ar: 'دعوة للعمل - بسيط',
    slug: 'cta-simple',
    description: 'Simple call-to-action with headline and button',
    category: 'cta',
    thumbnail: '/templates/sections/cta-simple.jpg',
    is_premium: false,
    structure: {
      type: 'CTASection',
      variant: 'simple',
      settings: {
        backgroundColor: 'primary',
        textColor: 'white',
      },
    },
    default_content: {
      headline: 'Ready to Transform Your Smile?',
      headline_ar: 'هل أنت مستعد لتغيير ابتسامتك؟',
      subheadline: 'Book your appointment today and take the first step',
      subheadline_ar: 'احجز موعدك اليوم واتخذ الخطوة الأولى',
      button: { text: 'Book Now', text_ar: 'احجز الآن', href: '/book' },
    },
    editable_fields: ['headline', 'headline_ar', 'subheadline', 'subheadline_ar', 'button'],
  },
  {
    id: 'cta-with-image',
    name: 'CTA - With Image',
    name_ar: 'دعوة للعمل - مع صورة',
    slug: 'cta-with-image',
    description: 'Call-to-action section with background image',
    category: 'cta',
    thumbnail: '/templates/sections/cta-with-image.jpg',
    is_premium: false,
    structure: {
      type: 'CTASection',
      variant: 'withImage',
      settings: {
        overlay: true,
        overlayOpacity: 0.6,
      },
    },
    default_content: {
      headline: 'Your Perfect Smile Awaits',
      headline_ar: 'ابتسامتك المثالية تنتظرك',
      button: { text: 'Get Started', text_ar: 'ابدأ الآن', href: '/book' },
      backgroundImage: '/images/cta-bg.jpg',
    },
    editable_fields: ['headline', 'headline_ar', 'button', 'backgroundImage'],
  },

  // ===== BOOKING SECTION =====
  {
    id: 'booking-widget',
    name: 'Booking - Widget',
    name_ar: 'الحجز - أداة',
    slug: 'booking-widget',
    description: 'Embedded online booking widget',
    category: 'booking',
    thumbnail: '/templates/sections/booking-widget.jpg',
    is_premium: false,
    structure: {
      type: 'BookingSection',
      variant: 'widget',
      settings: {
        showServiceSelector: true,
        showDoctorSelector: true,
      },
    },
    default_content: {
      title: 'Book Your Appointment',
      title_ar: 'احجز موعدك',
      subtitle: 'Select a service and time that works for you',
      subtitle_ar: 'اختر خدمة ووقت يناسبك',
    },
    editable_fields: ['title', 'title_ar', 'subtitle', 'subtitle_ar'],
  },

  // ===== GALLERY SECTION =====
  {
    id: 'gallery-grid',
    name: 'Gallery - Grid',
    name_ar: 'المعرض - شبكة',
    slug: 'gallery-grid',
    description: 'Photo gallery in a masonry grid layout',
    category: 'gallery',
    thumbnail: '/templates/sections/gallery-grid.jpg',
    is_premium: false,
    structure: {
      type: 'GallerySection',
      variant: 'grid',
      settings: {
        columns: 4,
        lightbox: true,
        aspectRatio: 'square',
      },
    },
    default_content: {
      title: 'Our Gallery',
      title_ar: 'معرض الصور',
      dynamicData: 'gallery',
    },
    editable_fields: ['title', 'title_ar'],
  },

  // ===== MAP SECTION =====
  {
    id: 'map-fullwidth',
    name: 'Map - Full Width',
    name_ar: 'الخريطة - عرض كامل',
    slug: 'map-fullwidth',
    description: 'Full width Google Maps section',
    category: 'map',
    thumbnail: '/templates/sections/map-fullwidth.jpg',
    is_premium: false,
    structure: {
      type: 'MapSection',
      variant: 'fullwidth',
      settings: {
        height: 400,
        zoom: 15,
        showMarker: true,
      },
    },
    default_content: {
      dynamicData: 'location',
    },
    editable_fields: [],
  },
];

// Export categories for filtering
export const sectionCategories = [
  { id: 'hero', label: 'Hero', label_ar: 'البطل' },
  { id: 'services', label: 'Services', label_ar: 'الخدمات' },
  { id: 'about', label: 'About', label_ar: 'عن' },
  { id: 'team', label: 'Team', label_ar: 'الفريق' },
  { id: 'testimonials', label: 'Testimonials', label_ar: 'الشهادات' },
  { id: 'contact', label: 'Contact', label_ar: 'اتصل بنا' },
  { id: 'faq', label: 'FAQ', label_ar: 'أسئلة شائعة' },
  { id: 'cta', label: 'Call to Action', label_ar: 'دعوة للعمل' },
  { id: 'booking', label: 'Booking', label_ar: 'الحجز' },
  { id: 'gallery', label: 'Gallery', label_ar: 'المعرض' },
  { id: 'map', label: 'Map', label_ar: 'الخريطة' },
];

export default sectionTemplates;
