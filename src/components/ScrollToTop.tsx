import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const resetAllScrollPositions = () => {
            // Reset window and body scroll
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;

            // Reset Layout's root containers (important for certain mobile browsers)
            ['app-layout-root', 'app-main-wrapper', 'main-content'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollTop = 0;
                }
            });

            // Reset Bible-specific scroll container
            const bibleContent = document.getElementById('bible-content-scroll');
            if (bibleContent) {
                bibleContent.scrollTop = 0;
            }
        };

        // Run immediately
        resetAllScrollPositions();

        // Run again after React finishes rendering the new page
        requestAnimationFrame(() => {
            resetAllScrollPositions();
        });

        // Final fallback for slower renders
        const t = setTimeout(resetAllScrollPositions, 50);
        return () => clearTimeout(t);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
