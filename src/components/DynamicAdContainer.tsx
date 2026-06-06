import React, { useEffect, useRef } from 'react';

interface DynamicAdContainerProps {
  html: string;
}

export default function DynamicAdContainer({ html }: DynamicAdContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!html || !iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: transparent;
                overflow: hidden;
              }
              img, iframe, ins {
                max-width: 100% !important;
                height: auto !important;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `);
      doc.close();
      
      // Auto-adjust height when ad contents load
      const adjustHeight = () => {
        try {
          if (!iframe || !doc || !doc.body) return;
          const body = doc.body;
          const htmlEl = doc.documentElement;
          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            htmlEl.clientHeight,
            htmlEl.scrollHeight,
            htmlEl.offsetHeight
          );
          if (height > 20) {
            iframe.style.height = `${height}px`;
          }
        } catch (e) {
          // Cross-origin issues or similar can be ignored safely
        }
      };

      iframe.onload = adjustHeight;
      // Polled updates to capture dynamically resizing network banners (Adsterra, etc.)
      const timer1 = setTimeout(adjustHeight, 1000);
      const timer2 = setTimeout(adjustHeight, 3000);
      const timer3 = setTimeout(adjustHeight, 5000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } catch (err) {
      console.error("Iframe write error:", err);
    }
  }, [html]);

  if (!html) return null;

  return (
    <div className="w-full flex justify-center items-center my-4 relative z-30 self-center min-h-[50px] overflow-hidden max-w-full">
      <iframe
        ref={iframeRef}
        title="Advertisement"
        width="100%"
        scrolling="no"
        frameBorder="0"
        className="border-0 bg-transparent overflow-hidden max-w-full transition-all duration-300"
        style={{ height: '90px', border: 'none', display: 'block', maxWidth: '100%' }}
      />
    </div>
  );
}
