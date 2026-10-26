<?php
/**
 * Template Name: Who We Are
 * About / Team page – replicates AboutPage.jsx
 *
 * @package Canine_Clinic
 */

get_header();
$is_rtl       = is_rtl();
$contact_url  = get_permalink( get_page_by_path( 'contact' ) );
$services_url = get_permalink( get_page_by_path( 'services' ) );
?>

<!-- Hero -->
<section class="page-hero">
    <div class="hero-bg-decorations">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
    </div>
    <div class="container text-center" style="position:relative;z-index:1;">
        <span class="section-subtitle animate-on-scroll"><?php echo $is_rtl ? 'من نحن' : 'About Us'; ?></span>
        <h1 class="hero-title animate-on-scroll"><?php echo $is_rtl ? 'من نحن' : 'Who We Are'; ?></h1>
        <p class="hero-subtitle animate-on-scroll"><?php echo $is_rtl
            ? 'فريق من أخصائيي الأسنان المتحمسين المكرسين لابتسامتك'
            : 'A team of passionate dental professionals dedicated to your smile'; ?></p>
    </div>
</section>

<!-- Stats -->
<section class="stats-bar" style="margin-top:-2.5rem;position:relative;z-index:2;">
    <div class="container">
        <div class="grid-4">
            <?php
            $stats = [
                [ 'num' => '20+',  'label' => $is_rtl ? 'سنوات الخبرة' : 'Years of Experience' ],
                [ 'num' => '15K+', 'label' => $is_rtl ? 'مريض سعيد' : 'Happy Patients' ],
                [ 'num' => '6',    'label' => $is_rtl ? 'أخصائي خبير' : 'Expert Specialists' ],
                [ 'num' => '99%',  'label' => $is_rtl ? 'رضا المرضى' : 'Patient Satisfaction' ],
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

<!-- Our Story -->
<section class="about-section" style="padding-top:6rem;padding-bottom:6rem;">
    <div class="container">
        <div class="grid-2 items-center">
            <div class="<?php echo $is_rtl ? 'text-right order-1 lg-order-2' : ''; ?> animate-on-scroll">
                <span class="section-subtitle"><?php echo $is_rtl ? 'قصتنا' : 'Our Story'; ?></span>
                <h2 class="section-title">
                    <?php echo $is_rtl ? 'إرث من' : 'A Legacy of'; ?>
                    <span class="text-primary"><?php echo $is_rtl ? 'التميز في طب الأسنان' : 'Dental Excellence'; ?></span>
                </h2>
                <p class="section-text"><?php echo $is_rtl
                    ? 'تأسست كانين كلينك في عام 2006، ونمت من عيادة صغيرة إلى مركز شامل لرعاية الأسنان، يخدم أكثر من 15,000 مريض راضٍ. كانت رحلتنا مدفوعة بمهمة بسيطة: تقديم رعاية أسنان عالمية المستوى في بيئة مريحة ومرحبة.'
                    : 'Founded in 2006, Canine Clinic has grown from a small practice to a comprehensive dental care center, serving over 15,000 satisfied patients. Our journey has been driven by a simple mission: to provide world-class dental care in a comfortable, welcoming environment.'; ?></p>
                <p class="section-text"><?php echo $is_rtl
                    ? 'نؤمن بأن الجميع يستحق ابتسامة صحية وجميلة. لهذا استثمرنا في أحدث التقنيات، وجمعنا فريقًا من أفضل المتخصصين، وأنشأنا نهجًا يركز على المريض ويضع احتياجاتك في المقام الأول.'
                    : "We believe that everyone deserves a healthy, beautiful smile. That's why we've invested in the latest technology, assembled a team of top-tier specialists, and created a patient-centered approach that puts your needs first."; ?></p>
                <a href="<?php echo esc_url( $services_url ); ?>" class="btn-primary<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                    <?php echo $is_rtl ? 'استكشف خدماتنا' : 'Explore Our Services'; ?>
                    <svg class="btn-icon<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </a>
            </div>
            <div class="about-image-wrapper animate-on-scroll<?php echo $is_rtl ? ' order-2 lg-order-1' : ''; ?>">
                <div class="about-image">
                    <img src="https://images.unsplash.com/photo-1629909615184-74f495363b67?w=600&h=700&fit=crop" alt="Our Dental Clinic" loading="lazy">
                </div>
                <div class="about-decor-block"></div>
                <div class="about-decor-circle"></div>
            </div>
        </div>
    </div>
</section>

<!-- Our Values -->
<section class="values-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <span class="section-subtitle"><?php echo $is_rtl ? 'قيمنا' : 'Our Values'; ?></span>
            <h2 class="section-title"><?php echo $is_rtl ? 'ما يدفعنا' : 'What Drives Us'; ?></h2>
        </div>
        <div class="grid-4">
            <?php
            $values = [
                [ 'title' => $is_rtl ? 'التميز' : 'Excellence',   'desc' => $is_rtl ? 'نسعى لأعلى المعايير في كل علاج نقدمه.' : 'We strive for the highest standards in every treatment we provide.',   'icon' => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>' ],
                [ 'title' => $is_rtl ? 'الابتكار' : 'Innovation',   'desc' => $is_rtl ? 'تبني أحدث التقنيات وتقنيات طب الأسنان المتقدمة.' : 'Embracing the latest technology and advanced dental techniques.',     'icon' => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>' ],
                [ 'title' => $is_rtl ? 'التعاطف' : 'Compassion',   'desc' => $is_rtl ? 'راحتك ورفاهيتك هي دائمًا أولويتنا القصوى.' : 'Your comfort and wellbeing are always our top priority.',              'icon' => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' ],
                [ 'title' => $is_rtl ? 'النزاهة' : 'Integrity',     'desc' => $is_rtl ? 'صادقون وشفافون وأخلاقيون في كل ما نفعله.' : 'Honest, transparent, and ethical in everything we do.',                 'icon' => '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>' ],
            ];
            foreach ( $values as $i => $v ) : ?>
                <div class="value-card animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="value-icon"><?php echo $v['icon']; ?></div>
                    <h3><?php echo esc_html( $v['title'] ); ?></h3>
                    <p><?php echo esc_html( $v['desc'] ); ?></p>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Our Team -->
<section class="team-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <span class="section-subtitle"><?php echo $is_rtl ? 'تعرف على فريقنا' : 'Meet Our Team'; ?></span>
            <h2 class="section-title"><?php echo $is_rtl ? 'تعرف على أطبائنا' : 'Meet Our Specialists'; ?></h2>
            <p class="section-desc"><?php echo $is_rtl
                ? 'متخصصون خبراء ملتزمون بصحة أسنانك'
                : 'Expert professionals committed to your dental health'; ?></p>
        </div>

        <?php
        // Try CPT doctors first
        $docs = new WP_Query([ 'post_type' => 'cc_doctor', 'posts_per_page' => -1, 'orderby' => 'menu_order', 'order' => 'ASC' ]);
        if ( $docs->have_posts() ) :
            echo '<div class="grid-3">';
            while ( $docs->have_posts() ) : $docs->the_post(); ?>
                <div class="team-card animate-on-scroll">
                    <div class="team-image"><?php the_post_thumbnail( 'medium_large' ); ?></div>
                    <div class="team-info <?php echo $is_rtl ? 'text-right' : 'text-left'; ?>">
                        <h3><?php the_title(); ?></h3>
                        <p class="team-role"><?php echo esc_html( get_post_meta( get_the_ID(), 'role', true ) ); ?></p>
                        <p class="team-specialty"><?php echo esc_html( get_post_meta( get_the_ID(), 'specialty', true ) ); ?></p>
                        <p class="team-desc"><?php the_excerpt(); ?></p>
                    </div>
                </div>
            <?php endwhile;
            echo '</div>';
            wp_reset_postdata();
        else :
            // Static fallback
            $team = [
                [ 'name' => $is_rtl ? 'د. عبدالرحمن محمد البلتاجي' : 'Dr. Abdulrahman Mohamed El-Beltagy', 'role' => $is_rtl ? 'أخصائي تقويم الأسنان' : 'Orthodontist', 'spec' => $is_rtl ? 'محاذاة الأسنان والفك' : 'Teeth & Jaw Alignment', 'desc' => $is_rtl ? 'متخصص في محاذاة الأسنان والفك لتحقيق ابتسامة صحية ومتناسقة.' : 'Specialized in teeth and jaw alignment to achieve a healthy, harmonious smile.', 'img' => 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=500&fit=crop' ],
                [ 'name' => $is_rtl ? 'د. مهند عبدالوهاب' : 'Dr. Muhannad Abdulwahab', 'role' => $is_rtl ? 'جراح فم وأخصائي زراعة' : 'Oral Surgeon & Implantologist', 'spec' => $is_rtl ? 'جراحة الفم وزراعة الأسنان' : 'Oral Surgery & Dental Implants', 'desc' => $is_rtl ? 'يقدم خدمات جراحة الفم والوجه والفكين وزراعة الأسنان لضمان استقرار الأسنان وصحة الفم.' : 'Provides oral and maxillofacial surgery and dental implant services.', 'img' => 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=500&fit=crop' ],
                [ 'name' => $is_rtl ? 'د. سالم أمين' : 'Dr. Salem Amin', 'role' => $is_rtl ? 'أخصائي تركيبات الأسنان' : 'Prosthodontist', 'spec' => $is_rtl ? 'تركيبات الأسنان والترميمات' : 'Dental Prosthetics & Restorations', 'desc' => $is_rtl ? 'خبير في تركيبات الأسنان والترميمات للحفاظ على وظيفة الفم ومظهره الطبيعي.' : 'Expert in dental prosthetics and restorations.', 'img' => 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=500&fit=crop' ],
                [ 'name' => $is_rtl ? 'د. أحمد حمدي' : 'Dr. Ahmed Hamdy', 'role' => $is_rtl ? 'أخصائي طب الأسنان التجميلي' : 'Cosmetic Dentistry Specialist', 'spec' => $is_rtl ? 'الحشوات التجميلية وتصميم الابتسامة' : 'Cosmetic Fillings & Smile Design', 'desc' => $is_rtl ? 'يقدم حلول الحشوات التجميلية لتصحيح العيوب الطفيفة وتحسين شكل الأسنان وابتسامة المريض.' : 'Provides cosmetic filling solutions to enhance teeth appearance.', 'img' => 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=500&fit=crop' ],
                [ 'name' => $is_rtl ? 'د. عمر نادر' : 'Dr. Omar Nader', 'role' => $is_rtl ? 'أخصائي علاج الجذور' : 'Endodontist', 'spec' => $is_rtl ? 'علاج قناة الجذر' : 'Root Canal Treatment', 'desc' => $is_rtl ? 'متخصص في علاج قناة الجذر للحفاظ على الأسنان الطبيعية ومنع الخلع أو التسوس.' : 'Specialized in root canal treatment to preserve natural teeth.', 'img' => 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&h=500&fit=crop' ],
                [ 'name' => $is_rtl ? 'د. آية' : 'Dr. Aya', 'role' => $is_rtl ? 'طبيبة أسنان عامة وترميمية' : 'General & Restorative Dentist', 'spec' => $is_rtl ? 'علاج الجذور والتركيبات والحشوات التجميلية' : 'Root Canal, Prosthetics & Cosmetic Fillings', 'desc' => $is_rtl ? 'تقدم علاجات قناة الجذر وتركيبات الأسنان والحشوات التجميلية مع التركيز على رعاية المرضى.' : 'Provides root canal, prosthetics and cosmetic fillings with patient focus.', 'img' => 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=500&fit=crop' ],
            ];
            echo '<div class="grid-3">';
            foreach ( $team as $i => $m ) : ?>
                <div class="team-card animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="team-image"><img src="<?php echo esc_url( $m['img'] ); ?>" alt="<?php echo esc_attr( $m['name'] ); ?>" loading="lazy"></div>
                    <div class="team-info <?php echo $is_rtl ? 'text-right' : 'text-left'; ?>">
                        <h3><?php echo esc_html( $m['name'] ); ?></h3>
                        <p class="team-role"><?php echo esc_html( $m['role'] ); ?></p>
                        <p class="team-specialty"><?php echo esc_html( $m['spec'] ); ?></p>
                        <p class="team-desc"><?php echo esc_html( $m['desc'] ); ?></p>
                    </div>
                </div>
            <?php endforeach;
            echo '</div>';
        endif; ?>
    </div>
</section>

<!-- Mission CTA -->
<section class="cta-section">
    <div class="cta-bg-decorations"><div class="cta-blob cta-blob-1"></div><div class="cta-blob cta-blob-2"></div></div>
    <div class="container text-center" style="position:relative;z-index:1;">
        <div class="animate-on-scroll">
            <span class="cta-label"><?php echo $is_rtl ? 'مهمتنا' : 'Our Mission'; ?></span>
            <h2 class="cta-title"><?php echo $is_rtl ? 'نغير الابتسامات، نغير الحياة' : 'Transforming Smiles, Changing Lives'; ?></h2>
            <p class="cta-text"><?php echo $is_rtl
                ? 'التزامنا هو تغيير الحياة من خلال رعاية أسنان استثنائية، ابتسامة واحدة في كل مرة.'
                : 'Our commitment is to transform lives through exceptional dental care, one smile at a time.'; ?></p>
            <a href="<?php echo esc_url( $contact_url ); ?>" class="btn-white<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <?php echo $is_rtl ? 'حدد موعدك' : 'Schedule Your Visit'; ?>
                <svg class="btn-icon<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
        </div>
    </div>
</section>

<?php get_footer();
