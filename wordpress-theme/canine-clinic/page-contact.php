<?php
/**
 * Template Name: Contact Page
 * Contact page with booking, contact form, branches, maps.
 *
 * @package Canine_Clinic
 */

get_header();
$is_rtl = is_rtl();
$phone  = cc_get_phone();
$wa_url = cc_get_whatsapp_url( $is_rtl ? 'مرحبا، أود حجز موعد' : 'Hello, I would like to book an appointment' );
$main_embed    = get_theme_mod( 'cc_main_maps_embed', 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=Nasr+City+Cairo+Egypt&zoom=15' );
$branch2_embed = get_theme_mod( 'cc_branch2_maps_embed', 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=The+Edge+Mall+El+Shorouk+City+Cairo+Egypt&zoom=15' );
?>

<!-- Hero -->
<section class="page-hero">
    <div class="container text-center">
        <h1 class="hero-title animate-on-scroll"><?php echo $is_rtl ? 'تواصل معنا' : 'Get In Touch'; ?></h1>
        <p class="hero-subtitle animate-on-scroll"><?php echo $is_rtl
            ? 'حدد موعدك أو اسألنا أي أسئلة. نحن هنا للمساعدة!'
            : "Schedule your appointment or ask us any questions. We're here to help!"; ?></p>
    </div>
</section>

<!-- Booking Calendar (shortcode or placeholder) -->
<section class="booking-section">
    <div class="container">
        <div class="animate-on-scroll">
            <?php echo do_shortcode( '[booking_calendar]' ); ?>
        </div>
    </div>
</section>

<!-- Contact Form + Branch Info -->
<section class="contact-form-section">
    <div class="container">
        <div class="grid-2">
            <!-- Contact Form -->
            <div class="contact-form-wrapper animate-on-scroll<?php echo $is_rtl ? ' text-right' : ''; ?>">
                <h2><?php echo $is_rtl ? 'احجز موعد' : 'Book an Appointment'; ?></h2>
                <?php
                // If Contact Form 7 is active, use it
                if ( shortcode_exists( 'contact-form-7' ) ) {
                    echo do_shortcode( '[contact-form-7 id="contact-form" title="Contact"]' );
                } else { ?>
                    <form class="cc-contact-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                        <input type="hidden" name="action" value="cc_contact_form">
                        <?php wp_nonce_field( 'cc_contact', 'cc_nonce' ); ?>

                        <div class="form-group">
                            <label for="cc_name"><?php echo $is_rtl ? 'الاسم الكامل' : 'Full Name'; ?></label>
                            <input type="text" id="cc_name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="cc_email"><?php echo $is_rtl ? 'البريد الإلكتروني' : 'Email'; ?></label>
                            <input type="email" id="cc_email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="cc_phone"><?php echo $is_rtl ? 'رقم الهاتف' : 'Phone Number'; ?></label>
                            <input type="tel" id="cc_phone" name="phone" required>
                        </div>
                        <div class="form-group">
                            <label for="cc_service"><?php echo $is_rtl ? 'الخدمة المطلوبة' : 'Service Interested In'; ?></label>
                            <select id="cc_service" name="service">
                                <option value=""><?php echo $is_rtl ? 'اختر خدمة' : 'Select a service'; ?></option>
                                <option value="general"><?php echo $is_rtl ? 'طب الأسنان العام' : 'General Dentistry'; ?></option>
                                <option value="cosmetic"><?php echo $is_rtl ? 'طب الأسنان التجميلي' : 'Cosmetic Dentistry'; ?></option>
                                <option value="orthodontics"><?php echo $is_rtl ? 'تقويم الأسنان' : 'Orthodontics'; ?></option>
                                <option value="implants"><?php echo $is_rtl ? 'زراعة الأسنان' : 'Dental Implants'; ?></option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="cc_message"><?php echo $is_rtl ? 'الرسالة' : 'Message'; ?></label>
                            <textarea id="cc_message" name="message" rows="4"></textarea>
                        </div>
                        <button type="submit" class="btn-primary" style="width:100%;">
                            <?php echo $is_rtl ? 'إرسال الرسالة' : 'Send Message'; ?>
                        </button>
                    </form>
                <?php } ?>
            </div>

            <!-- Branches -->
            <div class="branches-wrapper animate-on-scroll<?php echo $is_rtl ? ' text-right' : ''; ?>">
                <h2><?php echo $is_rtl ? 'فروعنا' : 'Our Branches'; ?></h2>
                <div class="branch-cards">
                    <!-- Main Branch -->
                    <div class="branch-card">
                        <h3><?php echo $is_rtl ? 'الفرع الرئيسي' : 'Main Branch'; ?></h3>
                        <p class="branch-address">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <?php echo esc_html( get_theme_mod( 'cc_main_address', $is_rtl ? 'مدينة نصر، القاهرة' : 'Nasr City, Cairo' ) ); ?>
                        </p>
                        <a href="tel:<?php echo esc_attr( $phone ); ?>" class="branch-phone">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <span dir="ltr"><?php echo esc_html( $phone ); ?></span>
                        </a>
                    </div>
                    <!-- Shorouk Branch -->
                    <div class="branch-card">
                        <h3><?php echo get_theme_mod( 'cc_branch2_name', $is_rtl ? 'فرع الشروق' : 'El Shorouk Branch' ); ?></h3>
                        <p class="branch-address">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <?php echo esc_html( get_theme_mod( 'cc_branch2_address', $is_rtl ? 'ذا إيدج مول، مدينة الشروق، القاهرة' : 'The Edge Mall, El Shorouk City, Cairo' ) ); ?>
                        </p>
                        <a href="tel:<?php echo esc_attr( $phone ); ?>" class="branch-phone">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <span dir="ltr"><?php echo esc_html( $phone ); ?></span>
                        </a>
                    </div>
                </div>

                <!-- WhatsApp CTA -->
                <a href="<?php echo esc_url( $wa_url ); ?>" target="_blank" rel="noopener" class="btn-primary whatsapp-btn" style="width:100%;margin-top:1.5rem;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.694-1.228A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.838-6.324-2.236l-.14-.112-3.131.82.836-3.04-.123-.147A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                    <?php echo $is_rtl ? 'احجز عبر الواتساب' : 'Book via WhatsApp'; ?>
                </a>
            </div>
        </div>
    </div>
</section>

<!-- Google Maps – Main Branch -->
<section class="maps-section">
    <div class="container">
        <div class="text-center animate-on-scroll">
            <h2 class="section-title"><?php echo $is_rtl ? 'موقعنا' : 'Find Us'; ?></h2>
            <p class="section-desc"><?php echo $is_rtl
                ? 'قم بزيارتنا في أي من مواقعنا المريحة'
                : 'Visit us at any of our convenient locations'; ?></p>
        </div>
        <div class="grid-2">
            <?php if ( $main_embed ) : ?>
                <div class="map-wrapper animate-on-scroll">
                    <h3><?php echo $is_rtl ? 'الفرع الرئيسي' : 'Main Branch'; ?></h3>
                    <iframe src="<?php echo esc_url( $main_embed ); ?>" width="100%" height="350" style="border:0;border-radius:0 0 1rem 1rem;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                </div>
            <?php endif; ?>
            <?php if ( $branch2_embed ) : ?>
                <div class="map-wrapper animate-on-scroll">
                    <h3><?php echo $is_rtl ? 'فرع الشروق' : 'El Shorouk Branch'; ?></h3>
                    <iframe src="<?php echo esc_url( $branch2_embed ); ?>" width="100%" height="350" style="border:0;border-radius:0 0 1rem 1rem;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                </div>
            <?php endif; ?>
        </div>
    </div>
</section>

<?php get_footer();
