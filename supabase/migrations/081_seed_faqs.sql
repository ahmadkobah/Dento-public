-- 081_seed_faqs.sql
-- Seed FAQs table with common dental clinic questions in English and Arabic

-- Helper: get the first tenant_id (Canine Dental Clinic) for seeding
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenants found – skipping FAQ seed';
    RETURN;
  END IF;

  -- General category
  INSERT INTO faqs (tenant_id, question_en, question_ar, answer_en, answer_ar, category, sort_order, is_published) VALUES
  (v_tenant_id,
   'What are your clinic hours?',
   'ما هي ساعات عمل العيادة؟',
   'We are open Sunday through Thursday from 9:00 AM to 8:00 PM, and Saturday from 10:00 AM to 4:00 PM. We are closed on Fridays.',
   'نحن مفتوحون من الأحد إلى الخميس من الساعة 9:00 صباحاً حتى 8:00 مساءً، والسبت من 10:00 صباحاً حتى 4:00 مساءً. نغلق يوم الجمعة.',
   'general', 1, true),

  (v_tenant_id,
   'Do I need to book an appointment?',
   'هل أحتاج إلى حجز موعد؟',
   'Yes, we recommend booking in advance to ensure availability. You can book online through our website or call us directly. We do accommodate walk-ins when possible.',
   'نعم، ننصح بالحجز مسبقاً لضمان التوفر. يمكنك الحجز عبر الإنترنت من خلال موقعنا أو الاتصال بنا مباشرة. نستقبل أيضاً الزيارات بدون موعد عند الإمكان.',
   'general', 2, true),

  (v_tenant_id,
   'Where is your clinic located?',
   'أين تقع العيادة؟',
   'Our clinic is located in the heart of the city with easy access to public transport and ample parking. The exact address is shown on our Contact page.',
   'تقع عيادتنا في قلب المدينة مع سهولة الوصول إلى وسائل النقل العام ومواقف سيارات واسعة. العنوان الدقيق موجود في صفحة اتصل بنا.',
   'general', 3, true),

  -- Treatment category
  (v_tenant_id,
   'What services do you offer?',
   'ما هي الخدمات التي تقدمونها؟',
   'We offer a full range of dental services including general dentistry, cosmetic dentistry (veneers, whitening, smile makeovers), orthodontics, dental implants, root canal treatment, periodontal care, and pediatric dentistry.',
   'نقدم مجموعة كاملة من خدمات طب الأسنان بما في ذلك طب الأسنان العام، وطب الأسنان التجميلي (القشور، التبييض، تجميل الابتسامة)، وتقويم الأسنان، وزراعة الأسنان، وعلاج قناة الجذر، وعلاج اللثة، وطب أسنان الأطفال.',
   'treatment', 4, true),

  (v_tenant_id,
   'Is teeth whitening safe?',
   'هل تبييض الأسنان آمن؟',
   'Yes, professional teeth whitening performed at our clinic is completely safe. We use clinically proven products and techniques. Some patients may experience temporary sensitivity, which usually subsides within a few days.',
   'نعم، تبييض الأسنان الاحترافي الذي يتم في عيادتنا آمن تماماً. نحن نستخدم منتجات وتقنيات مثبتة سريرياً. قد يعاني بعض المرضى من حساسية مؤقتة تختفي عادةً خلال أيام قليلة.',
   'treatment', 5, true),

  (v_tenant_id,
   'How long do dental implants last?',
   'كم تدوم زراعة الأسنان؟',
   'With proper care and regular check-ups, dental implants can last a lifetime. The crown attached to the implant may need replacement after 10-15 years due to normal wear.',
   'مع العناية المناسبة والفحوصات المنتظمة، يمكن أن تدوم زراعة الأسنان مدى الحياة. قد يحتاج التاج المثبت على الزرعة إلى الاستبدال بعد 10-15 سنة بسبب التآكل الطبيعي.',
   'treatment', 6, true),

  (v_tenant_id,
   'Do you offer orthodontic treatment for adults?',
   'هل تقدمون علاج تقويم الأسنان للبالغين؟',
   'Absolutely! We offer several orthodontic options for adults including traditional braces, clear aligners (like Invisalign), and lingual braces. It is never too late to achieve a straighter smile.',
   'بالتأكيد! نقدم عدة خيارات لتقويم الأسنان للبالغين بما في ذلك التقويم التقليدي، والتقويم الشفاف (مثل إنفزلاين)، والتقويم اللساني. لم يفت الأوان أبداً للحصول على ابتسامة مستقيمة.',
   'treatment', 7, true),

  -- Insurance & Payment category
  (v_tenant_id,
   'What payment methods do you accept?',
   'ما هي طرق الدفع المقبولة؟',
   'We accept cash, all major credit and debit cards, and bank transfers. We also offer flexible installment plans for major treatments.',
   'نقبل النقد وجميع بطاقات الائتمان والخصم الرئيسية والتحويلات البنكية. كما نقدم خطط تقسيط مرنة للعلاجات الكبيرة.',
   'insurance', 8, true),

  (v_tenant_id,
   'Do you accept dental insurance?',
   'هل تقبلون تأمين الأسنان؟',
   'Yes, we work with most major insurance providers. Please contact our reception team to verify your specific insurance plan coverage before your visit.',
   'نعم، نتعامل مع معظم شركات التأمين الكبرى. يرجى التواصل مع فريق الاستقبال للتحقق من تغطية خطة التأمين الخاصة بك قبل زيارتك.',
   'insurance', 9, true),

  -- Emergency category
  (v_tenant_id,
   'What should I do in a dental emergency?',
   'ماذا أفعل في حالة طوارئ الأسنان؟',
   'If you experience a dental emergency such as severe pain, a knocked-out tooth, or excessive bleeding, call our emergency line immediately. We reserve time slots each day for emergency appointments.',
   'إذا واجهت حالة طوارئ في الأسنان مثل ألم شديد أو سقوط سن أو نزيف مفرط، اتصل بخط الطوارئ لدينا فوراً. نحن نحجز فترات زمنية كل يوم لمواعيد الطوارئ.',
   'emergency', 10, true),

  (v_tenant_id,
   'Do you handle after-hours emergencies?',
   'هل تتعاملون مع حالات الطوارئ خارج ساعات العمل؟',
   'Yes, we have an after-hours emergency phone line. For life-threatening emergencies, please call emergency services or visit the nearest hospital emergency room first.',
   'نعم، لدينا خط هاتف طوارئ خارج ساعات العمل. في حالات الطوارئ التي تهدد الحياة، يرجى الاتصال بخدمات الطوارئ أو زيارة أقرب غرفة طوارئ في المستشفى أولاً.',
   'emergency', 11, true),

  -- Dental Tourism category
  (v_tenant_id,
   'Do you provide dental tourism packages?',
   'هل تقدمون باقات سياحة الأسنان؟',
   'Yes! We offer comprehensive dental tourism packages including treatment planning, airport pickup, hotel accommodation assistance, and follow-up care coordination. Contact us for a personalized treatment plan and quote.',
   'نعم! نقدم باقات سياحة أسنان شاملة تشمل تخطيط العلاج واستقبال المطار والمساعدة في الإقامة الفندقية وتنسيق الرعاية اللاحقة. تواصل معنا للحصول على خطة علاج وعرض سعر مخصص.',
   'dental_tourism', 12, true),

  (v_tenant_id,
   'How long do I need to stay for dental treatment abroad?',
   'كم أحتاج أن أبقى لعلاج الأسنان في الخارج؟',
   'The duration depends on the treatment plan. Simple procedures like whitening or veneers may take 3-5 days. Implant procedures typically require two visits: 3-5 days for placement and a return visit after 3-6 months for the crown.',
   'تعتمد المدة على خطة العلاج. الإجراءات البسيطة مثل التبييض أو القشور قد تستغرق 3-5 أيام. إجراءات الزراعة تتطلب عادةً زيارتين: 3-5 أيام للتركيب وزيارة عودة بعد 3-6 أشهر للتاج.',
   'dental_tourism', 13, true);

END $$;
