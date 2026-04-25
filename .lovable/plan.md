I found the mobile group chat is currently trapped inside several nested `h-full`/`overflow-hidden` containers, while the messages use Radix `ScrollArea` positioned absolutely. On mobile this can prevent touch scrolling from reaching the actual messages viewport, and it can also make the chat content sit behind the app chrome/header area.

Plan:

1. Fix the `/group-chats` layout sizing in `src/components/Layout.tsx`
   - Keep the app header and bottom navigation visible on mobile.
   - Make the main content a true bounded flex child with `min-h-0` so the chat can calculate its available height correctly.
   - Avoid page-level scrolling for group chats; only the message list should scroll.

2. Fix the chat window structure in `src/pages/GroupChatsPage.tsx`
   - Make the chat window a strict vertical flex layout:
     ```text
     Chat header: fixed/shrink-0
     Messages: flex-1 min-h-0 overflow-y-auto
     Input: fixed/shrink-0
     Bottom nav: outside chat, still visible
     ```
   - Remove the absolute-positioned `ScrollArea` for the messages on mobile and replace it with a normal flex scrolling container.
   - Add `min-h-0` to the chat message area and parent containers so mobile browsers allow inner scrolling.

3. Keep the chat header always visible
   - Ensure the Main Forum header row with the chat name, video call icon, phone icon, and menu never scrolls away with messages.
   - Keep it above the message list with `shrink-0` and a stable z-index.

4. Preserve auto-scroll behavior without breaking manual scroll
   - Keep the existing automatic scroll-to-bottom when entering a chat and when sending/receiving messages.
   - Make the scroll target work against the actual messages scroller rather than the whole page.

5. Verify the fix
   - Run TypeScript/build checks.
   - Test mobile sizing at the reported viewport around `390x674`, confirming:
     - messages can be scrolled up/down,
     - the chat header remains visible,
     - the input stays visible above the bottom navigation,
     - the desktop group chat layout is not regressed.