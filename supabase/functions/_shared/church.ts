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
    from: 'The Powerhouse <noreply@thepowerhouse.ie>',
    feedbackTo: 'youths.powerhouse@gmail.com',
  },
} as const;
