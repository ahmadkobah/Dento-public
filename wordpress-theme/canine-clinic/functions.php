<?php
/**
 * Canine Clinic Theme Functions
 *
 * Bilingual (EN/AR) dental clinic theme with RTL support.
 * Migrated from React/Vite.
 *
 * @package Canine_Clinic
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* --- Auto-disable WordPress.com Coming Soon mode --- */
add_action( 'init', function () {
    if ( get_option( 'wpcom_public_coming_soon' ) ) {
        update_option( 'wpcom_public_coming_soon', 0 );
    }
    $blog_public = get_option( 'blog_public' );
    if ( $blog_public != 1 ) {
        update_option( 'blog_public', 1 );
    }
}, 1 );

define( 'CC_VERSION', '1.0.2' );
define( 'CC_DIR',     get_template_directory() );
define( 'CC_URI',     get_template_directory_uri() );

/* ----------------------------------------------------------
   1. Theme Setup
   ---------------------------------------------------------- */
add_action( 'after_setup_theme', function () {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'custom-logo', [
        'height'      => 60,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ] );
    add_theme_support( 'html5', [ 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ] );
    add_theme_support( 'editor-styles' );

    // Default language & RTL
    load_theme_textdomain( 'canine-clinic', CC_DIR . '/languages' );

    register_nav_menus( [
        'primary' => __( 'Primary Navigation', 'canine-clinic' ),
        'footer'  => __( 'Footer Navigation', 'canine-clinic' ),
    ] );
} );

/* ----------------------------------------------------------
   2. Enqueue Assets
   ---------------------------------------------------------- */
add_action( 'wp_enqueue_scripts', function () {
    // Google Fonts: Inter, Poppins, Cairo (for Arabic)
    wp_enqueue_style(
        'cc-google-fonts',
        'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap',
        [],
        null
    );

    // Main stylesheet
    wp_enqueue_style( 'cc-style', get_stylesheet_uri(), [], CC_VERSION );

    // Theme JS
    wp_enqueue_script( 'cc-main', CC_URI . '/js/main.js', [], CC_VERSION, true );

    // Localize script with theme data
    wp_localize_script( 'cc-main', 'ccTheme', [
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'cc_nonce' ),
        'isRTL'   => is_rtl(),
    ] );
} );

/* ----------------------------------------------------------
   3. Language Switcher (WPML / Polylang compatible)
   ---------------------------------------------------------- */
function cc_get_language_switcher_url() {
    // For Polylang
    if ( function_exists( 'pll_the_languages' ) ) {
        $langs = pll_the_languages( [ 'raw' => true ] );
        foreach ( $langs as $lang ) {
            if ( ! $lang['current_lang'] ) {
                return [
                    'url'   => $lang['url'],
                    'label' => $lang['slug'] === 'ar' ? 'EN' : 'عربي',
                ];
            }
        }
    }
    // For WPML
    if ( function_exists( 'icl_get_languages' ) ) {
        $langs = icl_get_languages( 'skip_missing=0' );
        foreach ( $langs as $lang ) {
            if ( ! $lang['active'] ) {
                return [
                    'url'   => $lang['url'],
                    'label' => $lang['language_code'] === 'ar' ? 'EN' : 'عربي',
                ];
            }
        }
    }
    // Fallback: manual toggle (stores in cookie via JS)
    return [
        'url'   => '#',
        'label' => is_rtl() ? 'EN' : 'عربي',
        'js'    => true,
    ];
}

/* ----------------------------------------------------------
   4. Custom Post Types
   ---------------------------------------------------------- */
