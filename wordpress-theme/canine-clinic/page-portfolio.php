<?php
/**
 * Template Name: Portfolio Page
 * Portfolio / Before-After cases – replicates PortfolioPage.jsx
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
        <h1 class="hero-title animate-on-scroll"><?php echo $is_rtl ? 'أعمالنا' : 'Our Portfolio'; ?></h1>
        <p class="hero-subtitle animate-on-scroll"><?php echo $is_rtl
            ? 'شاهد التحولات المذهلة التي حققناها لمرضانا'
            : 'See the amazing transformations we have achieved for our patients'; ?></p>
    </div>
</section>

<!-- Portfolio Filter + Grid -->
<section class="portfolio-section">
    <div class="container">
        <!-- Category Filters -->
        <div class="portfolio-filters animate-on-scroll">
            <?php
            $categories = [
                'all'           => $is_rtl ? 'الكل' : 'All',
                'implants'      => $is_rtl ? 'زراعة' : 'Implants',
                'veneers'       => $is_rtl ? 'قشور' : 'Veneers',
                'whitening'     => $is_rtl ? 'تبييض' : 'Whitening',
                'orthodontics'  => $is_rtl ? 'تقويم' : 'Orthodontics',
                'restoration'   => $is_rtl ? 'ترميم' : 'Restoration',
            ];
            foreach ( $categories as $slug => $label ) : ?>
                <button class="filter-btn<?php echo $slug === 'all' ? ' active' : ''; ?>" data-filter="<?php echo esc_attr( $slug ); ?>">
                    <?php echo esc_html( $label ); ?>
                </button>
            <?php endforeach; ?>
        </div>

        <?php
        // Try CPT portfolio first
        $pquery = new WP_Query([ 'post_type' => 'cc_portfolio', 'posts_per_page' => -1 ]);
        if ( $pquery->have_posts() ) :
            echo '<div class="portfolio-grid" id="portfolioGrid">';
            while ( $pquery->have_posts() ) : $pquery->the_post();
                $cats = get_the_terms( get_the_ID(), 'portfolio_category' );
                $cat_slugs = $cats ? implode( ' ', wp_list_pluck( $cats, 'slug' ) ) : 'all'; ?>
                <div class="portfolio-item animate-on-scroll" data-category="<?php echo esc_attr( $cat_slugs ); ?>">
                    <?php if ( has_post_thumbnail() ) : ?>
                        <?php the_post_thumbnail( 'large' ); ?>
                    <?php endif; ?>
                    <div class="portfolio-overlay">
                        <h3><?php the_title(); ?></h3>
                        <span class="portfolio-cat"><?php echo $cats ? esc_html( $cats[0]->name ) : ''; ?></span>
                    </div>
                </div>
            <?php endwhile;
            echo '</div>';
            wp_reset_postdata();
        else :
            // Static fallback
            $cases = [
                [ 'title' => $is_rtl ? 'ابتسامة هوليوود كاملة' : 'Full Hollywood Smile',    'cat' => 'veneers',      'img' => 'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=600&h=400&fit=crop', 'dur' => '2 weeks' ],
                [ 'title' => $is_rtl ? 'زراعة أسنان أمامية' : 'Front Teeth Implants',        'cat' => 'implants',     'img' => 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600&h=400&fit=crop', 'dur' => '3 months' ],
                [ 'title' => $is_rtl ? 'تبييض احترافي' : 'Professional Whitening',             'cat' => 'whitening',    'img' => 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop', 'dur' => '1 session' ],
                [ 'title' => $is_rtl ? 'تقويم شفاف' : 'Clear Aligners',                       'cat' => 'orthodontics', 'img' => 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop', 'dur' => '12 months' ],
                [ 'title' => $is_rtl ? 'ترميم كامل' : 'Full Mouth Restoration',               'cat' => 'restoration',  'img' => 'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?w=600&h=400&fit=crop', 'dur' => '6 weeks' ],
                [ 'title' => $is_rtl ? 'فينير بورسلين' : 'Porcelain Veneers',                 'cat' => 'veneers',      'img' => 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop', 'dur' => '10 days' ],
            ];
            echo '<div class="portfolio-grid" id="portfolioGrid">';
            foreach ( $cases as $i => $c ) : ?>
                <div class="portfolio-item animate-on-scroll" data-category="<?php echo esc_attr( $c['cat'] ); ?>" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <img src="<?php echo esc_url( $c['img'] ); ?>" alt="<?php echo esc_attr( $c['title'] ); ?>" loading="lazy">
                    <div class="portfolio-overlay">
                        <h3><?php echo esc_html( $c['title'] ); ?></h3>
                        <span class="portfolio-cat"><?php echo esc_html( ucfirst( $c['cat'] ) ); ?></span>
                        <span class="portfolio-dur"><?php echo $is_rtl ? 'المدة: ' : 'Duration: '; ?><?php echo esc_html( $c['dur'] ); ?></span>
                    </div>
                </div>
            <?php endforeach;
            echo '</div>';
        endif; ?>
    </div>
</section>

<!-- Process Steps -->
<section class="process-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <h2 class="section-title"><?php echo $is_rtl ? 'كيف نعمل' : 'Our Process'; ?></h2>
        </div>
        <div class="grid-4 process-steps">
            <?php
            $steps = [
                [ 'num' => '01', 'title' => $is_rtl ? 'الاستشارة' : 'Consultation',  'desc' => $is_rtl ? 'فحص شامل وتقييم احتياجاتك' : 'Comprehensive examination and needs assessment' ],
                [ 'num' => '02', 'title' => $is_rtl ? 'خطة العلاج' : 'Treatment Plan', 'desc' => $is_rtl ? 'خطة مخصصة لتحقيق أفضل النتائج' : 'Customized plan for optimal results' ],
                [ 'num' => '03', 'title' => $is_rtl ? 'العلاج' : 'Treatment',          'desc' => $is_rtl ? 'تنفيذ العلاج بأحدث التقنيات' : 'Procedure with state-of-the-art technology' ],
                [ 'num' => '04', 'title' => $is_rtl ? 'المتابعة' : 'Follow-Up',        'desc' => $is_rtl ? 'متابعة مستمرة لضمان رضاك' : 'Ongoing care to ensure satisfaction' ],
            ];
            foreach ( $steps as $i => $step ) : ?>
                <div class="process-step animate-on-scroll" style="animation-delay:<?php echo $i * 100; ?>ms;">
                    <div class="step-num"><?php echo $step['num']; ?></div>
                    <h3><?php echo esc_html( $step['title'] ); ?></h3>
                    <p><?php echo esc_html( $step['desc'] ); ?></p>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- CTA -->
<section class="cta-section">
    <div class="container text-center" style="position:relative;z-index:1;">
        <div class="animate-on-scroll">
            <h2 class="cta-title"><?php echo $is_rtl ? 'تريد نتائج مماثلة؟' : 'Want Similar Results?'; ?></h2>
            <p class="cta-text"><?php echo $is_rtl
                ? 'حدد موعد استشارتك وابدأ رحلة التحول'
                : 'Schedule your consultation and start your transformation journey'; ?></p>
            <a href="<?php echo esc_url( $contact_url ); ?>" class="btn-white">
                <?php echo $is_rtl ? 'احجز موعد' : 'Book Appointment'; ?>
            </a>
        </div>
    </div>
</section>

<?php get_footer();
