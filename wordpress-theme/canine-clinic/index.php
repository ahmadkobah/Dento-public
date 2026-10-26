<?php
/**
 * Default template – usually not used since we have page templates.
 *
 * @package Canine_Clinic
 */

get_header(); ?>

<section style="padding:8rem 0 4rem;">
    <div class="container">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
            <article>
                <h1 class="section-title"><?php the_title(); ?></h1>
                <div class="section-text">
                    <?php the_content(); ?>
                </div>
            </article>
        <?php endwhile; else : ?>
            <p><?php esc_html_e( 'No content found.', 'canine-clinic' ); ?></p>
        <?php endif; ?>
    </div>
</section>

<?php get_footer();
