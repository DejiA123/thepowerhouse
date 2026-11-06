// The church these functions serve: the server's copy of the parts of
// src/config/church.ts it needs (keep the two the same). Later each church's
// profile comes from the database instead.
export const church = {
  id: 'thepowerhouse',
  name: 'The Power House',
  fullName: 'The Power House International',
  website: 'https://www.thepowerhouseinternational.org',
  appUrl: 'https://thepowerhouseintl.vercel.app',
  youtube: { channelId: 'UC35azCG6jqVkR2G8aH91v4A', handle: '@thepowerhouseintl' },
  /** Who sends the app's emails, and where service feedback goes */
  email: {
    // The church's own domain. Until Resend has verified it (DNS records at the domain's
    // provider), emails go from the fallback, a domain already verified in the Resend account
    from: 'The Power House <noreply@thepowerhouseinternational.org>',
    fallbackFrom: 'The Power House <noreply@tphcreatives.com>',
    feedbackTo: 'youths.powerhouse@gmail.com',
  },
} as const;
