import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ooxikkllencozgnoparw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGlra2xsZW5jb3pnbm9wYXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwNzQ1NywiZXhwIjoyMDg1MTgzNDU3fQ.lCe-Q9-4t1wfs2PnoNiLTm01lOzrl2YwrmdyUqf5IaE'
);

const templates = [
  {
    name_en: 'General Treatment Consent',
    name_ar: 'إقرار موافقة على العلاج السني',
    procedure_type: 'general',
    description_en: 'Standard informed consent for general dental procedures including examinations, cleanings, fillings, and routine treatments.',
    description_ar: 'موافقة مستنيرة قياسية لإجراءات طب الأسنان العامة بما في ذلك الفحوصات والتنظيف والحشوات والعلاجات الروتينية.',
    validity_days: 365,
    risks_en: 'Temporary numbness, sensitivity, allergic reactions to materials, need for additional treatment.',
    risks_ar: 'تنميل مؤقت، حساسية، ردود فعل تحسسية تجاه المواد، الحاجة لعلاج إضافي.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR DENTAL TREATMENT</h2>

<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I hereby authorize the dentist and their qualified designees to perform the following dental treatment(s) as explained to me: general dental procedures which may include but are not limited to dental examinations, radiographs (X-rays), prophylaxis (cleaning), application of fluoride, sealants, fillings (restorations), and other routine dental treatments deemed necessary for my oral health.</p>

<h3>2. EXPECTED BENEFITS</h3>
<ul>
<li>Restoration and maintenance of oral health</li>
<li>Prevention of dental disease progression</li>
<li>Relief from pain or discomfort</li>
<li>Improved dental function and aesthetics</li>
</ul>

<h3>3. RISKS AND POSSIBLE COMPLICATIONS</h3>
<p>I understand that any dental treatment involves inherent risks. These include but are not limited to:</p>
<ul>
<li>Pain, swelling, or discomfort during or after treatment</li>
<li>Temporary or, rarely, permanent numbness of the lip, tongue, chin, or other areas</li>
<li>Allergic or adverse reactions to anesthetics, medications, or dental materials</li>
<li>Infection at the treatment site</li>
<li>Damage to adjacent teeth, restorations, or oral tissues</li>
<li>Jaw joint (TMJ) discomfort or injury from prolonged mouth opening</li>
<li>Tooth sensitivity following treatment</li>
<li>Need for additional or alternative treatment</li>
<li>Failure of the treatment to achieve the desired result</li>
</ul>

<h3>4. ALTERNATIVES TO TREATMENT</h3>
<p>Alternatives to the proposed treatment have been explained to me, including the option of no treatment. I understand that choosing no treatment may result in progression of dental disease, increased pain, tooth loss, infection that may spread to other areas, and other health complications.</p>

<h3>5. ANESTHESIA</h3>
<p>I consent to the administration of local anesthesia and/or other medications as deemed necessary by the treating dentist. I understand the risks associated with anesthesia include allergic reactions, hematoma, nerve damage, and cardiovascular effects.</p>

<h3>6. POST-OPERATIVE CARE</h3>
<ul>
<li>Follow all instructions provided by the dental team</li>
<li>Take prescribed medications as directed</li>
<li>Avoid hot food and beverages until numbness subsides</li>
<li>Contact the clinic immediately if unusual symptoms develop</li>
<li>Attend all scheduled follow-up appointments</li>
</ul>

<h3>7. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that:</p>
<ul>
<li>I have read and fully understand this consent form</li>
<li>I have been given the opportunity to ask questions, and all my questions have been answered satisfactorily</li>
<li>I have provided a complete and accurate medical history</li>
<li>I understand the proposed treatment, its risks, benefits, and alternatives</li>
<li>I voluntarily consent to the proposed dental treatment</li>
<li>I understand that I may withdraw my consent at any time before the procedure begins</li>
</ul>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على العلاج السني</h2>

<h3>١. وصف الإجراء</h3>
<p>أفوض بموجب هذا طبيب الأسنان والمعينين المؤهلين لديه بإجراء العلاج (العلاجات) السنية التالية كما تم شرحها لي: إجراءات طب الأسنان العامة التي قد تشمل على سبيل المثال لا الحصر فحوصات الأسنان، والأشعة السينية، وتنظيف الأسنان، وتطبيق الفلورايد، والسدادات، والحشوات (الترميمات)، وغيرها من علاجات الأسنان الروتينية اللازمة لصحة فمي.</p>

<h3>٢. الفوائد المتوقعة</h3>
<ul>
<li>استعادة صحة الفم والحفاظ عليها</li>
<li>الوقاية من تطور أمراض الأسنان</li>
<li>التخلص من الألم أو الانزعاج</li>
<li>تحسين وظيفة الأسنان والمظهر الجمالي</li>
</ul>

<h3>٣. المخاطر والمضاعفات المحتملة</h3>
<p>أفهم أن أي علاج سني ينطوي على مخاطر متأصلة. وتشمل هذه على سبيل المثال لا الحصر:</p>
<ul>
<li>الألم أو التورم أو الانزعاج أثناء أو بعد العلاج</li>
<li>تنميل مؤقت أو نادراً دائم في الشفة أو اللسان أو الذقن أو مناطق أخرى</li>
<li>ردود فعل تحسسية أو سلبية تجاه المخدرات أو الأدوية أو مواد طب الأسنان</li>
<li>عدوى في مكان العلاج</li>
<li>تلف الأسنان المجاورة أو الترميمات أو أنسجة الفم</li>
<li>انزعاج أو إصابة في مفصل الفك من فتح الفم لفترة طويلة</li>
<li>حساسية الأسنان بعد العلاج</li>
<li>الحاجة إلى علاج إضافي أو بديل</li>
<li>فشل العلاج في تحقيق النتيجة المرجوة</li>
</ul>

<h3>٤. بدائل العلاج</h3>
<p>تم شرح البدائل للعلاج المقترح لي، بما في ذلك خيار عدم العلاج. أفهم أن اختيار عدم العلاج قد يؤدي إلى تطور مرض الأسنان وزيادة الألم وفقدان الأسنان والعدوى التي قد تنتشر إلى مناطق أخرى ومضاعفات صحية أخرى.</p>

<h3>٥. التخدير</h3>
<p>أوافق على إعطاء التخدير الموضعي و/أو الأدوية الأخرى حسب ما يراه طبيب الأسنان المعالج ضرورياً. أفهم المخاطر المرتبطة بالتخدير بما في ذلك ردود الفعل التحسسية والورم الدموي وتلف الأعصاب والتأثيرات القلبية الوعائية.</p>

<h3>٦. الرعاية بعد العلاج</h3>
<ul>
<li>اتباع جميع التعليمات المقدمة من فريق طب الأسنان</li>
<li>تناول الأدوية الموصوفة حسب التوجيهات</li>
<li>تجنب الطعام والمشروبات الساخنة حتى زوال التنميل</li>
<li>الاتصال بالعيادة فوراً في حال ظهور أعراض غير عادية</li>
<li>حضور جميع مواعيد المتابعة المجدولة</li>
</ul>

<h3>٧. إقرار المريض</h3>
<p>أقر بأنني:</p>
<ul>
<li>قرأت وفهمت هذا النموذج بالكامل</li>
<li>أُتيحت لي الفرصة لطرح الأسئلة وتمت الإجابة على جميع أسئلتي بشكل مرضٍ</li>
<li>قدمت تاريخاً طبياً كاملاً ودقيقاً</li>
<li>أفهم العلاج المقترح ومخاطره وفوائده وبدائله</li>
<li>أوافق طوعاً على العلاج السني المقترح</li>
<li>أفهم أنه يمكنني سحب موافقتي في أي وقت قبل بدء الإجراء</li>
</ul>
</div>`,
  },
  {
    name_en: 'Tooth Extraction Consent',
    name_ar: 'موافقة على خلع الأسنان',
    procedure_type: 'extraction',
    description_en: 'Informed consent for simple or surgical tooth extraction procedures.',
    description_ar: 'موافقة مستنيرة لإجراءات خلع الأسنان البسيطة أو الجراحية.',
    validity_days: 30,
    risks_en: 'Dry socket, infection, nerve damage, sinus perforation, jaw fracture, excessive bleeding.',
    risks_ar: 'التهاب السنخ الجاف، العدوى، تلف الأعصاب، ثقب الجيب الأنفي، كسر الفك، نزيف مفرط.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR TOOTH EXTRACTION</h2>

<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the dentist to perform the extraction (removal) of tooth/teeth as identified and explained to me. I understand that extracting a tooth involves loosening the tooth from its socket in the jawbone and removing it. In some cases, a surgical approach may be necessary, which may include making an incision in the gum tissue, removing bone around the tooth, and/or sectioning the tooth for removal.</p>

<h3>2. EXPECTED BENEFITS</h3>
<ul>
<li>Elimination of infection, pain, or pathology associated with the tooth</li>
<li>Prevention of spread of infection to adjacent teeth or other body areas</li>
<li>Resolution of crowding or orthodontic issues</li>
<li>Preparation for prosthetic replacement (implant, bridge, or denture)</li>
</ul>

<h3>3. RISKS AND POSSIBLE COMPLICATIONS</h3>
<p>I have been informed of the following risks:</p>
<ul>
<li><strong>Dry Socket (Alveolar Osteitis):</strong> A painful condition where the blood clot is lost from the extraction site, typically 2-5 days post-extraction</li>
<li><strong>Infection:</strong> Post-operative infection requiring antibiotics</li>
<li><strong>Nerve Damage:</strong> Temporary or permanent numbness/tingling of the lip, tongue, chin, teeth, or gums (particularly with lower wisdom teeth)</li>
<li><strong>Sinus Perforation:</strong> Opening into the maxillary sinus during upper tooth extraction, which may require additional treatment</li>
<li><strong>Jaw Fracture:</strong> Rare but possible, especially in patients with weakened bone</li>
<li><strong>Excessive Bleeding:</strong> Prolonged bleeding that may require additional intervention</li>
<li><strong>Root Fragments:</strong> Small root tips may be left if their removal would risk more damage</li>
<li><strong>Damage to Adjacent Teeth:</strong> Existing restorations or neighboring teeth may be damaged</li>
<li><strong>Swelling and Bruising:</strong> Post-operative facial swelling that typically resolves in 5-7 days</li>
<li><strong>Limited Mouth Opening (Trismus):</strong> Temporary difficulty opening the mouth</li>
</ul>

<h3>4. ALTERNATIVES TO TREATMENT</h3>
<ul>
<li>Root canal treatment (if the tooth is restorable)</li>
<li>Crown or other restorative treatment</li>
<li>No treatment — risk of worsening infection, abscess, cyst formation, damage to adjacent teeth, and systemic health complications</li>
</ul>

<h3>5. POST-OPERATIVE INSTRUCTIONS</h3>
<ul>
<li>Bite firmly on gauze for 30-45 minutes after extraction</li>
<li>Do NOT rinse, spit forcefully, or use a straw for 24 hours</li>
<li>Apply ice packs externally: 20 minutes on, 20 minutes off</li>
<li>Eat soft foods and avoid the extraction site when chewing</li>
<li>Do NOT smoke for at least 72 hours (increases dry socket risk)</li>
<li>Take prescribed pain medication and antibiotics as directed</li>
<li>Gently rinse with warm salt water starting 24 hours after extraction</li>
<li>Contact the clinic if: severe pain worsens after 3 days, excessive bleeding persists, fever develops, or numbness does not resolve</li>
</ul>

<h3>6. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have read and fully understand this consent form. I have been given the opportunity to ask questions, and all my questions have been answered satisfactorily. I voluntarily consent to the proposed extraction procedure. I understand that I may withdraw my consent at any time before the procedure begins.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على خلع الأسنان</h2>

<h3>١. وصف الإجراء</h3>
<p>أفوض طبيب الأسنان بإجراء خلع (إزالة) السن/الأسنان كما تم تحديدها وشرحها لي. أفهم أن خلع السن يتضمن تخليصه من تجويفه في عظم الفك وإزالته. في بعض الحالات، قد يكون النهج الجراحي ضرورياً، والذي قد يشمل عمل شق في أنسجة اللثة، وإزالة العظم حول السن، و/أو تقسيم السن لإزالته.</p>

<h3>٢. الفوائد المتوقعة</h3>
<ul>
<li>القضاء على العدوى أو الألم أو الأمراض المرتبطة بالسن</li>
<li>منع انتشار العدوى إلى الأسنان المجاورة أو مناطق أخرى من الجسم</li>
<li>حل مشاكل الازدحام أو التقويم</li>
<li>التحضير للاستبدال التعويضي (زراعة، جسر، أو طقم أسنان)</li>
</ul>

<h3>٣. المخاطر والمضاعفات المحتملة</h3>
<p>تم إبلاغي بالمخاطر التالية:</p>
<ul>
<li><strong>التهاب السنخ الجاف:</strong> حالة مؤلمة حيث تُفقد الجلطة الدموية من مكان الخلع، عادةً بعد ٢-٥ أيام من الخلع</li>
<li><strong>العدوى:</strong> عدوى بعد العملية تتطلب مضادات حيوية</li>
<li><strong>تلف الأعصاب:</strong> تنميل أو وخز مؤقت أو دائم في الشفة أو اللسان أو الذقن أو الأسنان أو اللثة</li>
<li><strong>ثقب الجيب الأنفي:</strong> فتحة في الجيب الفكي أثناء خلع الأسنان العلوية</li>
<li><strong>كسر الفك:</strong> نادر لكنه ممكن، خاصة في المرضى ذوي العظام الضعيفة</li>
<li><strong>نزيف مفرط:</strong> نزيف مطول قد يتطلب تدخلاً إضافياً</li>
<li><strong>بقايا الجذور:</strong> قد تُترك أطراف جذر صغيرة إذا كانت إزالتها تمثل خطراً أكبر</li>
<li><strong>تلف الأسنان المجاورة:</strong> قد تتضرر الترميمات الموجودة أو الأسنان المجاورة</li>
<li><strong>تورم وكدمات:</strong> تورم في الوجه يزول عادةً خلال ٥-٧ أيام</li>
<li><strong>محدودية فتح الفم:</strong> صعوبة مؤقتة في فتح الفم</li>
</ul>

<h3>٤. بدائل العلاج</h3>
<ul>
<li>علاج قناة الجذر (إذا كان السن قابلاً للترميم)</li>
<li>تاج أو علاج ترميمي آخر</li>
<li>عدم العلاج — خطر تفاقم العدوى، الخراج، تكوين كيس، تلف الأسنان المجاورة، ومضاعفات صحية جهازية</li>
</ul>

<h3>٥. تعليمات ما بعد العملية</h3>
<ul>
<li>العض بقوة على الشاش لمدة ٣٠-٤٥ دقيقة بعد الخلع</li>
<li>عدم المضمضة أو البصق بقوة أو استخدام ماصة لمدة ٢٤ ساعة</li>
<li>وضع كمادات ثلج خارجياً: ٢٠ دقيقة تشغيل، ٢٠ دقيقة إيقاف</li>
<li>تناول أطعمة لينة وتجنب مكان الخلع عند المضغ</li>
<li>عدم التدخين لمدة ٧٢ ساعة على الأقل</li>
<li>تناول مسكنات الألم والمضادات الحيوية الموصوفة حسب التوجيهات</li>
<li>المضمضة بلطف بالماء الدافئ والملح بعد ٢٤ ساعة من الخلع</li>
<li>الاتصال بالعيادة في حال: تفاقم الألم الشديد بعد ٣ أيام، استمرار النزيف المفرط، ارتفاع الحرارة، أو عدم زوال التنميل</li>
</ul>

<h3>٦. إقرار المريض</h3>
<p>أقر بأنني قرأت وفهمت هذا النموذج بالكامل. أُتيحت لي الفرصة لطرح الأسئلة وتمت الإجابة على جميع أسئلتي بشكل مرضٍ. أوافق طوعاً على إجراء الخلع المقترح. أفهم أنه يمكنني سحب موافقتي في أي وقت قبل بدء الإجراء.</p>
</div>`,
  },
  {
    name_en: 'Root Canal Treatment Consent',
    name_ar: 'موافقة على علاج قناة الجذر',
    procedure_type: 'root_canal',
    description_en: 'Informed consent for endodontic (root canal) treatment to save an infected or damaged tooth.',
    description_ar: 'موافقة مستنيرة لعلاج قناة الجذر (علاج العصب) لإنقاذ سن مصاب أو تالف.',
    validity_days: 30,
    risks_en: 'Instrument separation, perforation, incomplete treatment, post-op pain, tooth fracture, retreatment needed.',
    risks_ar: 'انفصال الأداة، ثقب، علاج غير مكتمل، ألم بعد العملية، كسر السن، الحاجة لإعادة العلاج.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR ROOT CANAL (ENDODONTIC) TREATMENT</h2>

<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the dentist to perform endodontic (root canal) treatment on the identified tooth/teeth. This procedure involves removing the infected or inflamed pulp (nerve) tissue from inside the tooth, thorough cleaning, shaping and disinfection of the root canal system, and filling it with a biocompatible material. A permanent crown or other restoration is typically required after the procedure to protect and restore the tooth.</p>

<h3>2. EXPECTED BENEFITS</h3>
<ul>
<li>Elimination of infection and relief from pain</li>
<li>Preservation of the natural tooth and prevention of extraction</li>
<li>Restoration of normal chewing function</li>
<li>Prevention of infection spread to adjacent teeth and jawbone</li>
</ul>

<h3>3. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul>
<li><strong>Instrument Separation:</strong> Endodontic files may fracture within the root canal. The fragment may be retrievable or may need to remain in place</li>
<li><strong>Perforation:</strong> Inadvertent opening through the root or crown, which may affect prognosis</li>
<li><strong>Incomplete Treatment:</strong> Complex root anatomy may prevent complete cleaning of all canals</li>
<li><strong>Post-Operative Pain and Swelling:</strong> Expected for 2-7 days, manageable with medication</li>
<li><strong>Flare-Up:</strong> Acute pain or swelling between appointments requiring emergency care</li>
<li><strong>Tooth Fracture:</strong> Treated teeth become more brittle; a crown is recommended to prevent fracture</li>
<li><strong>Need for Retreatment:</strong> Treatment may fail, requiring retreatment or apicoectomy (surgical root-end procedure)</li>
<li><strong>Tooth Discoloration:</strong> The treated tooth may darken over time</li>
<li><strong>Paresthesia:</strong> Temporary or permanent numbness of adjacent areas</li>
<li><strong>Failure Requiring Extraction:</strong> Despite best efforts, the tooth may ultimately need extraction</li>
</ul>

<h3>4. ALTERNATIVES TO TREATMENT</h3>
<ul>
<li>Tooth extraction with or without prosthetic replacement (implant, bridge, denture)</li>
<li>No treatment — risk of abscess, cyst, fistula, spreading infection, bone loss, systemic complications</li>
</ul>

<h3>5. POST-OPERATIVE INSTRUCTIONS</h3>
<ul>
<li>Avoid chewing on the treated side until numbness subsides and permanent restoration is placed</li>
<li>Mild to moderate pain is expected — take prescribed analgesics as directed</li>
<li>A temporary filling will be placed; avoid sticky or hard foods on that side</li>
<li>Schedule your crown/permanent restoration appointment promptly (within 2-4 weeks)</li>
<li>Contact the clinic if: severe pain persists beyond 7 days, swelling increases, fever develops, or the temporary filling is lost</li>
</ul>

<h3>6. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have read and fully understand this consent form. I have been given the opportunity to ask questions and all my questions have been answered satisfactorily. I voluntarily consent to the proposed endodontic treatment. I understand the importance of completing the treatment and obtaining a permanent restoration. I may withdraw my consent at any time before the procedure begins.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على علاج قناة الجذر (علاج العصب)</h2>

<h3>١. وصف الإجراء</h3>
<p>أفوض طبيب الأسنان بإجراء علاج قناة الجذر (علاج العصب) على السن/الأسنان المحددة. يتضمن هذا الإجراء إزالة أنسجة اللب (العصب) المصابة أو الملتهبة من داخل السن، والتنظيف الشامل وتشكيل وتعقيم نظام قناة الجذر، وحشوه بمادة متوافقة حيوياً. عادةً ما يكون التاج الدائم أو الترميم الآخر مطلوباً بعد الإجراء لحماية السن وترميمه.</p>

<h3>٢. الفوائد المتوقعة</h3>
<ul>
<li>القضاء على العدوى والتخلص من الألم</li>
<li>الحفاظ على السن الطبيعي ومنع الخلع</li>
<li>استعادة وظيفة المضغ الطبيعية</li>
<li>منع انتشار العدوى إلى الأسنان المجاورة وعظم الفك</li>
</ul>

<h3>٣. المخاطر والمضاعفات المحتملة</h3>
<ul>
<li><strong>انفصال الأداة:</strong> قد تنكسر المبارد داخل قناة الجذر. قد يمكن استرجاع القطعة أو قد تحتاج للبقاء في مكانها</li>
<li><strong>الثقب:</strong> فتحة غير مقصودة عبر الجذر أو التاج، مما قد يؤثر على التوقعات</li>
<li><strong>علاج غير مكتمل:</strong> قد يمنع تشريح الجذر المعقد التنظيف الكامل لجميع القنوات</li>
<li><strong>ألم وتورم بعد العملية:</strong> متوقع لمدة ٢-٧ أيام، يمكن التحكم فيه بالأدوية</li>
<li><strong>نوبة حادة:</strong> ألم أو تورم حاد بين المواعيد يتطلب رعاية طارئة</li>
<li><strong>كسر السن:</strong> تصبح الأسنان المعالجة أكثر هشاشة؛ يُوصى بالتاج لمنع الكسر</li>
<li><strong>الحاجة لإعادة العلاج:</strong> قد يفشل العلاج مما يتطلب إعادة العلاج أو استئصال قمة الجذر</li>
<li><strong>تغير لون السن:</strong> قد يتغير لون السن المعالج مع مرور الوقت</li>
<li><strong>فشل يتطلب الخلع:</strong> على الرغم من أفضل الجهود، قد يحتاج السن في النهاية للخلع</li>
</ul>

<h3>٤. بدائل العلاج</h3>
<ul>
<li>خلع السن مع أو بدون استبدال تعويضي (زراعة، جسر، طقم أسنان)</li>
<li>عدم العلاج — خطر الخراج، الكيس، الناسور، انتشار العدوى، فقدان العظم، مضاعفات جهازية</li>
</ul>

<h3>٥. تعليمات ما بعد العملية</h3>
<ul>
<li>تجنب المضغ على الجانب المعالج حتى زوال التنميل ووضع الترميم الدائم</li>
<li>ألم خفيف إلى متوسط متوقع — تناول المسكنات الموصوفة حسب التوجيهات</li>
<li>سيتم وضع حشوة مؤقتة؛ تجنب الأطعمة اللزجة أو الصلبة على ذلك الجانب</li>
<li>حدد موعد التاج/الترميم الدائم فوراً (خلال ٢-٤ أسابيع)</li>
<li>اتصل بالعيادة إذا: استمر الألم الشديد أكثر من ٧ أيام، زاد التورم، ارتفعت الحرارة، أو فُقدت الحشوة المؤقتة</li>
</ul>

<h3>٦. إقرار المريض</h3>
<p>أقر بأنني قرأت وفهمت هذا النموذج بالكامل. أُتيحت لي الفرصة لطرح الأسئلة وتمت الإجابة على جميع أسئلتي. أوافق طوعاً على العلاج المقترح. أفهم أهمية إكمال العلاج والحصول على ترميم دائم.</p>
</div>`,
  },
  {
    name_en: 'Dental Implant Consent',
    name_ar: 'موافقة على زراعة الأسنان',
    procedure_type: 'implant',
    description_en: 'Informed consent for dental implant surgery including placement of titanium implant fixture in the jawbone.',
    description_ar: 'موافقة مستنيرة لجراحة زراعة الأسنان بما في ذلك وضع تركيبة الزرعة التيتانيوم في عظم الفك.',
    validity_days: 30,
    risks_en: 'Implant failure, nerve damage, sinus perforation, infection, bone loss, prosthetic complications.',
    risks_ar: 'فشل الزرعة، تلف الأعصاب، ثقب الجيب الأنفي، العدوى، فقدان العظم، مضاعفات تعويضية.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR DENTAL IMPLANT SURGERY</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the placement of dental implant(s) — titanium or zirconia fixtures surgically inserted into the jawbone to serve as artificial tooth roots. The procedure may include bone grafting, sinus lifting, soft tissue management, and/or guided bone regeneration as necessary. After a healing period (typically 3-6 months for osseointegration), an abutment and prosthetic crown/bridge will be attached.</p>
<h3>2. EXPECTED BENEFITS</h3>
<ul><li>Permanent, fixed replacement for missing teeth</li><li>Preservation of jawbone and prevention of bone resorption</li><li>Natural appearance, function, and comfort</li><li>No damage to adjacent teeth (unlike bridges)</li></ul>
<h3>3. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Implant Failure:</strong> The implant may not integrate with the bone (failure rate 2-5%)</li><li><strong>Infection (Peri-implantitis):</strong> Bacterial infection around the implant requiring treatment or removal</li><li><strong>Nerve Damage:</strong> Temporary or permanent numbness of lip, chin, tongue, or gums</li><li><strong>Sinus Perforation:</strong> For upper jaw implants, possible penetration into the sinus cavity</li><li><strong>Bone Loss:</strong> Progressive bone loss around the implant over time</li><li><strong>Bleeding and Hematoma:</strong> Post-surgical bleeding or bruising</li><li><strong>Prosthetic Complications:</strong> Loosening, fracture, or wear of the crown/abutment</li><li><strong>Need for Additional Surgery:</strong> Bone grafting, sinus lift, or implant removal/replacement</li><li><strong>Allergic Reaction:</strong> Rare sensitivity to titanium or other materials</li></ul>
<h3>4. ALTERNATIVES</h3>
<ul><li>Fixed bridge (requires preparation of adjacent teeth)</li><li>Removable partial or complete denture</li><li>No treatment — bone resorption, shifting of remaining teeth, difficulty chewing</li></ul>
<h3>5. POST-OPERATIVE INSTRUCTIONS</h3>
<ul><li>Apply ice packs for the first 48 hours</li><li>Soft diet for 1-2 weeks; avoid chewing on the implant site</li><li>Do NOT smoke — significantly increases failure risk</li><li>Take antibiotics and pain medication as prescribed</li><li>Maintain excellent oral hygiene around the implant site</li><li>Attend all follow-up appointments for healing assessment</li></ul>
<h3>6. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have read and fully understand this consent form. I voluntarily consent to the proposed implant surgery. I understand that implant success depends on my compliance with post-operative instructions and maintenance.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على جراحة زراعة الأسنان</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بوضع زرعة (زرعات) أسنان — تركيبات من التيتانيوم أو الزركونيا تُزرع جراحياً في عظم الفك لتكون بمثابة جذور أسنان اصطناعية. قد يشمل الإجراء ترقيع العظم، رفع الجيب الأنفي، إدارة الأنسجة الرخوة، و/أو تجديد العظم الموجه حسب الحاجة.</p>
<h3>٢. الفوائد المتوقعة</h3>
<ul><li>استبدال دائم وثابت للأسنان المفقودة</li><li>الحفاظ على عظم الفك ومنع ارتشاف العظم</li><li>مظهر طبيعي ووظيفة وراحة</li><li>لا ضرر للأسنان المجاورة (على عكس الجسور)</li></ul>
<h3>٣. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>فشل الزرعة:</strong> قد لا تندمج الزرعة مع العظم (معدل الفشل ٢-٥٪)</li><li><strong>العدوى:</strong> عدوى بكتيرية حول الزرعة تتطلب العلاج أو الإزالة</li><li><strong>تلف الأعصاب:</strong> تنميل مؤقت أو دائم في الشفة أو الذقن أو اللسان أو اللثة</li><li><strong>ثقب الجيب الأنفي:</strong> اختراق محتمل لتجويف الجيب الأنفي للزرعات العلوية</li><li><strong>فقدان العظم:</strong> فقدان عظم تدريجي حول الزرعة مع مرور الوقت</li><li><strong>مضاعفات تعويضية:</strong> ارتخاء أو كسر أو تآكل التاج/الدعامة</li></ul>
<h3>٤. البدائل</h3>
<ul><li>جسر ثابت (يتطلب تحضير الأسنان المجاورة)</li><li>طقم أسنان جزئي أو كامل متحرك</li><li>عدم العلاج — ارتشاف العظم، انزياح الأسنان المتبقية</li></ul>
<h3>٥. تعليمات ما بعد العملية</h3>
<ul><li>وضع كمادات ثلج لأول ٤٨ ساعة</li><li>حمية لينة لمدة ١-٢ أسبوع</li><li>عدم التدخين — يزيد بشكل كبير من خطر الفشل</li><li>تناول المضادات الحيوية ومسكنات الألم حسب الوصفة</li><li>الحفاظ على نظافة الفم الممتازة حول مكان الزرعة</li></ul>
<h3>٦. إقرار المريض</h3>
<p>أقر بأنني قرأت وفهمت هذا النموذج بالكامل. أوافق طوعاً على الجراحة المقترحة. أفهم أن نجاح الزرعة يعتمد على التزامي بتعليمات ما بعد العملية والصيانة.</p>
</div>`,
  },
  {
    name_en: 'Orthodontic Treatment Consent',
    name_ar: 'موافقة على علاج تقويم الأسنان',
    procedure_type: 'orthodontic',
    description_en: 'Informed consent for orthodontic treatment including braces, aligners, and related appliances.',
    description_ar: 'موافقة مستنيرة لعلاج تقويم الأسنان بما في ذلك التقويم والمصففات والأجهزة ذات الصلة.',
    validity_days: 365,
    risks_en: 'Root resorption, decalcification, TMJ issues, relapse, extended treatment time.',
    risks_ar: 'ارتشاف الجذر، إزالة التكلس، مشاكل المفصل الفكي، الانتكاس، تمديد فترة العلاج.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR ORTHODONTIC TREATMENT</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize orthodontic treatment to correct misalignment of teeth and/or jaws. Treatment may include fixed braces (metal/ceramic brackets and wires), clear aligners, removable appliances, elastics, headgear, temporary anchorage devices (TADs), and/or orthognathic surgery referral. Treatment duration typically ranges from 12-36 months.</p>
<h3>2. EXPECTED BENEFITS</h3>
<ul><li>Improved dental alignment and bite function</li><li>Enhanced facial aesthetics and smile</li><li>Better oral hygiene access and reduced decay risk</li><li>Correction of jaw discrepancies</li></ul>
<h3>3. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Root Resorption:</strong> Shortening of tooth roots, which may affect long-term tooth stability</li><li><strong>Decalcification/Cavities:</strong> White spots or decay around brackets due to inadequate oral hygiene</li><li><strong>Gum Disease:</strong> Gingivitis or periodontal disease from plaque accumulation around appliances</li><li><strong>TMJ Disorders:</strong> Jaw joint pain, clicking, or dysfunction</li><li><strong>Relapse:</strong> Teeth may shift after treatment if retainers are not worn as prescribed</li><li><strong>Extended Treatment Time:</strong> Treatment may take longer than initially estimated</li><li><strong>Tooth Vitality Loss:</strong> Teeth may lose nerve vitality during movement</li><li><strong>Soft Tissue Irritation:</strong> Ulcers, sores from brackets and wires</li><li><strong>Allergic Reactions:</strong> To nickel, latex, or other materials</li></ul>
<h3>4. ALTERNATIVES</h3>
<ul><li>Cosmetic dentistry (veneers, bonding) for appearance only</li><li>No treatment — potential for worsening alignment, TMJ issues, and dental problems</li></ul>
<h3>5. PATIENT RESPONSIBILITIES</h3>
<ul><li>Maintain excellent oral hygiene throughout treatment</li><li>Wear elastics and appliances as instructed</li><li>Attend all scheduled appointments</li><li>Avoid hard and sticky foods that may damage appliances</li><li>Wear retainers as prescribed after treatment completion</li><li>Report any broken brackets or wires promptly</li></ul>
<h3>6. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have read and fully understand this consent form. I understand that orthodontic treatment requires my full cooperation and compliance. I voluntarily consent to the proposed treatment.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على علاج تقويم الأسنان</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بعلاج تقويم الأسنان لتصحيح سوء محاذاة الأسنان و/أو الفكين. قد يشمل العلاج تقويماً ثابتاً (أقواس معدنية/خزفية وأسلاك)، مصففات شفافة، أجهزة متحركة، مطاط، جهاز رأسي، وأجهزة تثبيت مؤقتة. تتراوح مدة العلاج عادةً بين ١٢-٣٦ شهراً.</p>
<h3>٢. الفوائد المتوقعة</h3>
<ul><li>تحسين محاذاة الأسنان ووظيفة العضة</li><li>تعزيز جماليات الوجه والابتسامة</li><li>وصول أفضل لنظافة الفم وتقليل خطر التسوس</li><li>تصحيح تباينات الفك</li></ul>
<h3>٣. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>ارتشاف الجذر:</strong> قصر جذور الأسنان مما قد يؤثر على استقرار السن على المدى الطويل</li><li><strong>إزالة التكلس/التسوس:</strong> بقع بيضاء أو تسوس حول الأقواس بسبب عدم كفاية نظافة الفم</li><li><strong>أمراض اللثة:</strong> التهاب اللثة من تراكم البلاك حول الأجهزة</li><li><strong>اضطرابات المفصل الفكي:</strong> ألم أو طقطقة أو خلل في مفصل الفك</li><li><strong>الانتكاس:</strong> قد تنتقل الأسنان بعد العلاج إذا لم يتم ارتداء المثبتات كما هو موصوف</li><li><strong>تمديد فترة العلاج:</strong> قد يستغرق العلاج وقتاً أطول مما تم تقديره مبدئياً</li></ul>
<h3>٤. البدائل</h3>
<ul><li>طب الأسنان التجميلي (قشور، حشوات تجميلية) للمظهر فقط</li><li>عدم العلاج — احتمال تفاقم سوء المحاذاة ومشاكل الأسنان</li></ul>
<h3>٥. مسؤوليات المريض</h3>
<ul><li>الحفاظ على نظافة فم ممتازة طوال فترة العلاج</li><li>ارتداء المطاط والأجهزة حسب التعليمات</li><li>حضور جميع المواعيد المجدولة</li><li>تجنب الأطعمة الصلبة واللزجة</li><li>ارتداء المثبتات كما هو موصوف بعد إكمال العلاج</li></ul>
<h3>٦. إقرار المريض</h3>
<p>أقر بأنني قرأت وفهمت هذا النموذج بالكامل. أفهم أن علاج التقويم يتطلب تعاوني الكامل والتزامي. أوافق طوعاً على العلاج المقترح.</p>
</div>`,
  },
  {
    name_en: 'Teeth Whitening Consent',
    name_ar: 'موافقة على تبييض الأسنان',
    procedure_type: 'whitening',
    description_en: 'Informed consent for professional teeth whitening/bleaching procedures.',
    description_ar: 'موافقة مستنيرة لإجراءات تبييض الأسنان المهنية.',
    validity_days: 30,
    risks_en: 'Tooth sensitivity, gum irritation, uneven results, temporary discomfort.',
    risks_ar: 'حساسية الأسنان، تهيج اللثة، نتائج غير متساوية، انزعاج مؤقت.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR TEETH WHITENING</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize professional teeth whitening/bleaching treatment. This may include in-office whitening using concentrated bleaching agents (hydrogen peroxide or carbamide peroxide) activated by light or laser, and/or take-home whitening trays with custom-fitted trays and whitening gel for home use.</p>
<h3>2. EXPECTED BENEFITS</h3>
<ul><li>Lighter, brighter tooth color</li><li>Improved smile aesthetics</li><li>Results typically last 6-24 months with maintenance</li></ul>
<h3>3. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Tooth Sensitivity:</strong> Temporary increased sensitivity to hot, cold, and air — the most common side effect</li><li><strong>Gum Irritation:</strong> Temporary whiteness, soreness, or inflammation of gum tissue</li><li><strong>Uneven Results:</strong> Natural teeth may respond differently; existing restorations (fillings, crowns) will NOT change color</li><li><strong>Temporary Discomfort:</strong> Tingling or shooting pains in teeth during or after treatment</li><li><strong>Regression:</strong> Tooth color will gradually darken over time, especially with consumption of staining foods/beverages</li><li><strong>Enamel Damage:</strong> Overuse or misuse of whitening agents may damage enamel</li></ul>
<h3>4. CONTRAINDICATIONS</h3>
<p>Whitening is not recommended for: pregnant or nursing women, patients under 16, patients with severe sensitivity, active decay, or gum disease, and patients with allergies to peroxide.</p>
<h3>5. POST-TREATMENT CARE</h3>
<ul><li>Avoid dark-colored food and drinks for 48 hours (coffee, tea, red wine, berries)</li><li>Avoid tobacco products</li><li>Use sensitivity toothpaste if discomfort occurs</li><li>Results may be maintained with periodic touch-up treatments</li></ul>
<h3>6. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have read and understand this consent form. I understand that results vary and existing restorations will not change color. I voluntarily consent to the proposed whitening treatment.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على تبييض الأسنان</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بإجراء تبييض الأسنان المهني. قد يشمل ذلك تبييضاً في العيادة باستخدام عوامل تبييض مركزة يتم تنشيطها بالضوء أو الليزر، و/أو صواني تبييض منزلية مع جل تبييض للاستخدام المنزلي.</p>
<h3>٢. الفوائد المتوقعة</h3>
<ul><li>لون أسنان أفتح وأكثر إشراقاً</li><li>تحسين جماليات الابتسامة</li><li>تدوم النتائج عادةً ٦-٢٤ شهراً مع الصيانة</li></ul>
<h3>٣. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>حساسية الأسنان:</strong> زيادة مؤقتة في الحساسية للحرارة والبرودة والهواء</li><li><strong>تهيج اللثة:</strong> بياض مؤقت أو ألم أو التهاب في أنسجة اللثة</li><li><strong>نتائج غير متساوية:</strong> قد تستجيب الأسنان الطبيعية بشكل مختلف؛ الترميمات الموجودة لن تتغير لونها</li><li><strong>تراجع:</strong> سيغمق لون الأسنان تدريجياً مع مرور الوقت</li></ul>
<h3>٤. موانع الاستعمال</h3>
<p>لا يُوصى بالتبييض للنساء الحوامل أو المرضعات، المرضى تحت ١٦ سنة، المرضى ذوي الحساسية الشديدة أو التسوس النشط أو أمراض اللثة.</p>
<h3>٥. الرعاية بعد العلاج</h3>
<ul><li>تجنب الأطعمة والمشروبات الداكنة لمدة ٤٨ ساعة</li><li>تجنب منتجات التبغ</li><li>استخدام معجون أسنان للحساسية إذا حدث انزعاج</li></ul>
<h3>٦. إقرار المريض</h3>
<p>أقر بأنني قرأت وفهمت هذا النموذج. أفهم أن النتائج تختلف وأن الترميمات الموجودة لن تتغير لونها. أوافق طوعاً على العلاج المقترح.</p>
</div>`,
  },
  {
    name_en: 'Crown and Bridge Consent',
    name_ar: 'موافقة على التيجان والجسور',
    procedure_type: 'crown_bridge',
    description_en: 'Informed consent for crown, bridge, and fixed prosthodontic procedures.',
    description_ar: 'موافقة مستنيرة لإجراءات التيجان والجسور والتركيبات الثابتة.',
    validity_days: 30,
    risks_en: 'Sensitivity, nerve damage requiring root canal, crown fracture, color mismatch, cement failure.',
    risks_ar: 'حساسية، تلف العصب يتطلب علاج قناة الجذر، كسر التاج، عدم تطابق اللون، فشل اللصق.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR CROWN AND BRIDGE TREATMENT</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the preparation and placement of dental crown(s) and/or fixed bridge(s). This involves reducing (reshaping) the tooth/teeth to accommodate the restoration, taking impressions or digital scans, placing temporary restorations, and cementing the final custom-made crown/bridge. A crown covers a single tooth; a bridge replaces one or more missing teeth by anchoring to adjacent (abutment) teeth.</p>
<h3>2. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Tooth Sensitivity:</strong> Temporary or prolonged sensitivity after tooth preparation</li><li><strong>Nerve Damage:</strong> Preparation may irritate the nerve, potentially requiring root canal treatment</li><li><strong>Crown/Bridge Fracture:</strong> Porcelain or ceramic may chip or fracture</li><li><strong>Cement Failure:</strong> The restoration may loosen or debond over time</li><li><strong>Color Mismatch:</strong> Despite best efforts, exact color matching may not be achievable</li><li><strong>Marginal Discrepancy:</strong> Gap between crown and tooth that may accumulate plaque</li><li><strong>Bite Changes:</strong> The new restoration may temporarily affect your bite</li><li><strong>Abutment Tooth Failure:</strong> Teeth supporting a bridge may develop problems</li><li><strong>Gum Recession:</strong> Gum tissue may recede, exposing the crown margin</li></ul>
<h3>3. ALTERNATIVES</h3>
<ul><li>Dental implant (for missing teeth)</li><li>Removable partial denture</li><li>Onlay or inlay (for less damaged teeth)</li><li>No treatment</li></ul>
<h3>4. POST-OPERATIVE CARE</h3>
<ul><li>Temporary crowns require caution: avoid sticky foods, floss carefully</li><li>Sensitivity is normal for a few weeks after cementation</li><li>Contact the clinic if the bite feels uneven</li><li>Maintain good oral hygiene around the restoration</li></ul>
<h3>5. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have read and understand this consent form. I voluntarily consent to the proposed crown and bridge treatment.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على التيجان والجسور</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بتحضير ووضع تاج (تيجان) و/أو جسر (جسور) ثابتة. يتضمن ذلك تقليل (إعادة تشكيل) السن/الأسنان، أخذ الطبعات أو المسح الرقمي، وضع ترميمات مؤقتة، ولصق التاج/الجسر النهائي المصنوع خصيصاً.</p>
<h3>٢. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>حساسية الأسنان:</strong> حساسية مؤقتة أو مطولة بعد تحضير السن</li><li><strong>تلف العصب:</strong> قد يهيج التحضير العصب، مما قد يتطلب علاج قناة الجذر</li><li><strong>كسر التاج/الجسر:</strong> قد ينكسر البورسلين أو السيراميك</li><li><strong>فشل اللصق:</strong> قد يرتخي الترميم أو ينفصل مع مرور الوقت</li><li><strong>عدم تطابق اللون:</strong> رغم أفضل الجهود، قد لا يمكن تحقيق مطابقة دقيقة للون</li><li><strong>انحسار اللثة:</strong> قد تنحسر أنسجة اللثة مكشفةً حافة التاج</li></ul>
<h3>٣. البدائل</h3>
<ul><li>زرعة أسنان (للأسنان المفقودة)</li><li>طقم أسنان جزئي متحرك</li><li>حشوة داخلية أو خارجية (للأسنان الأقل ضرراً)</li></ul>
<h3>٤. الرعاية بعد العلاج</h3>
<ul><li>التيجان المؤقتة تتطلب حذراً: تجنب الأطعمة اللزجة</li><li>الحساسية طبيعية لبضعة أسابيع بعد اللصق</li><li>اتصل بالعيادة إذا شعرت بعدم توازن العضة</li></ul>
<h3>٥. إقرار المريض</h3>
<p>أقر بأنني قرأت وفهمت هذا النموذج. أوافق طوعاً على علاج التيجان والجسور المقترح.</p>
</div>`,
  },
  {
    name_en: 'Dental Veneer Consent',
    name_ar: 'موافقة على القشور التجميلية',
    procedure_type: 'veneer',
    description_en: 'Informed consent for porcelain or composite veneer placement.',
    description_ar: 'موافقة مستنيرة لتركيب القشور التجميلية من البورسلين أو الكمبوزت.',
    validity_days: 30,
    risks_en: 'Sensitivity, veneer fracture, color mismatch, irreversible tooth reduction, debonding.',
    risks_ar: 'حساسية، كسر القشرة، عدم تطابق اللون، تقليل لا رجعة فيه للسن، انفصال القشرة.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR DENTAL VENEER PLACEMENT</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the placement of dental veneers — thin, custom-made shells of porcelain or composite resin bonded to the front surface of teeth to improve appearance. The procedure involves removing a thin layer of enamel from the tooth surface, taking impressions, and bonding the custom veneer.</p>
<h3>2. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Irreversible Procedure:</strong> Tooth enamel removal is permanent; the tooth will always require a veneer or crown</li><li><strong>Sensitivity:</strong> Temporary or prolonged sensitivity after enamel removal</li><li><strong>Veneer Fracture or Chipping:</strong> Porcelain is strong but can crack or chip</li><li><strong>Debonding:</strong> Veneers may separate from the tooth surface</li><li><strong>Color Mismatch:</strong> Natural teeth may change color over time, creating contrast with veneers</li><li><strong>Gum Irritation:</strong> Veneer margins may irritate gum tissue</li><li><strong>Not Suitable for:</strong> Patients who clench/grind teeth (bruxism) without a night guard</li></ul>
<h3>3. ALTERNATIVES</h3>
<ul><li>Teeth whitening (for color only)</li><li>Dental bonding (less durable, more reversible)</li><li>Orthodontic treatment (for alignment issues)</li><li>Full crowns (for more severely damaged teeth)</li></ul>
<h3>4. PATIENT ACKNOWLEDGMENT</h3>
<p>I understand this is an irreversible cosmetic procedure. I voluntarily consent to the proposed veneer treatment.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على تركيب القشور التجميلية</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بتركيب قشور أسنان — قشور رقيقة مصنوعة خصيصاً من البورسلين أو الراتنج المركب تُلصق على السطح الأمامي للأسنان لتحسين المظهر.</p>
<h3>٢. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>إجراء لا رجعة فيه:</strong> إزالة مينا الأسنان دائمة؛ سيحتاج السن دائماً لقشرة أو تاج</li><li><strong>حساسية:</strong> حساسية مؤقتة أو مطولة بعد إزالة المينا</li><li><strong>كسر القشرة:</strong> البورسلين قوي لكنه قد يتشقق أو ينكسر</li><li><strong>انفصال:</strong> قد تنفصل القشور عن سطح السن</li><li><strong>عدم تطابق اللون:</strong> قد تتغير الأسنان الطبيعية لونها مع الوقت</li></ul>
<h3>٣. البدائل</h3>
<ul><li>تبييض الأسنان (للون فقط)</li><li>حشوة تجميلية (أقل متانة، أكثر قابلية للعكس)</li><li>علاج تقويمي (لمشاكل المحاذاة)</li></ul>
<h3>٤. إقرار المريض</h3>
<p>أفهم أن هذا إجراء تجميلي لا رجعة فيه. أوافق طوعاً على علاج القشور المقترح.</p>
</div>`,
  },
  {
    name_en: 'Periodontal Surgery Consent',
    name_ar: 'موافقة على جراحة اللثة',
    procedure_type: 'periodontal',
    description_en: 'Informed consent for periodontal (gum) surgery including flap surgery, bone grafting, and tissue regeneration.',
    description_ar: 'موافقة مستنيرة لجراحة اللثة بما في ذلك جراحة الشريحة وترقيع العظم وتجديد الأنسجة.',
    validity_days: 30,
    risks_en: 'Post-surgical sensitivity, gum recession, infection, bone loss, tooth loss.',
    risks_ar: 'حساسية بعد الجراحة، انحسار اللثة، عدوى، فقدان العظم، فقدان الأسنان.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR PERIODONTAL (GUM) SURGERY</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize periodontal surgery to treat gum disease. Procedures may include: flap surgery (lifting gum tissue to clean root surfaces and bone), bone grafting, guided tissue regeneration, crown lengthening, gum grafting, and/or pocket reduction surgery.</p>
<h3>2. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Post-Surgical Sensitivity:</strong> Increased tooth sensitivity as roots become exposed</li><li><strong>Gum Recession:</strong> Gum tissue may recede further, making teeth appear longer</li><li><strong>Tooth Mobility:</strong> Teeth may become temporarily or permanently more mobile</li><li><strong>Infection:</strong> Post-surgical infection requiring antibiotics</li><li><strong>Bleeding:</strong> Prolonged bleeding from surgical sites</li><li><strong>Swelling and Pain:</strong> Expected for 5-14 days post-surgery</li><li><strong>Tooth Loss:</strong> Severely compromised teeth may ultimately be lost despite treatment</li><li><strong>Altered Sensation:</strong> Temporary or permanent numbness or tingling</li></ul>
<h3>3. ALTERNATIVES</h3>
<ul><li>Non-surgical periodontal treatment (scaling and root planing)</li><li>Extraction of hopeless teeth</li><li>No treatment — progression of disease, bone loss, tooth loss, systemic health effects</li></ul>
<h3>4. PATIENT ACKNOWLEDGMENT</h3>
<p>I understand that periodontal disease is a chronic condition requiring ongoing maintenance. I consent to the proposed surgery and commit to follow-up care.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على جراحة اللثة</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بجراحة اللثة لعلاج أمراض اللثة. قد تشمل الإجراءات: جراحة الشريحة، ترقيع العظم، تجديد الأنسجة الموجه، تطويل التاج، ترقيع اللثة، و/أو جراحة تقليل الجيوب.</p>
<h3>٢. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>حساسية بعد الجراحة:</strong> زيادة حساسية الأسنان مع انكشاف الجذور</li><li><strong>انحسار اللثة:</strong> قد تنحسر أنسجة اللثة أكثر مما يجعل الأسنان تبدو أطول</li><li><strong>حركة الأسنان:</strong> قد تصبح الأسنان أكثر حركة مؤقتاً أو دائماً</li><li><strong>العدوى:</strong> عدوى بعد الجراحة تتطلب مضادات حيوية</li><li><strong>فقدان الأسنان:</strong> الأسنان المتضررة بشدة قد تُفقد في النهاية رغم العلاج</li></ul>
<h3>٣. البدائل</h3>
<ul><li>علاج لثة غير جراحي (تنظيف عميق)</li><li>خلع الأسنان التي لا أمل فيها</li><li>عدم العلاج — تطور المرض وفقدان العظم وفقدان الأسنان</li></ul>
<h3>٤. إقرار المريض</h3>
<p>أفهم أن أمراض اللثة حالة مزمنة تتطلب صيانة مستمرة. أوافق على الجراحة المقترحة وألتزم برعاية المتابعة.</p>
</div>`,
  },
  {
    name_en: 'Sedation/Anesthesia Consent',
    name_ar: 'موافقة على التخدير',
    procedure_type: 'sedation',
    description_en: 'Informed consent for sedation (conscious sedation, IV sedation, or general anesthesia) during dental procedures.',
    description_ar: 'موافقة مستنيرة على التخدير (تخدير واعي، تخدير وريدي، أو تخدير عام) أثناء إجراءات الأسنان.',
    validity_days: 1,
    risks_en: 'Allergic reaction, respiratory depression, cardiovascular effects, nausea, aspiration.',
    risks_ar: 'رد فعل تحسسي، تثبيط تنفسي، تأثيرات قلبية وعائية، غثيان، شفط.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR SEDATION / ANESTHESIA</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the administration of sedation/anesthesia as determined by the treating dentist. This may include: local anesthesia (numbing injection), nitrous oxide (laughing gas), oral conscious sedation, intravenous (IV) sedation, or general anesthesia.</p>
<h3>2. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Allergic Reaction:</strong> Ranging from mild rash to severe anaphylaxis (rare but potentially life-threatening)</li><li><strong>Respiratory Depression:</strong> Slowed or difficult breathing</li><li><strong>Cardiovascular Effects:</strong> Changes in heart rate, blood pressure, or rhythm</li><li><strong>Nausea and Vomiting:</strong> Post-sedation nausea</li><li><strong>Aspiration:</strong> Inhalation of oral contents into the lungs</li><li><strong>Prolonged Drowsiness:</strong> Effects may last several hours after the procedure</li><li><strong>Injection Site Reactions:</strong> Pain, swelling, bruising, or hematoma at the injection site</li><li><strong>Nerve Damage:</strong> Temporary or permanent numbness from local anesthesia</li></ul>
<h3>3. PRE-SEDATION REQUIREMENTS</h3>
<ul><li>Do NOT eat or drink for 6-8 hours before IV sedation/general anesthesia</li><li>Inform the dentist of ALL medications, supplements, and allergies</li><li>Arrange for a responsible adult to drive you home</li><li>Do NOT drive or operate machinery for 24 hours after sedation</li><li>Wear comfortable, loose-fitting clothing</li></ul>
<h3>4. PATIENT ACKNOWLEDGMENT</h3>
<p>I certify that I have provided a complete medical history including all medications and allergies. I have followed pre-sedation instructions. I have arranged for transportation home. I voluntarily consent to the proposed sedation/anesthesia.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على التخدير</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بإعطاء التخدير كما يحدده طبيب الأسنان المعالج. قد يشمل ذلك: التخدير الموضعي، أكسيد النيتروز (غاز الضحك)، التخدير الواعي عن طريق الفم، التخدير الوريدي، أو التخدير العام.</p>
<h3>٢. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>رد فعل تحسسي:</strong> من طفح جلدي خفيف إلى صدمة تأقية شديدة (نادرة لكن قد تهدد الحياة)</li><li><strong>تثبيط تنفسي:</strong> تباطؤ أو صعوبة في التنفس</li><li><strong>تأثيرات قلبية وعائية:</strong> تغيرات في معدل ضربات القلب أو ضغط الدم</li><li><strong>غثيان وقيء:</strong> غثيان بعد التخدير</li><li><strong>شفط:</strong> استنشاق محتويات الفم إلى الرئتين</li><li><strong>نعاس مطول:</strong> قد تستمر التأثيرات عدة ساعات بعد الإجراء</li></ul>
<h3>٣. متطلبات ما قبل التخدير</h3>
<ul><li>عدم الأكل أو الشرب لمدة ٦-٨ ساعات قبل التخدير الوريدي/العام</li><li>إبلاغ طبيب الأسنان بجميع الأدوية والمكملات والحساسيات</li><li>ترتيب شخص بالغ مسؤول لإيصالك إلى المنزل</li><li>عدم القيادة أو تشغيل الآلات لمدة ٢٤ ساعة بعد التخدير</li></ul>
<h3>٤. إقرار المريض</h3>
<p>أقر بأنني قدمت تاريخاً طبياً كاملاً بما في ذلك جميع الأدوية والحساسيات. اتبعت تعليمات ما قبل التخدير. رتبت النقل إلى المنزل. أوافق طوعاً على التخدير المقترح.</p>
</div>`,
  },
  {
    name_en: 'Minor Oral Surgery Consent',
    name_ar: 'موافقة على الجراحة الفموية الصغرى',
    procedure_type: 'minor_surgery',
    description_en: 'Informed consent for minor oral surgical procedures including biopsies, frenectomy, and cyst removal.',
    description_ar: 'موافقة مستنيرة لإجراءات الجراحة الفموية الصغرى بما في ذلك الخزعات واستئصال اللجام وإزالة الأكياس.',
    validity_days: 30,
    risks_en: 'Bleeding, infection, nerve damage, scarring, incomplete removal, recurrence.',
    risks_ar: 'نزيف، عدوى، تلف الأعصاب، تندب، إزالة غير كاملة، تكرار.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">INFORMED CONSENT FOR MINOR ORAL SURGERY</h2>
<h3>1. PROCEDURE DESCRIPTION</h3>
<p>I authorize the performance of minor oral surgery as explained to me. This may include: biopsy (tissue sampling), frenectomy (removal of frenum tissue), cyst or tumor removal, apicoectomy (root-end surgery), alveoloplasty (bone reshaping), or other minor surgical procedures in the oral cavity.</p>
<h3>2. RISKS AND POSSIBLE COMPLICATIONS</h3>
<ul><li><strong>Bleeding:</strong> Prolonged bleeding requiring additional intervention</li><li><strong>Infection:</strong> Post-surgical infection requiring antibiotics or drainage</li><li><strong>Nerve Damage:</strong> Temporary or permanent numbness or altered sensation</li><li><strong>Scarring:</strong> Scar tissue formation at the surgical site</li><li><strong>Incomplete Removal:</strong> Pathological tissue may not be completely removed</li><li><strong>Recurrence:</strong> Cysts or lesions may recur</li><li><strong>Swelling and Pain:</strong> Post-operative discomfort expected for 5-14 days</li><li><strong>Jaw Stiffness:</strong> Temporary limited mouth opening</li></ul>
<h3>3. PATIENT ACKNOWLEDGMENT</h3>
<p>I understand the nature of the proposed surgery, its risks, benefits, and alternatives. I voluntarily consent to the procedure.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة مستنيرة على الجراحة الفموية الصغرى</h2>
<h3>١. وصف الإجراء</h3>
<p>أفوض بإجراء جراحة فموية صغرى كما تم شرحها لي. قد تشمل: خزعة، استئصال اللجام، إزالة كيس أو ورم، استئصال قمة الجذر، أو إجراءات جراحية صغرى أخرى في تجويف الفم.</p>
<h3>٢. المخاطر والمضاعفات المحتملة</h3>
<ul><li><strong>نزيف:</strong> نزيف مطول يتطلب تدخلاً إضافياً</li><li><strong>عدوى:</strong> عدوى بعد الجراحة تتطلب مضادات حيوية</li><li><strong>تلف الأعصاب:</strong> تنميل مؤقت أو دائم أو تغير في الإحساس</li><li><strong>تندب:</strong> تكوين أنسجة ندبية في المكان الجراحي</li><li><strong>إزالة غير كاملة:</strong> قد لا تتم إزالة الأنسجة المرضية بالكامل</li><li><strong>تكرار:</strong> قد تعود الأكياس أو الآفات</li></ul>
<h3>٣. إقرار المريض</h3>
<p>أفهم طبيعة الجراحة المقترحة ومخاطرها وفوائدها وبدائلها. أوافق طوعاً على الإجراء.</p>
</div>`,
  },
  {
    name_en: 'Photography & Radiography Consent',
    name_ar: 'موافقة على التصوير السريري والأشعة',
    procedure_type: 'photography',
    description_en: 'Consent for clinical photography and radiographic imaging (X-rays, CBCT) for diagnostic and documentation purposes.',
    description_ar: 'موافقة على التصوير السريري والتصوير الإشعاعي (الأشعة السينية، CBCT) لأغراض التشخيص والتوثيق.',
    validity_days: 365,
    risks_en: 'Minimal radiation exposure, privacy concerns regarding photographs.',
    risks_ar: 'تعرض إشعاعي ضئيل، مخاوف تتعلق بالخصوصية بشأن الصور.',
    content_en: `<div style="font-family: Arial, sans-serif; line-height: 1.8;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">CONSENT FOR CLINICAL PHOTOGRAPHY & RADIOGRAPHY</h2>
<h3>1. PURPOSE</h3>
<p>I consent to clinical photography (intraoral and extraoral) and radiographic imaging (periapical X-rays, panoramic X-ray, cephalometric X-ray, CBCT scan) for the purposes of: diagnosis and treatment planning, documentation of treatment progress and outcomes, patient education, and communication with other healthcare providers or dental laboratories.</p>
<h3>2. RADIATION SAFETY</h3>
<p>I understand that dental radiographs involve minimal radiation exposure. Protective measures including lead aprons and thyroid collars are used. The clinic follows ALARA (As Low As Reasonably Achievable) principles for radiation safety.</p>
<h3>3. PHOTOGRAPHY CONSENT</h3>
<p>Regarding the use of my clinical photographs, I consent to:</p>
<ul><li>☐ Use for my dental records and treatment documentation only</li><li>☐ Use for educational purposes within the clinic (with identity obscured)</li><li>☐ Use for professional presentations, publications, or social media (with identity obscured)</li><li>☐ I do NOT consent to any use of photographs beyond my medical records</li></ul>
<h3>4. PRIVACY</h3>
<p>I understand that all photographs and radiographs are part of my protected health information and will be stored securely. My images will not be shared without my consent except as required by law or for direct patient care.</p>
<h3>5. PATIENT ACKNOWLEDGMENT</h3>
<p>I voluntarily consent to clinical photography and radiographic imaging as described above. I understand I may withdraw consent for photography use beyond my medical record at any time.</p>
</div>`,
    content_ar: `<div style="font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">إقرار موافقة على التصوير السريري والأشعة</h2>
<h3>١. الغرض</h3>
<p>أوافق على التصوير السريري (داخل وخارج الفم) والتصوير الإشعاعي (أشعة سينية، بانوراما، CBCT) لأغراض: التشخيص والتخطيط العلاجي، توثيق تقدم ونتائج العلاج، تثقيف المريض، والتواصل مع مقدمي الرعاية الصحية الآخرين أو مختبرات الأسنان.</p>
<h3>٢. سلامة الإشعاع</h3>
<p>أفهم أن أشعة الأسنان تنطوي على تعرض إشعاعي ضئيل. يتم استخدام تدابير وقائية بما في ذلك المريول الرصاصي وواقي الغدة الدرقية.</p>
<h3>٣. الموافقة على التصوير</h3>
<p>فيما يتعلق باستخدام صوري السريرية، أوافق على:</p>
<ul><li>☐ الاستخدام لسجلاتي السنية وتوثيق العلاج فقط</li><li>☐ الاستخدام للأغراض التعليمية داخل العيادة (مع إخفاء الهوية)</li><li>☐ الاستخدام للعروض المهنية أو المنشورات (مع إخفاء الهوية)</li><li>☐ لا أوافق على أي استخدام للصور خارج سجلاتي الطبية</li></ul>
<h3>٤. الخصوصية</h3>
<p>أفهم أن جميع الصور والأشعة هي جزء من معلوماتي الصحية المحمية وسيتم تخزينها بشكل آمن. لن تتم مشاركة صوري دون موافقتي إلا كما يتطلبه القانون.</p>
<h3>٥. إقرار المريض</h3>
<p>أوافق طوعاً على التصوير السريري والإشعاعي كما هو موصوف أعلاه. أفهم أنه يمكنني سحب الموافقة على استخدام الصور خارج سجلي الطبي في أي وقت.</p>
</div>`,
  },
];

async function seedTemplates() {
  console.log('Seeding professional consent templates...');
  
  // Delete old simple templates
  const { error: delErr } = await supabase
    .from('consent_templates')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  
  if (delErr) console.warn('Delete warning:', delErr.message);
  
  // Insert new professional templates
  for (const template of templates) {
    const { error } = await supabase
      .from('consent_templates')
      .insert({
        ...template,
        is_active: true,
      });
    
    if (error) {
      console.error(`Failed to insert ${template.name_en}:`, error.message);
    } else {
      console.log(`✓ ${template.name_en}`);
    }
  }
  
  console.log('\nDone! Inserted', templates.length, 'professional consent templates.');
}

seedTemplates().catch(console.error);