add_action( 'init', function () {
    // Team / Doctors
    register_post_type( 'cc_doctor', [
        'labels' => [
            'name'          => __( 'Doctors', 'canine-clinic' ),
            'singular_name' => __( 'Doctor', 'canine-clinic' ),
            'add_new_item'  => __( 'Add New Doctor', 'canine-clinic' ),
        ],
        'public'       => true,
        'has_archive'  => false,
        'menu_icon'    => 'dashicons-businessman',
        'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields' ],
        'show_in_rest' => true,
    ] );

    // Testimonials
    register_post_type( 'cc_testimonial', [
        'labels' => [
            'name'          => __( 'Testimonials', 'canine-clinic' ),
            'singular_name' => __( 'Testimonial', 'canine-clinic' ),
            'add_new_item'  => __( 'Add New Testimonial', 'canine-clinic' ),
        ],
        'public'       => true,
        'has_archive'  => false,
        'menu_icon'    => 'dashicons-format-quote',
        'supports'     => [ 'title', 'editor', 'custom-fields' ],
        'show_in_rest' => true,
    ] );

    // Portfolio Cases
    register_post_type( 'cc_portfolio', [
        'labels' => [
            'name'          => __( 'Portfolio', 'canine-clinic' ),
            'singular_name' => __( 'Case', 'canine-clinic' ),
            'add_new_item'  => __( 'Add New Case', 'canine-clinic' ),
        ],
        'public'       => true,
        'has_archive'  => true,
        'menu_icon'    => 'dashicons-images-alt2',
        'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields' ],
        'show_in_rest' => true,
    ] );

    // Services
    register_post_type( 'cc_service', [
        'labels' => [
            'name'          => __( 'Services', 'canine-clinic' ),
            'singular_name' => __( 'Service', 'canine-clinic' ),
            'add_new_item'  => __( 'Add New Service', 'canine-clinic' ),
        ],
        'public'       => true,
        'has_archive'  => true,
        'menu_icon'    => 'dashicons-heart',
        'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'page-attributes' ],
        'show_in_rest' => true,
    ] );

    // Portfolio taxonomy
    register_taxonomy( 'portfolio_category', 'cc_portfolio', [
        'labels' => [
            'name'          => __( 'Categories', 'canine-clinic' ),
            'singular_name' => __( 'Category', 'canine-clinic' ),
        ],
        'hierarchical' => true,
        'show_in_rest' => true,
    ] );
} );

/* ----------------------------------------------------------
   5. Theme Customizer
   ---------------------------------------------------------- */
add_action( 'customize_register', function ( $wp_customize ) {
    // Clinic Info Section
    $wp_customize->add_section( 'cc_clinic_info', [
        'title'    => __( 'Clinic Information', 'canine-clinic' ),
        'priority' => 30,
    ] );

    $fields = [
        'cc_phone'            => [ 'Phone Number', '+20 10 00000021' ],
        'cc_email'            => [ 'Email', 'info@canineclinic.com' ],
        'cc_whatsapp'         => [ 'WhatsApp Number', '201144848521' ],
        'cc_main_address'     => [ 'Main Branch Address', 'Nasr City, Cairo' ],
        'cc_main_maps_link'   => [ 'Main Branch Maps Link', '' ],
        'cc_main_maps_embed'  => [ 'Main Branch Maps Embed URL', '' ],
        'cc_branch2_name'     => [ 'Second Branch Name', 'El Shorouk Branch' ],
        'cc_branch2_address'  => [ 'Second Branch Address', 'The Edge Mall, El Shorouk City, Cairo' ],
        'cc_branch2_maps_link' => [ 'Second Branch Maps Link', '' ],
        'cc_branch2_maps_embed' => [ 'Second Branch Maps Embed URL', '' ],
        'cc_facebook'         => [ 'Facebook URL', '' ],
        'cc_instagram'        => [ 'Instagram URL', '' ],
        'cc_youtube'          => [ 'YouTube URL', '' ],
        'cc_tiktok'           => [ 'TikTok URL', '' ],
    ];

    foreach ( $fields as $id => [ $label, $default ] ) {
        $wp_customize->add_setting( $id, [ 'default' => $default, 'sanitize_callback' => 'sanitize_text_field' ] );
        $wp_customize->add_control( $id, [
            'label'   => __( $label, 'canine-clinic' ),
            'section' => 'cc_clinic_info',
            'type'    => 'text',
        ] );
    }

    // Colors Section
    $wp_customize->add_setting( 'cc_primary_color', [
        'default'           => '#0d9488',
        'sanitize_callback' => 'sanitize_hex_color',
    ] );
    $wp_customize->add_control( new WP_Customize_Color_Control( $wp_customize, 'cc_primary_color', [
        'label'   => __( 'Primary Color', 'canine-clinic' ),
        'section' => 'colors',
    ] ) );
} );

