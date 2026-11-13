import DOMPurify from 'dompurify';

/**
 * HTML written by people (choir academy lessons, the editor frame) cleaned before it's put
 * on the page: formatting, links and pictures stay; scripts, event handlers (onerror=…),
 * <iframe>/<object>/<embed>, forms and javascript: links are removed. Branch choirs' pages
 * are open for anyone to edit (the church's choice), so without this anyone could plant a
 * script that runs on every phone that opens the lesson.
 */
export function safeHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? '', {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'],
    ADD_ATTR: ['target'],
  });
}
