<?php
/**
 * Template Name: Testimonials Page
 * Testimonials – replicates TestimonialsPage.jsx
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
        <h1 class="hero-title animate-on-scroll"><?php echo $is_rtl ? 'آراء المرضى' : 'Patient Testimonials'; ?></h1>
        <p class="hero-subtitle animate-on-scroll"><?php echo $is_rtl
            ? 'قصص حقيقية من مرضى حقيقيين عاشوا تجربة كانين كلينك المتميزة'
            : 'Real stories from real patients who have experienced the Canine Clinic difference'; ?></p>
    </div>
</section>

<!-- Stats -->
<section class="testimonials-stats">
    <div class="container">
        <div class="grid-4">
            <?php
            $tstats = [
                [ 'num' => '15K+',  'label' => $is_rtl ? 'مريض سعيد' : 'Happy Patients' ],
                [ 'num' => '4.9',   'label' => $is_rtl ? 'متوسط التقييم' : 'Average Rating' ],
                [ 'num' => '99%',   'label' => $is_rtl ? 'معدل الرضا' : 'Satisfaction Rate' ],
                [ 'num' => '500+',  'label' => $is_rtl ? 'تقييم 5 نجوم' : '5-Star Reviews' ],
            ];
            foreach ( $tstats as $i => $s ) : ?>
                <div class="testimonial-stat animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="stat-num"><?php echo esc_html( $s['num'] ); ?></div>
                    <div class="stat-lbl"><?php echo esc_html( $s['label'] ); ?></div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Testimonials Grid -->
<section class="testimonials-grid-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <span class="section-subtitle"><?php echo $is_rtl ? 'ماذا يقول مرضانا' : 'What Our Patients Say'; ?></span>
            <h2 class="section-title"><?php echo $is_rtl
                ? 'اكتشف لماذا يختار المرضى كانين كلينك لرعاية أسنانهم'
                : 'Discover why patients choose Canine Clinic for their dental care'; ?></h2>
        </div>

        <?php
        // Try CPT testimonials first
        $tquery = new WP_Query([ 'post_type' => 'cc_testimonial', 'posts_per_page' => 9 ]);
        if ( $tquery->have_posts() ) :
            echo '<div class="grid-3">';
            while ( $tquery->have_posts() ) : $tquery->the_post(); ?>
                <div class="testimonial-card animate-on-scroll">
                    <div class="stars">★★★★★</div>
                    <div class="testimonial-text"><?php the_content(); ?></div>
                    <div class="testimonial-author">
                        <strong><?php the_title(); ?></strong>
                        <span><?php echo esc_html( get_post_meta( get_the_ID(), 'treatment', true ) ); ?></span>
                    </div>
                </div>
            <?php endwhile;
            echo '</div>';
            wp_reset_postdata();
        else :
            // Static fallback
            $testimonials = [
                [ 'name' => $is_rtl ? 'أحمد محمد' : 'Ahmed Mohamed',     'text' => $is_rtl ? 'أفضل عيادة أسنان في القاهرة! الدكتور عبدالرحمن ممتاز في تقويم الأسنان.' : 'Best dental clinic in Cairo! Dr. Abdulrahman is excellent with orthodontics.', 'treatment' => $is_rtl ? 'تقويم الأسنان' : 'Orthodontics' ],
                [ 'name' => $is_rtl ? 'سارة حسن' : 'Sara Hassan',        'text' => $is_rtl ? 'تجربة رائعة مع زراعة الأسنان. النتائج مذهلة والفريق محترف جدًا.' : 'Amazing experience with dental implants. Results are stunning and team is very professional.', 'treatment' => $is_rtl ? 'زراعة الأسنان' : 'Dental Implants' ],
                [ 'name' => $is_rtl ? 'محمود علي' : 'Mahmoud Ali',        'text' => $is_rtl ? 'خدمة ممتازة وأسعار معقولة. أنصح الجميع بزيارة كانين كلينك.' : 'Excellent service and reasonable prices. I recommend everyone to visit Canine Clinic.', 'treatment' => $is_rtl ? 'تبييض الأسنان' : 'Teeth Whitening' ],
                [ 'name' => $is_rtl ? 'نورا إبراهيم' : 'Noura Ibrahim',  'text' => $is_rtl ? 'كنت خائفة من طبيب الأسنان لكن فريق كانين كلينك جعلني أشعر بالراحة.' : 'I was afraid of the dentist but the Canine Clinic team made me feel comfortable.', 'treatment' => $is_rtl ? 'طب أسنان عام' : 'General Dentistry' ],
                [ 'name' => $is_rtl ? 'خالد عمر' : 'Khaled Omar',        'text' => $is_rtl ? 'الدكتور مهند أفضل جراح فم! العملية كانت سهلة والتعافي كان سريعًا.' : 'Dr. Muhannad is the best oral surgeon! The procedure was easy and recovery was quick.', 'treatment' => $is_rtl ? 'جراحة الفم' : 'Oral Surgery' ],
                [ 'name' => $is_rtl ? 'فاطمة أحمد' : 'Fatma Ahmed',      'text' => $is_rtl ? 'ابتسامتي تغيرت تمامًا بفضل الفينير. شكرًا دكتور أحمد!' : 'My smile completely changed thanks to the veneers. Thank you Dr. Ahmed!', 'treatment' => $is_rtl ? 'فينير' : 'Veneers' ],
            ];
            echo '<div class="grid-3">';
            foreach ( $testimonials as $i => $t ) : ?>
                <div class="testimonial-card animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="stars">★★★★★</div>
                    <p class="testimonial-text"><?php echo esc_html( $t['text'] ); ?></p>
                    <div class="testimonial-author">
                        <strong><?php echo esc_html( $t['name'] ); ?></strong>
                        <span><?php echo esc_html( $t['treatment'] ); ?></span>
                    </div>
                </div>
            <?php endforeach;
            echo '</div>';
        endif; ?>
    </div>
</section>

<!-- Video Testimonials Placeholder -->
<section class="video-testimonials-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <h2 class="section-title"><?php echo $is_rtl ? 'شهادات الفيديو' : 'Video Testimonials'; ?></h2>
            <p class="section-desc"><?php echo $is_rtl ? 'شاهد تجارب المرضى الحقيقية' : 'Watch real patient experiences'; ?></p>
        </div>
        <div class="grid-3">
            <?php for ( $i = 1; $i <= 3; $i++ ) : ?>
                <div class="video-placeholder animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="video-thumb">
                        <div class="play-btn">
                            <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <p><?php printf( '%s %d', $is_rtl ? 'فيديو' : 'Video', $i ); ?></p>
                </div>
            <?php endfor; ?>
        </div>
    </div>
</section>

<!-- CTA -->
<section class="cta-section">
    <div class="container text-center" style="position:relative;z-index:1;">
        <div class="animate-on-scroll">
            <h2 class="cta-title"><?php echo $is_rtl ? 'هل أنت مستعد لمشاركة قصة نجاحك؟' : 'Ready to Share Your Success Story?'; ?></h2>
            <p class="cta-text"><?php echo $is_rtl
                ? 'انضم إلى آلاف المرضى الراضين الذين حولوا ابتساماتهم مع كانين كلينك'
                : 'Join thousands of satisfied patients who have transformed their smiles with Canine Clinic'; ?></p>
            <a href="<?php echo esc_url( $contact_url ); ?>" class="btn-white">
                <?php echo $is_rtl ? 'احجز موعد' : 'Book Appointment'; ?>
            </a>
        </div>
    </div>
</section>

<?php get_footer();
