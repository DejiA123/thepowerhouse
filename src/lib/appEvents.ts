/**
 * App-wide actions any button can trigger: open the search, or (re)start the
 * welcome tour. The search and the tour live once in the layout and listen.
 */

export const SEARCH_EVENT = 'app:search';
export const TOUR_EVENT = 'app:tour';
export const TOUR_DONE_KEY = 'app_tour_done_v1';
/** The welcome tour was finished or skipped (things that wait for it can show) */
export const TOUR_DONE_EVENT = 'app:tour-done';

export const openSearch = (query = '') => window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: { query } }));

export const startTour = () => window.dispatchEvent(new Event(TOUR_EVENT));
