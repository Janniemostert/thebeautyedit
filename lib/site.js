// Central place for site-wide branding and links.
// Edit these values to update the name, tagline and social links everywhere.

// Bump the version number whenever public/logo.png is replaced so browsers and the
// Next.js image cache pick up the new file instead of a cached copy.
export const LOGO_SRC = '/logo.png?v=2';

// Public production address. Used to pin NEXTAUTH_URL in production so a wrong
// or missing Netlify variable can never send sign-ins to localhost.
export const SITE_URL = 'https://thebeautyeditbyel.netlify.app';

export const site = {
    name:         'The Beauty Edit',
    by:           'by EL',
    fullName:     'The Beauty Edit by EL',
    tagline:      'Makeup, beauty and consultations, one look at a time.',
    description:  'The Beauty Edit by EL — makeup looks, transformations, tutorials and beauty advice.',
    contactEmail: 'hello@example.com',
    socials: [
        { label: 'Instagram', href: 'https://instagram.com/' },
        { label: 'TikTok',    href: 'https://tiktok.com/' },
        { label: 'YouTube',   href: 'https://youtube.com/' },
        { label: 'WhatsApp Channel', href: 'https://whatsapp.com/channel/' },
    ],
};
