<?php
/**
 * Template Name: Front Page
 * Homepage template – replicates the React HomePage.jsx
 *
 * @package Canine_Clinic
 */

get_header();
$is_rtl = is_rtl();
$contact_url  = get_permalink( get_page_by_path( 'contact' ) );
$about_url    = get_permalink( get_page_by_path( 'who-we-are' ) );
$services_url = get_permalink( get_page_by_path( 'services' ) );
?>

<!-- ====== HERO SECTION ====== -->
<section class="hero-section">
    <div class="hero-bg-decorations">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <div class="container hero-content">
        <div class="text-center">
            <h1 class="hero-title animate-on-scroll">
                <?php echo $is_rtl ? 'ابتسامتك،' : 'Your Smile, Our'; ?>
                <br>
                <span class="text-primary"><?php echo $is_rtl ? 'رفاهيتك' : 'well-being.'; ?></span>
            </h1>

            <!-- Animated Words -->
            <div class="hero-words" id="heroWords">
                <?php
                $words = $is_rtl
                    ? [ 'شغفنا', 'أولويتنا', 'وعدنا' ]
                    : [ 'Passion', 'Priority', 'Promise' ];
                foreach ( $words as $i => $word ) : ?>
                    <span class="hero-word<?php echo $i === 0 ? ' active' : ''; ?>" data-index="<?php echo $i; ?>">
                        <?php echo esc_html( $word ); ?>
                    </span>
                <?php endforeach; ?>
            </div>

            <p class="hero-subtitle animate-on-scroll">
                <?php echo $is_rtl
                    ? 'استمتع برعاية أسنان عالمية المستوى مع أحدث التقنيات وفريق متعاطف مكرس لابتسامتك المثالية.'
                    : 'Experience world-class dental care with cutting-edge technology and a compassionate team dedicated to your perfect smile.'; ?>
            </p>

            <div class="hero-buttons<?php echo $is_rtl ? ' rtl-reverse' : ''; ?> animate-on-scroll">
                <a href="<?php echo esc_url( $contact_url ); ?>" class="btn-primary<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                    <?php echo $is_rtl ? 'احجز استشارة مجانية' : 'Book Free Consultation'; ?>
                    <svg class="btn-icon<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                </a>
                <a href="<?php echo esc_url( $about_url ); ?>" class="btn-secondary">
                    <?php echo $is_rtl ? 'عرض الخدمات' : 'View Services'; ?>
                </a>
            </div>
        </div>
    </div>

    <!-- Scroll indicator -->
    <div class="scroll-indicator">
        <div class="scroll-mouse">
            <div class="scroll-dot"></div>
        </div>
    </div>
</section>

<!-- ====== FEATURES / WHY CHOOSE US ====== -->
<section class="features-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <span class="section-subtitle"><?php echo $is_rtl ? 'لماذا تختارنا' : 'Why Choose Us'; ?></span>
            <p class="section-desc"><?php echo $is_rtl ? 'اكتشف الفرق مع نهجنا المتمحور حول المريض' : 'Experience the difference with our patient-centered approach'; ?></p>
        </div>

        <div class="grid-3 features-grid">
            <?php
            $features = [
                [
                    'icon'  => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
                    'title' => $is_rtl ? 'فريق خبير' : 'Expert Team',
                    'desc'  => $is_rtl ? 'أطباء متخصصون معتمدون بسنوات من الخبرة' : 'Board-certified specialists with years of experience',
                ],
                [
                    'icon'  => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
                    'title' => $is_rtl ? 'تقنية حديثة' : 'Modern Technology',
                    'desc'  => $is_rtl ? 'أحدث المعدات لعلاجات دقيقة' : 'State-of-the-art equipment for precise treatments',
                ],
                [
                    'icon'  => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
                    'title' => $is_rtl ? 'راحة المريض' : 'Patient Comfort',
                    'desc'  => $is_rtl ? 'بيئة مريحة مع خيارات التخدير' : 'Relaxing environment with sedation options',
                ],
            ];
            foreach ( $features as $i => $f ) : ?>
                <div class="feature-card animate-on-scroll<?php echo $is_rtl ? ' text-right' : ' text-left'; ?>" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="feature-icon<?php echo $is_rtl ? ' ml-auto' : ''; ?>">
                        <?php echo $f['icon']; ?>
                    </div>
                    <h3><?php echo esc_html( $f['title'] ); ?></h3>
                    <p><?php echo esc_html( $f['desc'] ); ?></p>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ====== ABOUT SECTION ====== -->
