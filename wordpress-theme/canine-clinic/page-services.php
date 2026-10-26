<?php
/**
 * Template Name: Services Page
 * Services page – replicates ServicesPage.jsx
 *
 * @package Canine_Clinic
 */

get_header();
$is_rtl      = is_rtl();
$contact_url = get_permalink( get_page_by_path( 'contact' ) );
?>

<!-- Hero -->
<section class="page-hero">
    <div class="container text-center">
        <h1 class="hero-title animate-on-scroll"><?php echo $is_rtl ? 'خدماتنا' : 'Our Services'; ?></h1>
        <p class="hero-subtitle animate-on-scroll"><?php echo $is_rtl
            ? 'حلول أسنان شاملة مصممة لاحتياجاتك الفريدة، تُقدم بدقة وعناية'
            : 'Comprehensive dental solutions tailored to your unique needs, delivered with precision and care'; ?></p>
    </div>
</section>

<!-- Services Grid -->
<section class="services-grid-section">
    <div class="container">
        <?php
        // Try to get services from CPT first
        $services_query = new WP_Query([
            'post_type'      => 'cc_service',
            'posts_per_page' => -1,
            'orderby'        => 'menu_order',
            'order'          => 'ASC',
        ]);

        if ( $services_query->have_posts() ) :
            echo '<div class="grid-3">';
            while ( $services_query->have_posts() ) : $services_query->the_post(); ?>
                <div class="service-card animate-on-scroll">
                    <div class="service-card-header">
                        <?php if ( has_post_thumbnail() ) : ?>
                            <div class="service-card-thumb">
                                <?php the_post_thumbnail( 'thumbnail' ); ?>
                            </div>
                        <?php endif; ?>
                        <h3 class="<?php echo $is_rtl ? 'text-right' : 'text-left'; ?>"><?php the_title(); ?></h3>
                        <p class="<?php echo $is_rtl ? 'text-right' : 'text-left'; ?>"><?php the_excerpt(); ?></p>
                    </div>
                    <div class="service-card-body">
                        <?php the_content(); ?>
                    </div>
                </div>
            <?php endwhile;
            echo '</div>';
            wp_reset_postdata();
        else :
            // Static fallback (same data as React)
            $static_services = [
                [
                    'name'  => $is_rtl ? 'طب الأسنان العام' : 'General Dentistry',
                    'desc'  => $is_rtl ? 'رعاية شاملة لاحتياجاتك اليومية للأسنان' : 'Comprehensive care for your daily dental needs',
                    'img'   => 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=400&fit=crop',
                    'items' => $is_rtl
                        ? ['الفحوصات الدورية والتنظيف','حشوات الأسنان','خلع الأسنان','علاج اللثة','علاج الفلورايد','حشوات الأسنان الوقائية']
                        : ['Regular Check-ups & Cleaning','Dental Fillings','Tooth Extractions','Periodontal Treatment','Fluoride Treatment','Dental Sealants'],
                ],
                [
                    'name'  => $is_rtl ? 'طب الأسنان التجميلي' : 'Cosmetic Dentistry',
                    'desc'  => $is_rtl ? 'حول ابتسامتك بعلاجات تجميلية متميزة' : 'Transform your smile with aesthetic treatments',
                    'img'   => 'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=400&h=400&fit=crop',
                    'items' => $is_rtl
                        ? ['تبييض الأسنان','قشور البورسلين','ترميم الأسنان','تجميل الابتسامة','تجميل اللثة','الحشوات التجميلية']
                        : ['Teeth Whitening','Porcelain Veneers','Dental Bonding','Smile Makeover','Gum Contouring','Composite Fillings'],
                ],
                [
                    'name'  => $is_rtl ? 'طب الأسنان الترميمي' : 'Restorative Dentistry',
                    'desc'  => $is_rtl ? 'استعادة الوظيفة والجمال للأسنان المتضررة' : 'Restore function and beauty to damaged teeth',
                    'img'   => 'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?w=400&h=400&fit=crop',
                    'items' => $is_rtl
                        ? ['التيجان والجسور','زراعة الأسنان','أطقم الأسنان','الحشوات الداخلية والخارجية','إعادة بناء الفم الكامل','أطقم الأسنان المدعومة بالزرعات']
                        : ['Dental Crowns & Bridges','Dental Implants','Dentures','Inlays & Onlays','Full Mouth Reconstruction','Implant-Supported Dentures'],
                ],
                [
                    'name'  => $is_rtl ? 'تقويم الأسنان' : 'Orthodontics',
                    'desc'  => $is_rtl ? 'قوّم أسنانك للحصول على ابتسامة مثالية' : 'Straighten your teeth for a perfect smile',
                    'img'   => 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=400&fit=crop',
                    'items' => $is_rtl
                        ? ['التقويم التقليدي','التقويم الشفاف','إنفيزلاين','المثبتات','علاج تقويم مبكر','تقويم الكبار']
                        : ['Traditional Braces','Clear Aligners','Invisalign','Retainers','Early Orthodontic Treatment','Adult Orthodontics'],
                ],
                [
                    'name'  => $is_rtl ? 'طب أسنان الأطفال' : 'Pediatric Dentistry',
                    'desc'  => $is_rtl ? 'رعاية متخصصة لصحة أسنان الأطفال' : "Specialized care for children's dental health",
                    'img'   => 'https://images.unsplash.com/photo-1514849302-984523450cf4?w=400&h=400&fit=crop',
                    'items' => $is_rtl
                        ? ['فحص أسنان الأطفال','الرعاية الوقائية','علاج الفلورايد','الحشوات الوقائية','علاج التسوس','رعاية الطوارئ']
                        : ["Children's Dental Exams",'Preventive Care','Fluoride Treatment','Dental Sealants','Cavity Treatment','Emergency Dental Care'],
                ],
                [
                    'name'  => $is_rtl ? 'الإجراءات المتقدمة' : 'Advanced Procedures',
                    'desc'  => $is_rtl ? 'علاجات متطورة للحالات المعقدة' : 'Cutting-edge treatments for complex cases',
                    'img'   => 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400&h=400&fit=crop',
                    'items' => $is_rtl
                        ? ['علاج جذور الأسنان','خلع ضرس العقل','زراعة العظام','رفع الجيب الأنفي','زراعة الكل على أربعة','طب الأسنان بالليزر']
                        : ['Root Canal Therapy','Wisdom Teeth Removal','Bone Grafting','Sinus Lift','All-on-4 Implants','Laser Dentistry'],
                ],
            ];
            echo '<div class="grid-3">';
            foreach ( $static_services as $i => $svc ) : ?>
                <div class="service-card animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="service-card-header">
                        <div class="service-card-thumb">
                            <img src="<?php echo esc_url( $svc['img'] ); ?>" alt="<?php echo esc_attr( $svc['name'] ); ?>" loading="lazy">
                        </div>
                        <h3 class="<?php echo $is_rtl ? 'text-right' : 'text-left'; ?>"><?php echo esc_html( $svc['name'] ); ?></h3>
                        <p class="<?php echo $is_rtl ? 'text-right' : 'text-left'; ?>"><?php echo esc_html( $svc['desc'] ); ?></p>
                    </div>
                    <div class="service-card-body">
                        <ul class="service-features">
                            <?php foreach ( $svc['items'] as $item ) : ?>
                                <li class="<?php echo $is_rtl ? 'rtl-reverse text-right' : ''; ?>">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="check-icon">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    <span><?php echo esc_html( $item ); ?></span>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                </div>
            <?php endforeach;
            echo '</div>';
        endif; ?>
    </div>