// Output custom CSS from Customizer
add_action( 'wp_head', function () {
    $primary = get_theme_mod( 'cc_primary_color', '#0d9488' );
    if ( $primary !== '#0d9488' ) {
        echo "<style>:root { --color-primary-600: {$primary}; }</style>\n";
    }
} );

/* ----------------------------------------------------------
   6. Shortcodes
   ---------------------------------------------------------- */
// [booking_calendar] — renders the booking form placeholder
add_shortcode( 'booking_calendar', function () {
    ob_start();
    get_template_part( 'template-parts/booking-calendar' );
    return ob_get_clean();
} );

// [cc_stats] — renders the stats bar
add_shortcode( 'cc_stats', function ( $atts ) {
    $atts = shortcode_atts( [
        'items' => '20+|' . esc_html__( 'Years of Experience', 'canine-clinic' ) .
                   ',15K+|' . esc_html__( 'Happy Patients', 'canine-clinic' ) .
                   ',6|' . esc_html__( 'Expert Doctors', 'canine-clinic' ),
    ], $atts );

    $stats = array_map( function ( $item ) {
        [$num, $label] = explode( '|', trim( $item ) );
        return [ 'number' => $num, 'label' => $label ];
    }, explode( ',', $atts['items'] ) );

    ob_start(); ?>
    <section class="stats-bar">
        <div class="container">
            <div class="grid-3" style="grid-template-columns: repeat(<?php echo count($stats); ?>, 1fr);">
                <?php foreach ( $stats as $stat ) : ?>
                    <div class="stat animate-on-scroll">
                        <div class="number"><?php echo esc_html( $stat['number'] ); ?></div>
                        <div class="label"><?php echo esc_html( $stat['label'] ); ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
} );

/* ----------------------------------------------------------
   7. Helper Functions
   ---------------------------------------------------------- */
function cc_get_phone() {
    return get_theme_mod( 'cc_phone', '+20 10 00000021' );
}

function cc_get_whatsapp_url( $message = '' ) {
    $num = get_theme_mod( 'cc_whatsapp', '201144848521' );
    $url = 'https://wa.me/' . $num;
    if ( $message ) $url .= '?text=' . rawurlencode( $message );
    return $url;
}

/* ----------------------------------------------------------
   8. Widgets
   ---------------------------------------------------------- */
add_action( 'widgets_init', function () {
    register_sidebar( [
        'name'          => __( 'Footer Column 1', 'canine-clinic' ),
        'id'            => 'footer-1',
        'before_widget' => '<div class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h4>',
        'after_title'   => '</h4>',
    ] );
} );

/* ----------------------------------------------------------
   9. Contact Form 7 / WPForms Integration
   ---------------------------------------------------------- */
// The contact page template includes a fallback HTML form.
// If CF7 or WPForms is active, the shortcode in the page content will render instead.

/* ----------------------------------------------------------
   10. Admin Customization
   ---------------------------------------------------------- */
add_action( 'admin_menu', function () {
    add_theme_page(
        __( 'Theme Help', 'canine-clinic' ),
        __( 'Theme Help', 'canine-clinic' ),
        'edit_themes',
        'cc-help',
        function () {
            echo '<div class="wrap">';
            echo '<h1>' . esc_html__( 'Canine Clinic Theme', 'canine-clinic' ) . '</h1>';
            echo '<p>' . esc_html__( 'This theme was migrated from a React app. Below are the key features:', 'canine-clinic' ) . '</p>';
            echo '<ul style="list-style:disc;padding-left:2rem;">';
            echo '<li>' . esc_html__( 'Bilingual EN/AR with RTL support (use Polylang or WPML)', 'canine-clinic' ) . '</li>';
            echo '<li>' . esc_html__( 'Custom Post Types: Doctors, Services, Testimonials, Portfolio', 'canine-clinic' ) . '</li>';
            echo '<li>' . esc_html__( 'Customizer settings for clinic info, colors, and branch details', 'canine-clinic' ) . '</li>';
            echo '<li>' . esc_html__( 'Page Templates: Home, About (Who We Are), Services, Contact, Testimonials, Portfolio', 'canine-clinic' ) . '</li>';
            echo '<li>' . esc_html__( 'Booking Calendar shortcode: [booking_calendar]', 'canine-clinic' ) . '</li>';
            echo '</ul>';
            echo '</div>';
        }
    );
} );