<section class="about-section">
    <div class="container">
        <div class="grid-2 items-center<?php echo $is_rtl ? ' direction-rtl' : ''; ?>">
            <div class="<?php echo $is_rtl ? 'text-right order-1 lg-order-2' : ''; ?> animate-on-scroll">
                <span class="section-subtitle"><?php echo $is_rtl ? 'عن كانين كلينك' : 'About Canine Clinic'; ?></span>
                <h2 class="section-title">
                    <?php echo $is_rtl ? 'شريكك الموثوق لـ' : 'Your Trusted Partner for'; ?>
                    <span class="text-primary"><?php echo $is_rtl ? 'التميز في طب الأسنان' : 'Dental Excellence'; ?></span>
                </h2>
                <p class="section-text">
                    <?php echo $is_rtl
                        ? 'في كانين كلينك، نحن ملتزمون بتقديم خدمات رعاية أسنان استثنائية في بيئة ترحيبية ومهنية. مع أكثر من 20 عامًا من الخبرة، يضمن التزامنا بالتعلم المستمر حصول مرضانا على أحدث العلاجات المتاحة.'
                        : 'At Canine Clinic, we are dedicated to providing exceptional dental care services in a welcoming and professional environment. With over 20 years of experience, our commitment to continuous learning ensures that our patients receive the most advanced treatments available.'; ?>
                </p>
                <a href="<?php echo esc_url( $about_url ); ?>" class="btn-primary">
                    <?php echo $is_rtl ? 'اعرف المزيد عنا' : 'Learn More About Us'; ?>
                </a>
            </div>
            <div class="about-image-wrapper animate-on-scroll<?php echo $is_rtl ? ' order-2 lg-order-1' : ''; ?>">
                <div class="about-image">
                    <img src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=700&fit=crop" alt="Dental Care" loading="lazy">
                </div>
                <div class="about-decor-block"></div>
                <div class="about-decor-circle"></div>
                <div class="about-stats-card">
                    <div class="stat-number">20+</div>
                    <div class="stat-label"><?php echo $is_rtl ? 'سنوات الخبرة' : 'Years of Experience'; ?></div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ====== STATS BAR ====== -->
<section class="stats-bar">
    <div class="container">
        <div class="grid-3">
            <?php
            $stats = [
                [ 'num' => '20+',  'label' => $is_rtl ? 'سنوات الخبرة' : 'Years of Experience' ],
                [ 'num' => '15K+', 'label' => $is_rtl ? 'مريض سعيد' : 'Happy Patients' ],
                [ 'num' => '6',    'label' => $is_rtl ? 'طبيب خبير' : 'Expert Doctors' ],
            ];
            foreach ( $stats as $i => $s ) : ?>
                <div class="stat animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="number"><?php echo esc_html( $s['num'] ); ?></div>
                    <div class="label"><?php echo esc_html( $s['label'] ); ?></div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ====== SERVICES GRID ====== -->
