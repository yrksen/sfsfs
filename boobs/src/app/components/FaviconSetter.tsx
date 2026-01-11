import { useEffect } from 'react';
import faviconImage from 'figma:asset/7065e9310f2eb159d975d545f142962e3664b41e.png';

export function FaviconSetter() {
  useEffect(() => {
    // Set favicon
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconImage;

    // Set apple touch icon
    let appleLink: HTMLLinkElement | null = document.querySelector("link[rel~='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = faviconImage;
  }, []);

  return null;
}
