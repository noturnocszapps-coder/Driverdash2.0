import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      // Standard width check (Tailwind md is 768, lg is 1024)
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Check if it's a touch device (coarse pointer)
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      
      // A phone in landscape usually has height < 500px
      const isLandscapePhone = isTouch && height < 500;
      
      // We are in mobile mode if:
      // 1. Width is small (< 768px)
      // 2. It's a touch device AND it's in landscape (height is small)
      // 3. It's a touch device and width is not too large (e.g. < 1024px for tablets)
      
      const mobileMode = width < 768 || isLandscapePhone || (isTouch && width < 1024);
      
      setIsMobile(mobileMode);
      
      console.log('[LANDSCAPE_LAYOUT]', {
        viewport: `${width}x${height}`,
        isTouch,
        isLandscapePhone,
        detectedLayout: mobileMode ? 'mobile' : 'desktop'
      });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
}
