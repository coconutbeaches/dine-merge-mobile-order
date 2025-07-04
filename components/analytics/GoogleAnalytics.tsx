'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

export default function GoogleAnalytics() {
  useEffect(() => {
    // Track page views on route changes
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_TRACKING_ID, {
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, []);

  if (!GA_TRACKING_ID) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `,
        }}
      />
    </>
  );
}
