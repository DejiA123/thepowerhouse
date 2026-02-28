import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Try to find the main content container (used in Layout)
        const mainContent = document.getElementById('main-content');
        const bibleContent = document.getElementById('bible-content-scroll'); // Will add this ID to BibleChapterContent

        // Reset window and body scroll (important for some mobile browsers and layout configurations)
        window.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
        document.documentElement.scrollTo(0, 0);

        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: "instant"
            });
        }

        if (bibleContent) {
            bibleContent.scrollTo({
                top: 0,
                behavior: "instant"
            });
        }
    }, [pathname]);

    return null;
};

export default ScrollToTop;
