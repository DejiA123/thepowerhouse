import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Try to find the main content container (used in Layout)
        const mainContent = document.getElementById('main-content');

        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: "instant" // Use instant for navigation to avoid awkward smooth scrolling on page load
            });
        } else {
            // Fallback for pages that might not use the layout ID (if any)
            window.scrollTo(0, 0);
        }
    }, [pathname]);

    return null;
};

export default ScrollToTop;
