import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language, isRTL]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

const translations = {
  en: {
    // Navbar
    nav: {
      home: 'Home',
      whoWeAre: 'Who We Are',
      aboutUs: 'About Us',
      services: 'Services',
      dentalTourism: 'Dental Tourism',
      testimonials: 'Testimonials',
      portfolio: 'Portfolio',
      contact: 'Contact',
      bookAppointment: 'Book Appointment'
    },
    
    // Home Page
    home: {
      heroTitle: 'Your Smile, Our',
      heroWords: ['Passion', 'Priority', 'Promise'],
      heroSubtitle: 'Experience world-class dental care with cutting-edge technology and a compassionate team dedicated to your perfect smile.',
      bookConsultation: 'Book Free Consultation',
      viewServices: 'View Services',
      whyChooseUs: 'Why Choose Us',
      whyChooseUsSubtitle: 'Experience the difference with our patient-centered approach',
      expertTeam: 'Expert Team',
      expertTeamDesc: 'Board-certified specialists with years of experience',
      modernTechnology: 'Modern Technology',
      modernTechnologyDesc: 'State-of-the-art equipment for precise treatments',
      patientComfort: 'Patient Comfort',
      patientComfortDesc: 'Relaxing environment with sedation options',
      aboutClinic: 'About Canine Clinic',
      aboutText: 'At Canine Clinic, we are dedicated to providing exceptional dental care services in a welcoming and professional environment. With over 20 years of experience, our commitment to continuous learning ensures that our patients receive the most advanced treatments available.',
      learnMore: 'Learn More About Us',
      yearsExperience: 'Years of Experience',
      happyPatients: 'Happy Patients',
      expertDoctors: 'Expert Doctors',
      ourServices: 'Our Services',
      servicesSubtitle: 'Comprehensive dental solutions for every need',
      generalDentistry: 'General Dentistry',
      cosmeticDentistry: 'Cosmetic Dentistry',
      dentalImplants: 'Dental Implants',
      orthodontics: 'Orthodontics',
      pediatricDentistry: 'Pediatric Dentistry',
      oralSurgery: 'Oral Surgery',
      rootCanal: 'Root Canal',
      teethWhitening: 'Teeth Whitening',
      ourVision: 'Our Vision',
      visionText: 'To be the leading dental care provider, recognized for excellence in patient care, innovative treatments, and creating beautiful, healthy smiles that last a lifetime.',
      ourMission: 'Our Mission',
      missionText: 'To deliver exceptional dental care using the latest technology while maintaining a warm, welcoming environment where patients feel comfortable and confident in their treatment.',
      readyToTransform: 'Ready to Transform Your Smile?',
      ctaText: 'Book your consultation today and take the first step towards a healthier, more confident you.',
      scheduleAppointment: 'Schedule Your Appointment'
    },
    
    // Who We Are Page
    whoWeAre: {
      title: 'Who We Are',
      subtitle: 'A team of passionate dental professionals dedicated to your smile',
      ourStory: 'Our Story',
      storyText: 'Founded in 2006, Canine Clinic has grown from a small practice to a comprehensive dental care center, serving over 15,000 satisfied patients. Our journey has been driven by a simple mission: to provide world-class dental care in a comfortable, welcoming environment.',
      meetTeam: 'Meet Our Team',
      teamSubtitle: 'Expert professionals committed to your dental health',
      ourValues: 'Our Values',
      valuesSubtitle: 'The principles that guide everything we do',
      excellence: 'Excellence',
      excellenceDesc: 'We strive for the highest standards in every treatment we provide.',
      innovation: 'Innovation',
      innovationDesc: 'Embracing the latest technology and advanced dental techniques.',
      compassion: 'Compassion',
      compassionDesc: 'Your comfort and wellbeing are always our top priority.',
      integrity: 'Integrity',
      integrityDesc: 'Honest, transparent, and ethical in everything we do.',
      yearsExperience: 'Years of Experience',
      happyPatients: 'Happy Patients',
      expertSpecialists: 'Expert Specialists',
      patientSatisfaction: 'Patient Satisfaction',
      missionStatement: 'Our commitment is to transform lives through exceptional dental care, one smile at a time.'
    },
    
    // Team Members
    team: {
      drAbdulrahman: {
        name: 'Dr. Abdulrahman Mohamed El-Beltagy',
        role: 'Orthodontist',
        specialty: 'Teeth & Jaw Alignment',
        description: 'Specialized in teeth and jaw alignment to achieve a healthy, harmonious smile.'
      },
      drMuhannad: {
        name: 'Dr. Muhannad Abdulwahab',
        role: 'Oral Surgeon & Implantologist',
        specialty: 'Oral Surgery & Dental Implants',
        description: 'Provides oral and maxillofacial surgery and dental implant services to ensure teeth stability and oral health.'
      },
      drSalem: {
        name: 'Dr. Salem Amin',
        role: 'Prosthodontist',
        specialty: 'Dental Prosthetics & Restorations',
        description: 'Expert in dental prosthetics and restorations to maintain oral function and natural appearance.'
      },
      drAhmed: {
        name: 'Dr. Ahmed Hamdy',
        role: 'Cosmetic Dentistry Specialist',
        specialty: 'Cosmetic Fillings & Smile Design',
        description: 'Provides cosmetic filling solutions to correct minor defects and enhance teeth appearance and patient smile.'
      },
      drOmar: {
        name: 'Dr. Omar Nader',
        role: 'Endodontist',
        specialty: 'Root Canal Treatment',
        description: 'Specialized in root canal treatment to preserve natural teeth and prevent extraction or decay.'
      },
      drAya: {
        name: 'Dr. Aya',
        role: 'General & Restorative Dentist',
        specialty: 'Root Canal, Prosthetics & Cosmetic Fillings',
        description: 'Provides root canal treatments, dental prosthetics, and cosmetic fillings with a focus on patient care.'
      }
    },

    // Services Page
    services: {
      title: 'Our Services',
      subtitle: 'Comprehensive dental solutions tailored to your unique needs, delivered with precision and care',
      generalDentistry: 'General Dentistry',
      generalDesc: 'Comprehensive care for your daily dental needs',
      cosmeticDentistry: 'Cosmetic Dentistry',
      cosmeticDesc: 'Transform your smile with aesthetic treatments',
      restorativeDentistry: 'Restorative Dentistry',
      restorativeDesc: 'Restore function and beauty to damaged teeth',
      orthodontics: 'Orthodontics',
      orthodonticsDesc: 'Straighten your teeth for a perfect smile',
      pediatricDentistry: 'Pediatric Dentistry',
      pediatricDesc: "Specialized care for children's dental health",
      advancedProcedures: 'Advanced Procedures',
      advancedDesc: 'Cutting-edge treatments for complex cases',
      // Service items
      regularCheckups: 'Regular Check-ups & Cleaning',
      dentalFillings: 'Dental Fillings',
      toothExtractions: 'Tooth Extractions',
      periodontalTreatment: 'Periodontal Treatment',
      fluorideTreatment: 'Fluoride Treatment',
      dentalSealants: 'Dental Sealants',
      teethWhitening: 'Teeth Whitening',
      porcelainVeneers: 'Porcelain Veneers',
      dentalBonding: 'Dental Bonding',
      smileMakeover: 'Smile Makeover',
      gumContouring: 'Gum Contouring',
      compositeFillings: 'Composite Fillings',
      dentalCrowns: 'Dental Crowns & Bridges',
      dentalImplants: 'Dental Implants',
      dentures: 'Dentures',
      inlaysOnlays: 'Inlays & Onlays',
      fullMouthReconstruction: 'Full Mouth Reconstruction',
      implantDentures: 'Implant-Supported Dentures',
      traditionalBraces: 'Traditional Braces',
      clearAligners: 'Clear Aligners',
      invisalign: 'Invisalign',
      retainers: 'Retainers',
      earlyOrthodontic: 'Early Orthodontic Treatment',
      adultOrthodontics: 'Adult Orthodontics',
      childrenExams: "Children's Dental Exams",
      preventiveCare: 'Preventive Care',
      cavityTreatment: 'Cavity Treatment',
      emergencyCare: 'Emergency Dental Care',
      rootCanalTherapy: 'Root Canal Therapy',
      wisdomTeeth: 'Wisdom Teeth Removal',
      boneGrafting: 'Bone Grafting',
      sinusLift: 'Sinus Lift',
      allOn4: 'All-on-4 Implants',
      laserDentistry: 'Laser Dentistry',
      technologies: 'Our Technologies',
      techSubtitle: 'Advanced equipment for superior results',
      digitalImaging: '3D Digital Imaging',
      digitalImagingDesc: 'Advanced imaging for precise diagnostics',
      laserDentistryTech: 'Laser Dentistry',
      laserDesc: 'Minimally invasive treatments',
      cadCam: 'CAD/CAM Technology',
      cadCamDesc: 'Same-day dental restorations',
      sedation: 'Sedation Options',
      sedationDesc: 'Comfortable, anxiety-free treatments',
      ctaTitle: 'Ready to Get Started?',
      ctaText: 'Schedule your consultation and discover the right treatment for you'
    },
    
    // Dental Tourism Page
    dentalTourism: {
      title: 'Dental Tourism',
      subtitle: 'Experience world-class dental care while enjoying a memorable vacation. Quality treatment at affordable prices.',
      whyChoose: 'Why Choose Dental Tourism?',
      whyChooseSubtitle: 'Discover the advantages of combining dental care with travel',
      costSavings: 'Cost Savings',
      costSavingsDesc: 'Save up to 70% on dental procedures compared to Western countries',
      worldClassCare: 'World-Class Care',
      worldClassCareDesc: 'International standards with state-of-the-art facilities',
      noWaiting: 'No Waiting Time',
      noWaitingDesc: 'Get immediate treatment without long waiting lists',
      vacationTreatment: 'Vacation & Treatment',
      vacationTreatmentDesc: 'Combine dental care with a relaxing vacation',
      howItWorks: 'How It Works',
      howItWorksSubtitle: 'Your journey to a perfect smile in 4 simple steps',
      consultation: 'Consultation',
      consultationDesc: 'Contact us with your dental needs and receive a free quote',
      planning: 'Planning',
      planningDesc: 'We help arrange your travel, accommodation, and treatment schedule',
      treatment: 'Treatment',
      treatmentDesc: 'Receive world-class dental care from our experienced team',
      followUp: 'Follow-Up',
      followUpDesc: 'Continue support and care even after you return home',
      packages: 'Our Packages',
      packagesSubtitle: 'Choose the package that suits your needs',
      smileMakeoverPackage: 'Smile Makeover Package',
      implantPackage: 'Dental Implant Package',
      restorationPackage: 'Complete Restoration Package',
      days: 'days',
      mostPopular: 'Most Popular',
      getFreeQuote: 'Get Free Quote',
      ctaTitle: 'Start Your Dental Tourism Journey',
      ctaText: "Contact us today for a free consultation and personalized quote"
    },
    
    // Testimonials Page
    testimonials: {
      title: 'Patient Testimonials',
      subtitle: 'Real stories from real patients who have experienced the Canine Clinic difference',
      whatPatientsSay: 'What Our Patients Say',
      whatPatientsSaySubtitle: 'Discover why patients choose Canine Clinic for their dental care',
      happyPatients: 'Happy Patients',
      averageRating: 'Average Rating',
      satisfactionRate: 'Satisfaction Rate',
      fiveStarReviews: '5-Star Reviews',
      videoTestimonials: 'Video Testimonials',
      videoSubtitle: 'Watch real patient experiences',
      ctaTitle: 'Ready to Share Your Success Story?',
      ctaText: 'Join thousands of satisfied patients who have transformed their smiles with Canine Clinic'
    },
    
    // Portfolio Page
    portfolio: {
      title: 'Our Portfolio',
      subtitle: 'See the amazing transformations we have achieved for our patients',
      filterAll: 'All',
      filterImplants: 'Implants',
      filterVeneers: 'Veneers',
      filterWhitening: 'Whitening',
      filterOrthodontics: 'Orthodontics',
      filterRestoration: 'Restoration',
      before: 'Before',
      after: 'After',
      duration: 'Duration',
      viewDetails: 'View Details',
      ctaTitle: 'Want Similar Results?',
      ctaText: 'Schedule your consultation and start your transformation journey'
    },
    
    // Contact Page
    contact: {
      title: 'Get In Touch',
      subtitle: "Schedule your appointment or ask us any questions. We're here to help!",
      bookAppointment: 'Book an Appointment',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone Number',
      serviceInterested: 'Service Interested In',
      selectService: 'Select a service',
      generalDentistry: 'General Dentistry',
      cosmeticDentistry: 'Cosmetic Dentistry',
      orthodontics: 'Orthodontics',
      dentalImplants: 'Dental Implants',
      dentalTourism: 'Dental Tourism',
      message: 'Message',
      sendMessage: 'Send Message',
      ourBranches: 'Our Branches',
      mainBranch: 'Main Branch',
      shoroukBranch: 'El Shorouk Branch',
      viewOnMaps: 'View on Google Maps',
      officeHours: 'Office Hours',
      findUs: 'Find Us',
      findUsSubtitle: 'Visit us at any of our convenient locations'
    },
    
    // Footer
    footer: {
      description: 'Our goal is to provide our patients with the best dental care in a comfortable environment, using the latest technology and techniques.',
      usefulLinks: 'Useful Links',
      ourServices: 'Our Services',
      ourBranches: 'Our Branches',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      allRightsReserved: 'All rights reserved.',
      viewOnMaps: 'View on Google Maps',
      mainBranch: 'Main Branch',
      shoroukBranch: 'El Shorouk Branch',
      nasrCityAddress: 'Nasr City, Cairo',
      shoroukAddress: 'The Edge Mall, El Shorouk City, Cairo',
      services: {
        veneers: 'Veneers',
        implants: 'Dental Implants',
        orthodontics: 'Orthodontics',
        whitening: 'Teeth Whitening',
        laser: 'Laser Dentistry'
      }
    },
    
    // Common
    common: {
      learnMore: 'Learn More',
      bookNow: 'Book Now',
      bookAppointment: 'Book Appointment',
      contactUs: 'Contact Us',
      readMore: 'Read More',
      viewAll: 'View All',
      backToHome: 'Back to Home'
    }
  },
  
  ar: {
    // Navbar
    nav: {
      home: 'الرئيسية',
      whoWeAre: 'من نحن',
      aboutUs: 'من نحن',
      services: 'خدماتنا',
      dentalTourism: 'السياحة العلاجية',
      testimonials: 'آراء المرضى',
      portfolio: 'أعمالنا',
      contact: 'اتصل بنا',
      bookAppointment: 'احجز موعد'
    },
    
    // Home Page
    home: {
      heroTitle: 'ابتسامتك،',
      heroWords: ['شغفنا', 'أولويتنا', 'وعدنا'],
      heroSubtitle: 'استمتع برعاية أسنان عالمية المستوى مع أحدث التقنيات وفريق متعاطف مكرس لابتسامتك المثالية.',
      bookConsultation: 'احجز استشارة مجانية',
      viewServices: 'عرض الخدمات',
      whyChooseUs: 'لماذا تختارنا',
      whyChooseUsSubtitle: 'اكتشف الفرق مع نهجنا المتمحور حول المريض',
      expertTeam: 'فريق خبير',
      expertTeamDesc: 'أطباء متخصصون معتمدون بسنوات من الخبرة',
      modernTechnology: 'تقنية حديثة',
      modernTechnologyDesc: 'أحدث المعدات لعلاجات دقيقة',
      patientComfort: 'راحة المريض',
      patientComfortDesc: 'بيئة مريحة مع خيارات التخدير',
      aboutClinic: 'عن كانين كلينك',
      aboutText: 'في كانين كلينك، نحن ملتزمون بتقديم خدمات رعاية أسنان استثنائية في بيئة ترحيبية ومهنية. مع أكثر من 20 عامًا من الخبرة، يضمن التزامنا بالتعلم المستمر حصول مرضانا على أحدث العلاجات المتاحة.',
      learnMore: 'اعرف المزيد عنا',
      yearsExperience: 'سنوات الخبرة',
      happyPatients: 'مريض سعيد',
      expertDoctors: 'طبيب خبير',
      ourServices: 'خدماتنا',
      servicesSubtitle: 'حلول أسنان شاملة لكل احتياج',
      generalDentistry: 'طب الأسنان العام',
      cosmeticDentistry: 'طب الأسنان التجميلي',
      dentalImplants: 'زراعة الأسنان',
      orthodontics: 'تقويم الأسنان',
      pediatricDentistry: 'طب أسنان الأطفال',
      oralSurgery: 'جراحة الفم',
      rootCanal: 'علاج الجذور',
      teethWhitening: 'تبييض الأسنان',
      ourVision: 'رؤيتنا',
      visionText: 'أن نكون المزود الرائد لرعاية الأسنان، معترف بنا للتميز في رعاية المرضى والعلاجات المبتكرة وإنشاء ابتسامات جميلة وصحية تدوم مدى الحياة.',
      ourMission: 'مهمتنا',
      missionText: 'تقديم رعاية أسنان استثنائية باستخدام أحدث التقنيات مع الحفاظ على بيئة دافئة ومرحبة يشعر فيها المرضى بالراحة والثقة في علاجهم.',
      readyToTransform: 'هل أنت مستعد لتغيير ابتسامتك؟',
      ctaText: 'احجز استشارتك اليوم واتخذ الخطوة الأولى نحو صحة أفضل وثقة أكبر.',
      scheduleAppointment: 'حدد موعدك'
    },
    
    // Who We Are Page
    whoWeAre: {
      title: 'من نحن',
      subtitle: 'فريق من أخصائيي الأسنان المتحمسين المكرسين لابتسامتك',
      ourStory: 'قصتنا',
      storyText: 'تأسست كانين كلينك في عام 2006، ونمت من عيادة صغيرة إلى مركز شامل لرعاية الأسنان، يخدم أكثر من 15,000 مريض راضٍ. كانت رحلتنا مدفوعة بمهمة بسيطة: تقديم رعاية أسنان عالمية المستوى في بيئة مريحة ومرحبة.',
      meetTeam: 'تعرف على فريقنا',
      teamSubtitle: 'متخصصون خبراء ملتزمون بصحة أسنانك',
      ourValues: 'قيمنا',
      valuesSubtitle: 'المبادئ التي توجه كل ما نقوم به',
      excellence: 'التميز',
      excellenceDesc: 'نسعى لأعلى المعايير في كل علاج نقدمه.',
      innovation: 'الابتكار',
      innovationDesc: 'تبني أحدث التقنيات وتقنيات طب الأسنان المتقدمة.',
      compassion: 'التعاطف',
      compassionDesc: 'راحتك ورفاهيتك هي دائمًا أولويتنا القصوى.',
      integrity: 'النزاهة',
      integrityDesc: 'صادقون وشفافون وأخلاقيون في كل ما نفعله.',
      yearsExperience: 'سنوات الخبرة',
      happyPatients: 'مريض سعيد',
      expertSpecialists: 'أخصائي خبير',
      patientSatisfaction: 'رضا المرضى',
      missionStatement: 'التزامنا هو تغيير الحياة من خلال رعاية أسنان استثنائية، ابتسامة واحدة في كل مرة.'
    },
    
    // Team Members
    team: {
      drAbdulrahman: {
        name: 'د. عبدالرحمن محمد البلتاجي',
        role: 'أخصائي تقويم الأسنان',
        specialty: 'محاذاة الأسنان والفك',
        description: 'متخصص في محاذاة الأسنان والفك لتحقيق ابتسامة صحية ومتناسقة.'
      },
      drMuhannad: {
        name: 'د. مهند عبدالوهاب',
        role: 'جراح فم وأخصائي زراعة',
        specialty: 'جراحة الفم وزراعة الأسنان',
        description: 'يقدم خدمات جراحة الفم والوجه والفكين وزراعة الأسنان لضمان استقرار الأسنان وصحة الفم.'
      },
      drSalem: {
        name: 'د. سالم أمين',
        role: 'أخصائي تركيبات الأسنان',
        specialty: 'تركيبات الأسنان والترميمات',
        description: 'خبير في تركيبات الأسنان والترميمات للحفاظ على وظيفة الفم ومظهره الطبيعي.'
      },
      drAhmed: {
        name: 'د. أحمد حمدي',
        role: 'أخصائي طب الأسنان التجميلي',
        specialty: 'الحشوات التجميلية وتصميم الابتسامة',
        description: 'يقدم حلول الحشوات التجميلية لتصحيح العيوب الطفيفة وتحسين شكل الأسنان وابتسامة المريض.'
      },
      drOmar: {
        name: 'د. عمر نادر',
        role: 'أخصائي علاج الجذور',
        specialty: 'علاج قناة الجذر',
        description: 'متخصص في علاج قناة الجذر للحفاظ على الأسنان الطبيعية ومنع الخلع أو التسوس.'
      },
      drAya: {
        name: 'د. آية',
        role: 'طبيبة أسنان عامة وترميمية',
        specialty: 'علاج الجذور والتركيبات والحشوات التجميلية',
        description: 'تقدم علاجات قناة الجذر وتركيبات الأسنان والحشوات التجميلية مع التركيز على رعاية المرضى.'
      }
    },
    
    // Services Page
    services: {
      title: 'خدماتنا',
      subtitle: 'حلول أسنان شاملة مصممة لاحتياجاتك الفريدة، تُقدم بدقة وعناية',
      generalDentistry: 'طب الأسنان العام',
      generalDesc: 'رعاية شاملة لاحتياجات أسنانك اليومية',
      cosmeticDentistry: 'طب الأسنان التجميلي',
      cosmeticDesc: 'حوّل ابتسامتك مع العلاجات التجميلية',
      restorativeDentistry: 'طب الأسنان الترميمي',
      restorativeDesc: 'استعد الوظيفة والجمال للأسنان التالفة',
      orthodontics: 'تقويم الأسنان',
      orthodonticsDesc: 'قوّم أسنانك للحصول على ابتسامة مثالية',
      pediatricDentistry: 'طب أسنان الأطفال',
      pediatricDesc: 'رعاية متخصصة لصحة أسنان الأطفال',
      advancedProcedures: 'الإجراءات المتقدمة',
      advancedDesc: 'علاجات متطورة للحالات المعقدة',
      regularCheckups: 'الفحوصات الدورية والتنظيف',
      dentalFillings: 'حشوات الأسنان',
      toothExtractions: 'خلع الأسنان',
      periodontalTreatment: 'علاج اللثة',
      fluorideTreatment: 'علاج الفلورايد',
      dentalSealants: 'مانعات التسرب السنية',
      teethWhitening: 'تبييض الأسنان',
      porcelainVeneers: 'قشور البورسلين',
      dentalBonding: 'لصق الأسنان',
      smileMakeover: 'تجميل الابتسامة',
      gumContouring: 'تحديد اللثة',
      compositeFillings: 'الحشوات المركبة',
      dentalCrowns: 'التيجان والجسور',
      dentalImplants: 'زراعة الأسنان',
      dentures: 'أطقم الأسنان',
      inlaysOnlays: 'الحشوات الداخلية والخارجية',
      fullMouthReconstruction: 'إعادة بناء الفم الكامل',
      implantDentures: 'أطقم الأسنان المدعومة بالزرعات',
      traditionalBraces: 'التقويم التقليدي',
      clearAligners: 'المقومات الشفافة',
      invisalign: 'إنفزلاين',
      retainers: 'المثبتات',
      earlyOrthodontic: 'علاج تقويم مبكر',
      adultOrthodontics: 'تقويم الأسنان للبالغين',
      childrenExams: 'فحوصات أسنان الأطفال',
      preventiveCare: 'الرعاية الوقائية',
      cavityTreatment: 'علاج التسوس',
      emergencyCare: 'رعاية طوارئ الأسنان',
      rootCanalTherapy: 'علاج قناة الجذر',
      wisdomTeeth: 'خلع ضرس العقل',
      boneGrafting: 'ترقيع العظام',
      sinusLift: 'رفع الجيوب الأنفية',
      allOn4: 'زراعة الكل على أربع',
      laserDentistry: 'طب الأسنان بالليزر',
      technologies: 'تقنياتنا',
      techSubtitle: 'معدات متقدمة لنتائج متفوقة',
      digitalImaging: 'التصوير الرقمي ثلاثي الأبعاد',
      digitalImagingDesc: 'تصوير متقدم للتشخيص الدقيق',
      laserDentistryTech: 'طب الأسنان بالليزر',
      laserDesc: 'علاجات طفيفة التوغل',
      cadCam: 'تقنية CAD/CAM',
      cadCamDesc: 'ترميمات الأسنان في نفس اليوم',
      sedation: 'خيارات التخدير',
      sedationDesc: 'علاجات مريحة خالية من القلق',
      ctaTitle: 'هل أنت مستعد للبدء؟',
      ctaText: 'حدد موعد استشارتك واكتشف العلاج المناسب لك'
    },
    
    // Dental Tourism Page
    dentalTourism: {
      title: 'السياحة العلاجية',
      subtitle: 'استمتع برعاية أسنان عالمية المستوى أثناء الاستمتاع بعطلة لا تُنسى. علاج عالي الجودة بأسعار معقولة.',
      whyChoose: 'لماذا تختار السياحة العلاجية؟',
      whyChooseSubtitle: 'اكتشف مزايا الجمع بين رعاية الأسنان والسفر',
      costSavings: 'توفير التكاليف',
      costSavingsDesc: 'وفر حتى 70% على إجراءات الأسنان مقارنة بالدول الغربية',
      worldClassCare: 'رعاية عالمية المستوى',
      worldClassCareDesc: 'معايير دولية مع مرافق متطورة',
      noWaiting: 'لا وقت انتظار',
      noWaitingDesc: 'احصل على العلاج الفوري دون قوائم انتظار طويلة',
      vacationTreatment: 'عطلة وعلاج',
      vacationTreatmentDesc: 'اجمع بين رعاية الأسنان وعطلة مريحة',
      howItWorks: 'كيف يعمل',
      howItWorksSubtitle: 'رحلتك إلى ابتسامة مثالية في 4 خطوات بسيطة',
      consultation: 'الاستشارة',
      consultationDesc: 'تواصل معنا بشأن احتياجات أسنانك واحصل على عرض أسعار مجاني',
      planning: 'التخطيط',
      planningDesc: 'نساعد في ترتيب سفرك وإقامتك وجدول العلاج',
      treatment: 'العلاج',
      treatmentDesc: 'احصل على رعاية أسنان عالمية المستوى من فريقنا ذو الخبرة',
      followUp: 'المتابعة',
      followUpDesc: 'استمر في الحصول على الدعم والرعاية حتى بعد عودتك للوطن',
      packages: 'باقاتنا',
      packagesSubtitle: 'اختر الباقة التي تناسب احتياجاتك',
      smileMakeoverPackage: 'باقة تجميل الابتسامة',
      implantPackage: 'باقة زراعة الأسنان',
      restorationPackage: 'باقة الترميم الكامل',
      days: 'أيام',
      mostPopular: 'الأكثر شيوعًا',
      getFreeQuote: 'احصل على عرض أسعار مجاني',
      ctaTitle: 'ابدأ رحلة السياحة العلاجية',
      ctaText: 'تواصل معنا اليوم للحصول على استشارة مجانية وعرض أسعار مخصص'
    },
    
    // Testimonials Page
    testimonials: {
      title: 'آراء المرضى',
      subtitle: 'قصص حقيقية من مرضى حقيقيين عاشوا تجربة كانين كلينك المتميزة',
      whatPatientsSay: 'ماذا يقول مرضانا',
      whatPatientsSaySubtitle: 'اكتشف لماذا يختار المرضى كانين كلينك لرعاية أسنانهم',
      happyPatients: 'مريض سعيد',
      averageRating: 'متوسط التقييم',
      satisfactionRate: 'معدل الرضا',
      fiveStarReviews: 'تقييم 5 نجوم',
      videoTestimonials: 'شهادات الفيديو',
      videoSubtitle: 'شاهد تجارب المرضى الحقيقية',
      ctaTitle: 'هل أنت مستعد لمشاركة قصة نجاحك؟',
      ctaText: 'انضم إلى آلاف المرضى الراضين الذين حولوا ابتساماتهم مع كانين كلينك'
    },
    
    // Portfolio Page
    portfolio: {
      title: 'أعمالنا',
      subtitle: 'شاهد التحولات المذهلة التي حققناها لمرضانا',
      filterAll: 'الكل',
      filterImplants: 'زراعة',
      filterVeneers: 'قشور',
      filterWhitening: 'تبييض',
      filterOrthodontics: 'تقويم',
      filterRestoration: 'ترميم',
      before: 'قبل',
      after: 'بعد',
      duration: 'المدة',
      viewDetails: 'عرض التفاصيل',
      ctaTitle: 'تريد نتائج مماثلة؟',
      ctaText: 'حدد موعد استشارتك وابدأ رحلة التحول'
    },
    
    // Contact Page
    contact: {
      title: 'تواصل معنا',
      subtitle: 'حدد موعدك أو اسألنا أي أسئلة. نحن هنا للمساعدة!',
      bookAppointment: 'احجز موعد',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      serviceInterested: 'الخدمة المطلوبة',
      selectService: 'اختر خدمة',
      generalDentistry: 'طب الأسنان العام',
      cosmeticDentistry: 'طب الأسنان التجميلي',
      orthodontics: 'تقويم الأسنان',
      dentalImplants: 'زراعة الأسنان',
      dentalTourism: 'السياحة العلاجية',
      message: 'الرسالة',
      sendMessage: 'إرسال الرسالة',
      ourBranches: 'فروعنا',
      mainBranch: 'الفرع الرئيسي',
      shoroukBranch: 'فرع الشروق',
      viewOnMaps: 'عرض على خرائط جوجل',
      officeHours: 'ساعات العمل',
      findUs: 'موقعنا',
      findUsSubtitle: 'قم بزيارتنا في أي من مواقعنا المريحة'
    },
    
    // Footer
    footer: {
      description: 'هدفنا هو تقديم أفضل رعاية للأسنان لمرضانا في بيئة مريحة، باستخدام أحدث التقنيات والتقنيات.',
      usefulLinks: 'روابط مفيدة',
      ourServices: 'خدماتنا',
      ourBranches: 'فروعنا',
      privacyPolicy: 'سياسة الخصوصية',
      termsOfService: 'شروط الخدمة',
      allRightsReserved: 'جميع الحقوق محفوظة.',
      viewOnMaps: 'عرض على خرائط جوجل',
      mainBranch: 'الفرع الرئيسي',
      shoroukBranch: 'فرع الشروق',
      nasrCityAddress: 'مدينة نصر، القاهرة',
      shoroukAddress: 'ذا إيدج مول، مدينة الشروق، القاهرة',
      services: {
        veneers: 'الفينير',
        implants: 'زراعة الأسنان',
        orthodontics: 'تقويم الأسنان',
        whitening: 'تبييض الأسنان',
        laser: 'طب الأسنان بالليزر'
      }
    },
    
    // Common
    common: {
      learnMore: 'اعرف المزيد',
      bookNow: 'احجز الآن',
      bookAppointment: 'احجز موعد',
      contactUs: 'اتصل بنا',
      readMore: 'اقرأ المزيد',
      viewAll: 'عرض الكل',
      backToHome: 'العودة للرئيسية'
    }
  }
};

export default LanguageContext;
