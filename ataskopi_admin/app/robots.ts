import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard/',
        '/settings/',
        '/_next/',
        '/static/'
      ],
    },
    sitemap: 'https://admin.ataskopi.dadi.web.id/sitemap.xml',
  };
}
