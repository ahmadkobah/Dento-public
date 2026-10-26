# Canine Clinic WordPress Theme

A bilingual (EN/AR) dental clinic theme migrated from a React/Vite application. Features RTL support, responsive design, and the exact same visual design as the original app.

## Installation

1. Upload the `canine-clinic` folder to `wp-content/themes/`
2. Activate through **Appearance → Themes**
3. Create the required pages (see below)
4. For bilingual support, install **Polylang** or **WPML**

## Required Pages

Create these pages in WordPress and assign the corresponding Page Template:

| Page            | Slug            | Template          |
|-----------------|-----------------|-------------------|
| Home            | (Front page)    | Front Page        |
| Who We Are      | `who-we-are`    | Who We Are        |
| Services        | `services`      | Services Page     |
| Testimonials    | `testimonials`  | Testimonials Page |
| Portfolio       | `portfolio`     | Portfolio Page    |
| Contact         | `contact`       | Contact Page      |

Set your **Homepage** to a static page → select "Home" under **Settings → Reading**.

## Customizer Settings

Go to **Appearance → Customize** to configure:

- **Clinic Information** — Phone, email, WhatsApp, branch addresses, Google Maps links/embeds, social media URLs
- **Colors** — Primary color (default: teal `#0d9488`)
- **Site Identity** — Upload your logo

## Custom Post Types

The theme registers these CPTs for dynamic content management:

- **Doctors** (`cc_doctor`) — Team members with photo, role, specialty
- **Services** (`cc_service`) — Dental services with features list
- **Testimonials** (`cc_testimonial`) — Patient reviews
- **Portfolio** (`cc_portfolio`) — Before/after cases with category taxonomy

If no CPT posts exist, the theme falls back to static content matching the original website.

## Shortcodes

- `[booking_calendar]` — Renders a multi-step booking form with WhatsApp integration
- `[cc_stats]` — Renders a stats bar

## Bilingual Support (EN/AR)

- Install **Polylang** (free) or **WPML** for full bilingual support
- The theme detects the language plugin and shows the correct language switcher
- RTL is automatically applied for Arabic pages
- Without a language plugin, a basic JS-based language toggle is provided

## Fonts

- **Inter** — Body text
- **Poppins** — Display headings (always English)
- **Cairo** — Arabic text (loaded for RTL)

## Design

- Teal/Emerald primary palette (`#0d9488`)
- Gradient hero sections
- Scroll-triggered CSS animations
- Responsive grid layout (no CSS framework dependency)
- Custom SVG icons throughout

## File Structure

```
canine-clinic/
├── style.css             — Main stylesheet (~700 lines)
├── functions.php         — Theme setup, CPTs, customizer, shortcodes
├── header.php            — Navbar with language toggle
├── footer.php            — 4-column footer with branches
├── index.php             — Default template
├── front-page.php        — Homepage
├── page-services.php     — Services page
├── page-who-we-are.php   — About / Team page
├── page-contact.php      — Contact with booking & maps
├── page-testimonials.php — Testimonials page
├── page-portfolio.php    — Portfolio with filters
├── js/
│   └── main.js           — Navbar scroll, mobile menu, animations, filters
├── template-parts/
│   └── booking-calendar.php — Multi-step booking wizard
├── css/                  — Additional CSS (if needed)
├── images/               — Theme images
└── inc/                  — Additional PHP includes
```
