import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Scroll to top on every navigation — including same-page clicks
    window.scrollTo({ top: 0, behavior: 'smooth' });
    prevPathname.current = pathname;
  }, [pathname]);

  return null;
};

export default ScrollToTop;