import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname } = useLocation();
    const opened = useRef(false);

    useEffect(() => {
        // The app has only just opened, so it's already at the top. Skipping this
        // here spares three forced page layouts while the first screen is drawn.
        if (!opened.current) {
            opened.current = true;
            return;
        }

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
