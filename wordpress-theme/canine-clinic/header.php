<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<?php
$lang_switch = cc_get_language_switcher_url();
$is_rtl      = is_rtl();
?>
<body <?php body_class( $is_rtl ? 'rtl' : '' ); ?>>
<?php wp_body_open(); ?>

<!-- Navbar -->
<nav class="navbar" id="mainNavbar">
    <div class="container">
        <div class="navbar-inner<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
            <!-- Logo -->
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <?php if ( has_custom_logo() ) : ?>
                    <?php the_custom_logo(); ?>
                <?php else : ?>
                    <div class="logo-icon">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </div>
                <?php endif; ?>
                <span class="logo-text" dir="ltr">Canine Clinic</span>
            </a>

            <!-- Desktop Navigation -->
            <div class="nav-links-desktop<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <?php
                $nav_items = [
                    [ 'label' => __( 'Home', 'canine-clinic' ),         'url' => home_url( '/' ) ],
                    [ 'label' => __( 'Who We Are', 'canine-clinic' ),   'url' => get_permalink( get_page_by_path( 'who-we-are' ) ) ],
                    [ 'label' => __( 'Services', 'canine-clinic' ),     'url' => get_permalink( get_page_by_path( 'services' ) ) ],
                    [ 'label' => __( 'Testimonials', 'canine-clinic' ), 'url' => get_permalink( get_page_by_path( 'testimonials' ) ) ],
                    [ 'label' => __( 'Portfolio', 'canine-clinic' ),    'url' => get_permalink( get_page_by_path( 'portfolio' ) ) ],
                ];
                $current_url = trailingslashit( home_url( $_SERVER['REQUEST_URI'] ) );
                foreach ( $nav_items as $item ) :
                    $active = ( trailingslashit( $item['url'] ) === $current_url ) ? ' active' : '';
                ?>
                    <a href="<?php echo esc_url( $item['url'] ); ?>" class="nav-link<?php echo $active; ?>">
                        <?php echo esc_html( $item['label'] ); ?>
                    </a>
                <?php endforeach; ?>
            </div>

            <!-- CTA + Language -->
            <div class="nav-actions-desktop<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <!-- Language Switcher -->
                <a href="<?php echo esc_url( $lang_switch['url'] ); ?>"
                   class="lang-switch"
                   <?php if ( ! empty( $lang_switch['js'] ) ) echo 'data-lang-toggle'; ?>
                   title="<?php echo $is_rtl ? 'Switch to English' : 'التبديل إلى العربية'; ?>">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                    </svg>
                    <span><?php echo esc_html( $lang_switch['label'] ); ?></span>
                </a>

                <!-- Phone -->
                <a href="tel:<?php echo esc_attr( cc_get_phone() ); ?>" class="nav-phone" aria-label="Call us">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                </a>

                <!-- CTA -->
                <a href="<?php echo esc_url( get_permalink( get_page_by_path( 'contact' ) ) ); ?>" class="btn-primary">
                    <?php esc_html_e( 'Book Appointment', 'canine-clinic' ); ?>
                </a>
            </div>

            <!-- Mobile: language + hamburger -->
            <div class="nav-mobile-controls<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <a href="<?php echo esc_url( $lang_switch['url'] ); ?>"
                   class="lang-switch-mobile"
                   <?php if ( ! empty( $lang_switch['js'] ) ) echo 'data-lang-toggle'; ?>>
                    <span><?php echo esc_html( $lang_switch['label'] ); ?></span>
                </a>
                <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle menu">
                    <svg class="hamburger-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    <svg class="close-icon hidden" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div class="mobile-nav hidden" id="mobileNav">
        <div class="mobile-nav-inner">
            <?php foreach ( $nav_items as $item ) :
                $active = ( trailingslashit( $item['url'] ) === $current_url ) ? ' active' : '';
            ?>
                <a href="<?php echo esc_url( $item['url'] ); ?>" class="mobile-nav-link<?php echo $active; ?> <?php echo $is_rtl ? 'text-right' : 'text-left'; ?>">
                    <?php echo esc_html( $item['label'] ); ?>
                </a>
            <?php endforeach; ?>
            <a href="<?php echo esc_url( get_permalink( get_page_by_path( 'contact' ) ) ); ?>" class="btn-primary mobile-cta">
                <?php esc_html_e( 'Book Appointment', 'canine-clinic' ); ?>
            </a>
        </div>
    </div>
</nav>

<main id="main-content">