<section class="services-home-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <span class="section-subtitle"><?php echo $is_rtl ? 'خدماتنا' : 'Our Services'; ?></span>
            <h2 class="section-title"><?php echo $is_rtl ? 'حلول أسنان شاملة لكل احتياج' : 'Comprehensive dental solutions for every need'; ?></h2>
        </div>

        <div class="services-image-grid">
            <?php
            $home_services = [
                [ 'title' => $is_rtl ? 'طب الأسنان العام' : 'General Dentistry',     'img' => 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'طب الأسنان التجميلي' : 'Cosmetic Dentistry',   'img' => 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'زراعة الأسنان' : 'Dental Implants',             'img' => 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'تقويم الأسنان' : 'Orthodontics',                'img' => 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'تبييض الأسنان' : 'Teeth Whitening',            'img' => 'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'علاج الجذور' : 'Root Canal',                    'img' => 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'جراحة الفم' : 'Oral Surgery',                   'img' => 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&h=300&fit=crop' ],
                [ 'title' => $is_rtl ? 'طب أسنان الأطفال' : 'Pediatric Dentistry',     'img' => 'https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=400&h=300&fit=crop' ],
            ];
            foreach ( $home_services as $i => $svc ) : ?>
                <a href="<?php echo esc_url( $services_url ); ?>" class="service-image-card animate-on-scroll" style="animation-delay:<?php echo $i * 50; ?>ms;">
                    <img src="<?php echo esc_url( $svc['img'] ); ?>" alt="<?php echo esc_attr( $svc['title'] ); ?>" loading="lazy">
                    <div class="service-image-overlay"></div>
                    <div class="service-image-title <?php echo $is_rtl ? 'text-right' : 'text-left'; ?>">
                        <h3><?php echo esc_html( $svc['title'] ); ?></h3>
                    </div>
                    <div class="service-image-arrow<?php echo $is_rtl ? ' rtl-flip' : ''; ?>">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                        </svg>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>

        <div class="text-center" style="margin-top:3rem;">
            <a href="<?php echo esc_url( $services_url ); ?>" class="btn-primary<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <?php echo $is_rtl ? 'عرض الكل' : 'View All'; ?>
                <svg class="btn-icon<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
            </a>
        </div>
    </div>
</section>

<!-- ====== VISION & MISSION ====== -->
<section class="vision-mission-section">
    <div class="container">
        <div class="grid-2">
            <!-- Vision -->
            <div class="vm-card animate-on-scroll<?php echo $is_rtl ? ' text-right' : ' text-left'; ?>">
                <div class="vm-icon<?php echo $is_rtl ? ' ml-auto' : ''; ?>">
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                </div>
                <h3><?php echo $is_rtl ? 'رؤيتنا' : 'Our Vision'; ?></h3>
                <p><?php echo $is_rtl
                    ? 'أن نكون المزود الرائد لرعاية الأسنان، معترف بنا للتميز في رعاية المرضى والعلاجات المبتكرة وإنشاء ابتسامات جميلة وصحية تدوم مدى الحياة.'
                    : 'To be the leading dental care provider, recognized for excellence in patient care, innovative treatments, and creating beautiful, healthy smiles that last a lifetime.'; ?></p>
            </div>
            <!-- Mission -->
            <div class="vm-card animate-on-scroll<?php echo $is_rtl ? ' text-right' : ' text-left'; ?>">
                <div class="vm-icon<?php echo $is_rtl ? ' ml-auto' : ''; ?>">
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                    </svg>
                </div>
                <h3><?php echo $is_rtl ? 'مهمتنا' : 'Our Mission'; ?></h3>
                <p><?php echo $is_rtl
                    ? 'تقديم رعاية أسنان استثنائية باستخدام أحدث التقنيات مع الحفاظ على بيئة دافئة ومرحبة يشعر فيها المرضى بالراحة والثقة في علاجهم.'
                    : 'To deliver exceptional dental care using the latest technology while maintaining a warm, welcoming environment where patients feel comfortable and confident in their treatment.'; ?></p>
            </div>
        </div>
    </div>
</section>

<!-- ====== CTA SECTION ====== -->
<section class="cta-section">
    <div class="cta-bg-decorations">
        <div class="cta-blob cta-blob-1"></div>
        <div class="cta-blob cta-blob-2"></div>
    </div>
    <div class="container text-center" style="position:relative;z-index:1;">
        <div class="animate-on-scroll">
            <h2 class="cta-title"><?php echo $is_rtl ? 'هل أنت مستعد لتغيير ابتسامتك؟' : 'Ready to Transform Your Smile?'; ?></h2>
            <p class="cta-text"><?php echo $is_rtl
                ? 'احجز استشارتك اليوم واتخذ الخطوة الأولى نحو صحة أفضل وثقة أكبر.'
                : 'Book your consultation today and take the first step towards a healthier, more confident you.'; ?></p>
            <a href="<?php echo esc_url( $contact_url ); ?>" class="btn-white<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <?php echo $is_rtl ? 'حدد موعدك' : 'Schedule Your Appointment'; ?>
                <svg class="btn-icon<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
            </a>
        </div>
    </div>
</section>

<?php get_footer();
