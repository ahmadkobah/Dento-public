/**
 * NewTenantWizard.jsx
 * 
 * Wizard component for setting up a new tenant's website.
 * Handles template selection, branding, and initial page generation.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Palette, 
  Layout, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Image,
  Type,
  Loader2,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Wizard steps
const STEPS = [
  { id: 'template', label: 'Choose Template', icon: Layout },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'contact', label: 'Contact Info', icon: Phone },
  { id: 'review', label: 'Review & Create', icon: CheckCircle }
];

// Default templates (will be loaded from DB)
const DEFAULT_TEMPLATES = [
  {
    slug: 'modern-dental-home',
    name: 'Modern Dental',
    description: 'Clean, modern design perfect for dental clinics',
    style: 'modern',
    preview: '/templates/modern-dental.png'
  },
  {
    slug: 'classic-medical-home',
    name: 'Classic Medical',
    description: 'Traditional professional medical practice design',
    style: 'classic',
    preview: '/templates/classic-medical.png'
  },
  {
    slug: 'minimal-dental-home',
    name: 'Minimal',
    description: 'Simple and clean with focus on content',
    style: 'minimal',
    preview: '/templates/minimal-dental.png'
  }
];

/**
 * NewTenantWizard Component
 */
export const NewTenantWizard = ({ tenantId, onComplete, onCancel }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [bundles, setBundles] = useState({});
  const [error, setError] = useState(null);

  // Wizard state
  const [wizardData, setWizardData] = useState({
    // Template
    selectedTemplate: 'modern-dental-home',
    selectedBundle: null, // bundle slug, if user picks a bundle instead
    
    // Branding
    clinicName_en: '',
    clinicName_ar: '',
    tagline_en: '',
    tagline_ar: '',
    primaryColor: '#0066CC',
    secondaryColor: '#333333',
    accentColor: '#FF6600',
    logoUrl: null,
    faviconUrl: null,
    
    // Contact
    email: '',
    phone: '',
    whatsapp: '',
    address_en: '',
    address_ar: '',
    
    // Social
    facebook: '',
    instagram: '',
    twitter: '',
    
    // Working hours
    workingHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '14:00', closed: false },
      sunday: { open: null, close: null, closed: true }
    }
  });

  // Load page templates from database
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('page_templates')
          .select('*')
          .eq('is_active', true);
        
        if (error) throw error;
        if (data && data.length > 0) {
          // Landing templates for individual selection
          const landingTemplates = data.filter(t => t.category === 'landing');
          if (landingTemplates.length > 0) {
            setTemplates(landingTemplates.map(t => ({
              slug: t.slug,
              name: t.name,
              description: t.description,
              style: t.default_settings?.style || 'modern',
              preview: t.thumbnail_url || `/templates/${t.slug}.png`
            })));
          }

          // Group into bundles
          const bundleMap = data.reduce((acc, t) => {
            if (t.bundle_slug) {
              if (!acc[t.bundle_slug]) {
                acc[t.bundle_slug] = {
                  slug: t.bundle_slug,
                  name: t.bundle_name || t.bundle_slug,
                  description: t.bundle_description || '',
                  thumbnail: t.bundle_thumbnail_url,
                  templates: [],
                };
              }
              acc[t.bundle_slug].templates.push(t);
            }
            return acc;
          }, {});
          setBundles(bundleMap);
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
        // Use default templates
      }
    };
    
    loadTemplates();
  }, []);

  // Update wizard data
  const updateData = (updates) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Complete wizard and create pages
  const completeWizard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create/update website settings
      const { error: settingsError } = await supabase
        .from('website_settings')
        .upsert({
          tenant_id: tenantId,
          primary_color: wizardData.primaryColor,
          secondary_color: wizardData.secondaryColor,
          accent_color: wizardData.accentColor,
          logo_light_url: wizardData.logoUrl,
          favicon_url: wizardData.faviconUrl,
          contact_email: wizardData.email,
          contact_phone: wizardData.phone,
          contact_whatsapp: wizardData.whatsapp,
          address_en: wizardData.address_en,
          address_ar: wizardData.address_ar,
          social_facebook: wizardData.facebook,
          social_instagram: wizardData.instagram,
          social_twitter: wizardData.twitter,
          working_hours: wizardData.workingHours
        }, { onConflict: 'tenant_id' });

      if (settingsError) throw settingsError;

      // 2. Get selected template
      const { data: _template, error: templateError } = await supabase
        .from('page_templates')
        .select('*')
        .eq('slug', wizardData.selectedTemplate)
        .single();

      if (templateError) throw templateError;

      // 3. Create pages from template
      const pagesToCreate = [
        { slug: 'home', title_en: 'Home', title_ar: 'الرئيسية', is_homepage: true, template_slug: wizardData.selectedTemplate },
        { slug: 'services', title_en: 'Services', title_ar: 'الخدمات', template_slug: 'modern-dental-services' },
        { slug: 'about', title_en: 'About Us', title_ar: 'من نحن', template_slug: 'modern-dental-about' },
        { slug: 'contact', title_en: 'Contact', title_ar: 'تواصل معنا', template_slug: 'modern-dental-contact' },
        { slug: 'book', title_en: 'Book Appointment', title_ar: 'احجز موعد', template_slug: 'modern-dental-booking' }
      ];

      for (const page of pagesToCreate) {
        // Get page template
        const { data: pageTemplate } = await supabase
          .from('page_templates')
          .select('*')
          .eq('slug', page.template_slug)
          .single();

        // Build page structure from template sections
        let structure = [];
        let content = {};

        if (pageTemplate?.sections) {
          const sectionRefs = typeof pageTemplate.sections === 'string' 
            ? JSON.parse(pageTemplate.sections) 
            : pageTemplate.sections;

          for (const sectionRef of sectionRefs) {
            const { data: sectionTemplate } = await supabase
              .from('section_templates')
              .select('*')
              .eq('slug', sectionRef.template_slug)
              .single();

            if (sectionTemplate) {
              const sectionId = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              // Parse structure and content
              const sectionStructure = typeof sectionTemplate.structure === 'string'
                ? JSON.parse(sectionTemplate.structure)
                : sectionTemplate.structure;
              
              const sectionContent = typeof sectionTemplate.default_content === 'string'
                ? JSON.parse(sectionTemplate.default_content)
                : sectionTemplate.default_content;

              structure.push({
                id: sectionId,
                ...sectionStructure,
                locked: sectionRef.locked || false
              });

              // Apply content overrides and clinic name
              let finalContent = { ...sectionContent };
              if (sectionRef.content_override) {
                finalContent = { ...finalContent, ...sectionRef.content_override };
              }
              
              // Replace placeholders with clinic name
              if (finalContent.title_en && wizardData.clinicName_en) {
                finalContent.title_en = finalContent.title_en.replace(
                  /Our Clinic|Your Clinic/gi, 
                  wizardData.clinicName_en
                );
              }
              if (finalContent.title_ar && wizardData.clinicName_ar) {
                finalContent.title_ar = finalContent.title_ar.replace(
                  /عيادتنا/gi, 
                  wizardData.clinicName_ar
                );
              }

              content[sectionId] = finalContent;
            }
          }
        }

        // Create the page
        await supabase.from('pages').upsert({
          tenant_id: tenantId,
          slug: page.slug,
          title_en: page.title_en,
          title_ar: page.title_ar,
          is_homepage: page.is_homepage || false,
          structure,
          content,
          status: 'published',
          show_in_nav: true,
          nav_order: pagesToCreate.indexOf(page),
          nav_label_en: page.title_en,
          nav_label_ar: page.title_ar
        }, { onConflict: 'tenant_id,slug' });
      }

      // 4. Create navigation menus
      const headerMenu = pagesToCreate.map((page, index) => ({
        id: `nav_${page.slug}`,
        label_en: page.title_en,
        label_ar: page.title_ar,
        url: `/${page.slug === 'home' ? '' : page.slug}`,
        order: index
      }));

      await supabase.from('navigation_menus').upsert([
        { tenant_id: tenantId, menu_type: 'header', items: headerMenu },
        { tenant_id: tenantId, menu_type: 'footer', items: headerMenu },
        { tenant_id: tenantId, menu_type: 'mobile', items: headerMenu }
      ], { onConflict: 'tenant_id,menu_type' });

      // Success - call completion handler
      if (onComplete) {
        onComplete(wizardData);
      } else {
        navigate('/developer/website/pages');
      }
    } catch (err) {
      console.error('Wizard error:', err);
      setError(err.message || 'Failed to create website');
    } finally {
      setIsLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'template':
        return <TemplateStep templates={templates} bundles={bundles} data={wizardData} updateData={updateData} />;
      case 'branding':
        return <BrandingStep data={wizardData} updateData={updateData} />;
      case 'contact':
        return <ContactStep data={wizardData} updateData={updateData} />;
      case 'review':
        return <ReviewStep data={wizardData} templates={templates} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Website Setup Wizard</h1>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-green-500 text-white' : 
                        isActive ? 'bg-blue-600 text-white' : 
                        'bg-gray-200 text-gray-500'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`hidden sm:block text-sm font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between">
          <button
            onClick={currentStep === 0 ? onCancel : prevStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>
          
          {currentStep === STEPS.length - 1 ? (
            <button
              onClick={completeWizard}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Website
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Template Selection Step
 */
const TemplateStep = ({ templates, bundles = {}, data, updateData }) => {
  const [mode, setMode] = useState(data.selectedBundle ? 'bundle' : 'template');
  const bundleList = Object.values(bundles);

  const selectBundle = (slug) => {
    updateData({ selectedBundle: slug, selectedTemplate: null });
  };

  const selectTemplate = (slug) => {
    updateData({ selectedTemplate: slug, selectedBundle: null });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose a Template</h2>
        <p className="text-gray-600 mt-1">Select a starting point for your website design</p>
      </div>

      {/* Mode toggle — only show if bundles exist */}
      {bundleList.length > 0 && (
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('bundle')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'bundle'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Template Bundles
          </button>
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'template'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layout className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Individual Templates
          </button>
        </div>
      )}

      {/* Bundle selection */}
      {mode === 'bundle' && bundleList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bundleList.map(bundle => (
            <div
              key={bundle.slug}
              onClick={() => selectBundle(bundle.slug)}
              className={`
                relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all
                ${data.selectedBundle === bundle.slug
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                {bundle.thumbnail ? (
                  <img src={bundle.thumbnail} alt={bundle.name} className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-12 h-12 text-blue-300" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{bundle.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{bundle.description}</p>
                <p className="text-xs text-blue-600 mt-2">
                  {bundle.templates.length} page template{bundle.templates.length !== 1 ? 's' : ''} included
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {bundle.templates.map(t => (
                    <span key={t.slug} className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                      {t.category}
                    </span>
                  ))}
                </div>
              </div>
              {data.selectedBundle === bundle.slug && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white p-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Individual template selection */}
      {mode === 'template' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map(template => (
            <div
              key={template.slug}
              onClick={() => selectTemplate(template.slug)}
              className={`
                relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all
                ${data.selectedTemplate === template.slug
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                {template.preview ? (
                  <img src={template.preview} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <Layout className="w-12 h-12 text-gray-300" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              </div>
              {data.selectedTemplate === template.slug && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white p-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Branding Step
 */
const BrandingStep = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Branding & Identity</h2>
        <p className="text-gray-600 mt-1">Set your clinic name and brand colors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clinic Names */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Name (English)
            </label>
            <input
              type="text"
              value={data.clinicName_en}
              onChange={(e) => updateData({ clinicName_en: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Smile Dental Clinic"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Name (Arabic)
            </label>
            <input
              type="text"
              value={data.clinicName_ar}
              onChange={(e) => updateData({ clinicName_ar: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-right"
              placeholder="مثال: عيادة سمايل لطب الأسنان"
              dir="rtl"
            />
          </div>
        </div>

        {/* Taglines */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tagline (English)
            </label>
            <input
              type="text"
              value={data.tagline_en}
              onChange={(e) => updateData({ tagline_en: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Your Smile, Our Priority"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tagline (Arabic)
            </label>
            <input
              type="text"
              value={data.tagline_ar}
              onChange={(e) => updateData({ tagline_ar: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-right"
              placeholder="مثال: ابتسامتك، أولويتنا"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="pt-6 border-t">
        <h3 className="font-medium text-gray-900 mb-4">Brand Colors</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={data.primaryColor}
                onChange={(e) => updateData({ primaryColor: e.target.value })}
                className="w-12 h-12 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={data.primaryColor}
                onChange={(e) => updateData({ primaryColor: e.target.value })}
                className="flex-1 rounded-lg border-gray-300 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={data.secondaryColor}
                onChange={(e) => updateData({ secondaryColor: e.target.value })}
                className="w-12 h-12 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={data.secondaryColor}
                onChange={(e) => updateData({ secondaryColor: e.target.value })}
                className="flex-1 rounded-lg border-gray-300 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={data.accentColor}
                onChange={(e) => updateData({ accentColor: e.target.value })}
                className="w-12 h-12 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={data.accentColor}
                onChange={(e) => updateData({ accentColor: e.target.value })}
                className="flex-1 rounded-lg border-gray-300 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-6 border-t">
        <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
        <div className="p-6 rounded-xl border bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: data.primaryColor }}
            >
              {data.clinicName_en?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="font-semibold text-lg">{data.clinicName_en || 'Your Clinic Name'}</div>
              <div className="text-sm text-gray-500">{data.tagline_en || 'Your tagline here'}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: data.primaryColor }}
            >
              Primary Button
            </button>
            <button 
              className="px-4 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: data.accentColor }}
            >
              Accent Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Contact Info Step
 */
const ContactStep = ({ data, updateData }) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const updateHours = (day, field, value) => {
    updateData({
      workingHours: {
        ...data.workingHours,
        [day]: {
          ...data.workingHours[day],
          [field]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
        <p className="text-gray-600 mt-1">Add your clinic's contact details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4" /> Email
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="clinic@example.com"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4" /> Phone
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateData({ phone: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+966 50 000 0000"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4" /> WhatsApp
            </label>
            <input
              type="tel"
              value={data.whatsapp}
              onChange={(e) => updateData({ whatsapp: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+966 50 000 0000"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4" /> Address (English)
            </label>
            <textarea
              value={data.address_en}
              onChange={(e) => updateData({ address_en: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="123 Main Street, City, Country"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4" /> Address (Arabic)
            </label>
            <textarea
              value={data.address_ar}
              onChange={(e) => updateData({ address_ar: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-right"
              rows={2}
              placeholder="العنوان بالعربية"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="pt-6 border-t">
        <h3 className="font-medium text-gray-900 mb-4">Social Media (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Facebook</label>
            <input
              type="url"
              value={data.facebook}
              onChange={(e) => updateData({ facebook: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Instagram</label>
            <input
              type="url"
              value={data.instagram}
              onChange={(e) => updateData({ instagram: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm"
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Twitter/X</label>
            <input
              type="url"
              value={data.twitter}
              onChange={(e) => updateData({ twitter: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm"
              placeholder="https://twitter.com/..."
            />
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="pt-6 border-t">
        <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">
          <Clock className="w-4 h-4" /> Working Hours
        </h3>
        <div className="space-y-3">
          {days.map(day => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-28 text-sm font-medium text-gray-700">
                {dayLabels[day]}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!data.workingHours[day].closed}
                  onChange={(e) => updateHours(day, 'closed', !e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-600">Open</span>
              </label>
              {!data.workingHours[day].closed && (
                <>
                  <input
                    type="time"
                    value={data.workingHours[day].open || '09:00'}
                    onChange={(e) => updateHours(day, 'open', e.target.value)}
                    className="rounded-lg border-gray-300 text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={data.workingHours[day].close || '18:00'}
                    onChange={(e) => updateHours(day, 'close', e.target.value)}
                    className="rounded-lg border-gray-300 text-sm"
                  />
                </>
              )}
              {data.workingHours[day].closed && (
                <span className="text-sm text-gray-400">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Review Step
 */
const ReviewStep = ({ data, templates }) => {
  const selectedTemplate = templates.find(t => t.slug === data.selectedTemplate);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Create</h2>
        <p className="text-gray-600 mt-1">Review your settings before creating your website</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template */}
        <div className="p-6 bg-white rounded-xl border">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Layout className="w-4 h-4" /> Template
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center">
              <Layout className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <div className="font-medium">{selectedTemplate?.name || 'Modern Dental'}</div>
              <div className="text-sm text-gray-500">{selectedTemplate?.style || 'modern'} style</div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="p-6 bg-white rounded-xl border">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Branding
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Clinic Name:</span>
              <span className="font-medium">{data.clinicName_en || '-'}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: data.primaryColor }} title="Primary" />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: data.secondaryColor }} title="Secondary" />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: data.accentColor }} title="Accent" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="p-6 bg-white rounded-xl border">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Contact
          </h3>
          <div className="space-y-2 text-sm">
            {data.email && <div className="flex gap-2"><Mail className="w-4 h-4 text-gray-400" /> {data.email}</div>}
            {data.phone && <div className="flex gap-2"><Phone className="w-4 h-4 text-gray-400" /> {data.phone}</div>}
            {data.address_en && <div className="flex gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {data.address_en}</div>}
          </div>
        </div>

        {/* Pages to Create */}
        <div className="p-6 bg-white rounded-xl border">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Pages to Create
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Home</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Services</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> About Us</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Contact</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Book Appointment</div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-blue-800 text-sm">
          <strong>Note:</strong> After creation, you can fully customize all pages, add more content, 
          and adjust any settings from the Website Builder.
        </p>
      </div>
    </div>
  );
};

export default NewTenantWizard;
