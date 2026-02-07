/**
 * Bible Book List Scrolling Verification Script
 * 
 * Instructions:
 * 1. Open the application in your browser (http://localhost:8080)
 * 2. Navigate to the Bible page
 * 3. Ensure you are on the Book List view (Cancel any open book/chapter)
 * 4. Open Developer Tools (F12 or Ctrl+Shift+I) -> Console
 * 5. Paste and run this entire script
 */

(() => {
    console.log("🔍 Starting Bible Scrolling Verification...");

    const list = document.querySelector('.bible-book-list');

    if (!list) {
        console.error("❌ FAIL: .bible-book-list element not found. Are you on the correct page?");
        return;
    }

    const computedStyle = window.getComputedStyle(list);
    const paddingBottom = computedStyle.paddingBottom;

    console.log(`📊 Container Properties:`);
    console.log(`   - Height: ${list.clientHeight}px`);
    console.log(`   - Scroll Height: ${list.scrollHeight}px`);
    console.log(`   - Padding Bottom: ${paddingBottom}`);

    // Check if padding-bottom is applied (expecting approx 128px for pb-32)
    const paddingValue = parseInt(paddingBottom);
    if (paddingValue < 100) {
        console.warn("⚠️ WARNING: Padding bottom seems low. Expected ~128px (pb-32).");
    } else {
        console.log("✅ Padding OK: Defensive padding is active.");
    }

    // Attempt to find Revelation
    // Note: The list might be virtualized or just long. We'll search children.
    const books = Array.from(list.children);
    const lastBook = books[books.length - 1];

    if (!lastBook) {
        console.error("❌ FAIL: No books found in the list.");
        return;
    }

    console.log(`📖 Last Book Found: "${lastBook.textContent?.trim()}"`);

    if (!lastBook.textContent?.includes('Revelation')) {
        console.warn("⚠️ WARNING: Last book is not Revelation. Sort order might be different.");
    }

    // Scroll to bottom to test visibility
    console.log("⬇️ Scrolling to bottom...");
    list.scrollTop = list.scrollHeight;

    // Small delay to allow layout update if needed (though DOM is sync usually)
    setTimeout(() => {
        const rect = lastBook.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        console.log(`📐 Visibility Check:`);
        console.log(`   - Last Book Bottom: ${rect.bottom}px`);
        console.log(`   - Viewport Height: ${viewportHeight}px`);
        console.log(`   - Clearance: ${viewportHeight - rect.bottom}px (Positive is good)`);

        // We want the book's bottom to be visible, or at least its top to be well within view
        // With defensive padding, the book should be well above the bottom of the viewport
        if (rect.bottom < viewportHeight) {
            console.log("✅ PASS: Last book is fully visible above the viewport bottom.");
        } else if (rect.top < viewportHeight) {
            console.log("✅ PASS: Last book is partially visible (user can see it).");
        } else {
            console.error("❌ FAIL: Last book is NOT visible in the viewport.");
        }

        // Check for obstructions
        const elementAtBookPos = document.elementFromPoint(rect.left + 10, rect.top + 10);
        if (elementAtBookPos && !lastBook.contains(elementAtBookPos) && !list.contains(elementAtBookPos)) {
            console.warn("⚠️ WARNING: Element overlapping the book:", elementAtBookPos);
        } else {
            console.log("✅ No immediate obstructions detected over the last book.");
        }

    }, 100);

})();