</section>

<!-- Technologies -->
<section class="technologies-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <h2 class="section-title"><?php echo $is_rtl ? 'تقنيات متقدمة' : 'Advanced Technology'; ?></h2>
            <p class="section-desc"><?php echo $is_rtl ? 'معدات حديثة لنتائج متفوقة' : 'State-of-the-art equipment for superior results'; ?></p>
        </div>
        <div class="grid-4">
            <?php
            $techs = [
                [ 'name' => $is_rtl ? 'التصوير الرقمي ثلاثي الأبعاد' : '3D Digital Imaging', 'desc' => $is_rtl ? 'تصوير متقدم لتشخيص دقيق' : 'Advanced imaging for precise diagnostics', 'img' => 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=300&h=300&fit=crop' ],
                [ 'name' => $is_rtl ? 'طب الأسنان بالليزر' : 'Laser Dentistry', 'desc' => $is_rtl ? 'علاجات بأقل تدخل جراحي' : 'Minimally invasive treatments', 'img' => 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=300&h=300&fit=crop' ],
                [ 'name' => $is_rtl ? 'تقنية CAD/CAM' : 'CAD/CAM Technology', 'desc' => $is_rtl ? 'ترميمات أسنان في نفس اليوم' : 'Same-day dental restorations', 'img' => 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=300&h=300&fit=crop' ],
                [ 'name' => $is_rtl ? 'خيارات التخدير' : 'Sedation Options', 'desc' => $is_rtl ? 'علاجات مريحة بدون قلق' : 'Comfortable, anxiety-free treatments', 'img' => 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=300&h=300&fit=crop' ],
            ];
            foreach ( $techs as $i => $tech ) : ?>
                <div class="tech-card animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="tech-thumb"><img src="<?php echo esc_url( $tech['img'] ); ?>" alt="<?php echo esc_attr( $tech['name'] ); ?>" loading="lazy"></div>
                    <h3><?php echo esc_html( $tech['name'] ); ?></h3>
                    <p><?php echo esc_html( $tech['desc'] ); ?></p>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- CTA -->
<section class="cta-section">
    <div class="container text-center" style="position:relative;z-index:1;">
        <div class="animate-on-scroll">
            <h2 class="cta-title"><?php echo $is_rtl ? 'هل أنت مستعد لتغيير ابتسامتك؟' : 'Ready to Transform Your Smile?'; ?></h2>
            <p class="cta-text"><?php echo $is_rtl
                ? 'احجز استشارتك اليوم واكتشف الفرق الذي يمكن أن تحققه الرعاية المتخصصة'
                : 'Schedule your consultation today and discover the difference expert dental care can make'; ?></p>
            <a href="<?php echo esc_url( $contact_url ); ?>" class="btn-white">
                <?php echo $is_rtl ? 'احجز موعد' : 'Book Appointment'; ?>
            </a>
        </div>
    </div>
</section>

<?php get_footer();
