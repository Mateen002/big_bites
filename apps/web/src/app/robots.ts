import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bigbites.pk';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/my-orders', '/checkout', '/orders/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
