</main><!-- /#main-content -->

<?php
$is_rtl   = is_rtl();
$year     = date( 'Y' );
$phone    = cc_get_phone();
$facebook = get_theme_mod( 'cc_facebook', '#' );
$instagram = get_theme_mod( 'cc_instagram', '#' );
$youtube  = get_theme_mod( 'cc_youtube', '#' );
$tiktok   = get_theme_mod( 'cc_tiktok', '#' );

$quick_links = [
    [ 'label' => __( 'Home', 'canine-clinic' ),         'url' => home_url( '/' ) ],
    [ 'label' => __( 'Who We Are', 'canine-clinic' ),   'url' => get_permalink( get_page_by_path( 'who-we-are' ) ) ],
    [ 'label' => __( 'Services', 'canine-clinic' ),     'url' => get_permalink( get_page_by_path( 'services' ) ) ],
    [ 'label' => __( 'Testimonials', 'canine-clinic' ), 'url' => get_permalink( get_page_by_path( 'testimonials' ) ) ],
    [ 'label' => __( 'Contact', 'canine-clinic' ),      'url' => get_permalink( get_page_by_path( 'contact' ) ) ],
];

$footer_services = [
    __( 'Veneers', 'canine-clinic' ),
    __( 'Dental Implants', 'canine-clinic' ),
    __( 'Orthodontics', 'canine-clinic' ),
    __( 'Teeth Whitening', 'canine-clinic' ),
    __( 'Laser Dentistry', 'canine-clinic' ),
];

$branches = [
    [
        'name'    => __( 'Main Branch', 'canine-clinic' ),
        'address' => get_theme_mod( 'cc_main_address', __( 'Nasr City, Cairo', 'canine-clinic' ) ),
        'phone'   => $phone,
        'map'     => get_theme_mod( 'cc_main_maps_link', 'https://maps.google.com/maps?hl=de&gl=de&um=1&ie=UTF-8&fb=1&sa=X&ftid=0x14583f481292c273:0xda2497016bcaa3d5' ),
    ],
    [
        'name'    => get_theme_mod( 'cc_branch2_name', __( 'El Shorouk Branch', 'canine-clinic' ) ),
        'address' => get_theme_mod( 'cc_branch2_address', __( 'The Edge Mall, El Shorouk City, Cairo', 'canine-clinic' ) ),
        'phone'   => $phone,
        'map'     => get_theme_mod( 'cc_branch2_maps_link', 'https://www.google.com/maps/place/4J9G%2BQJH,+El+Shorouk' ),
    ],
];
?>

<footer class="footer<?php echo $is_rtl ? ' rtl' : ''; ?>">
    <div class="container footer-grid">
        <!-- Brand Column -->
        <div class="footer-col footer-brand" <?php if ( $is_rtl ) echo 'style="direction:rtl;text-align:right;"'; ?>>
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="footer-logo">
                <div class="logo-icon">
                    <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <span class="logo-text" dir="ltr">Canine Clinic</span>
            </a>
            <p class="footer-desc">
                <?php esc_html_e( 'Our goal is to provide our patients with the best dental care in a comfortable environment, using the latest technology and techniques.', 'canine-clinic' ); ?>
            </p>
            <div class="social-icons">
                <a href="<?php echo esc_url( $facebook ); ?>" class="social-icon" aria-label="Facebook">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="<?php echo esc_url( $instagram ); ?>" class="social-icon" aria-label="Instagram">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="<?php echo esc_url( $youtube ); ?>" class="social-icon" aria-label="YouTube">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                </a>
                <a href="<?php echo esc_url( $tiktok ); ?>" class="social-icon" aria-label="TikTok">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
            </div>
        </div>

        <!-- Quick Links -->
        <div class="footer-col" <?php if ( $is_rtl ) echo 'style="direction:rtl;text-align:right;"'; ?>>
            <h4 class="footer-heading">
                <?php esc_html_e( 'Useful Links', 'canine-clinic' ); ?>
                <span class="heading-bar<?php echo $is_rtl ? ' right' : ' left'; ?>"></span>
            </h4>
            <ul class="footer-links">
                <?php foreach ( $quick_links as $link ) : ?>
                    <li>
                        <a href="<?php echo esc_url( $link['url'] ); ?>">
                            <svg class="link-arrow<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                            <?php echo esc_html( $link['label'] ); ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>

        <!-- Services -->
        <div class="footer-col" <?php if ( $is_rtl ) echo 'style="direction:rtl;text-align:right;"'; ?>>
            <h4 class="footer-heading">
                <?php esc_html_e( 'Our Services', 'canine-clinic' ); ?>
                <span class="heading-bar<?php echo $is_rtl ? ' right' : ' left'; ?>"></span>
            </h4>
            <ul class="footer-links">
                <?php
                $services_url = get_permalink( get_page_by_path( 'services' ) );
                foreach ( $footer_services as $srv ) : ?>
                    <li>
                        <a href="<?php echo esc_url( $services_url ); ?>">
                            <svg class="link-arrow<?php echo $is_rtl ? ' rtl-flip' : ''; ?>" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                            <?php echo esc_html( $srv ); ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>

        <!-- Branches -->
        <div class="footer-col" <?php if ( $is_rtl ) echo 'style="direction:rtl;text-align:right;"'; ?>>
            <h4 class="footer-heading">
                <?php esc_html_e( 'Our Branches', 'canine-clinic' ); ?>
                <span class="heading-bar<?php echo $is_rtl ? ' right' : ' left'; ?>"></span>
            </h4>
            <div class="footer-branches">
                <?php foreach ( $branches as $branch ) : ?>
                    <div class="branch-item">
                        <h5><?php echo esc_html( $branch['name'] ); ?></h5>
                        <p class="branch-address">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <span><?php echo esc_html( $branch['address'] ); ?></span>
                        </p>
                        <a href="tel:<?php echo esc_attr( $branch['phone'] ); ?>" class="branch-phone">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            <span dir="ltr"><?php echo esc_html( $branch['phone'] ); ?></span>
                        </a>
                        <?php if ( $branch['map'] ) : ?>
                            <a href="<?php echo esc_url( $branch['map'] ); ?>" target="_blank" rel="noopener noreferrer" class="branch-map-link">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                                </svg>
                                <?php esc_html_e( 'View on Google Maps', 'canine-clinic' ); ?>
                            </a>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <!-- Bottom Bar -->
    <div class="footer-bottom">
        <div class="container footer-bottom-inner<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
            <p>&copy; <?php echo $year; ?> Canine Clinic. <?php esc_html_e( 'All rights reserved.', 'canine-clinic' ); ?></p>
            <div class="footer-bottom-links<?php echo $is_rtl ? ' rtl-reverse' : ''; ?>">
                <a href="<?php echo esc_url( get_privacy_policy_url() ); ?>"><?php esc_html_e( 'Privacy Policy', 'canine-clinic' ); ?></a>
                <a href="#"><?php esc_html_e( 'Terms of Service', 'canine-clinic' ); ?></a>
                <?php if ( get_page_by_path( 'wp-login.php' ) || true ) : ?>
                    <a href="<?php echo esc_url( wp_login_url() ); ?>" class="staff-login">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                        </svg>
                        <?php echo $is_rtl ? 'تسجيل الدخول' : 'Staff Login'; ?>
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
