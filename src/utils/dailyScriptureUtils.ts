
export interface DailyScripture {
    verse: string;
    reference: string;
}

// Array of scriptures for different days
export const dailyScriptures: DailyScripture[] = [
    {
        verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
        reference: "Jeremiah 29:11"
    },
    {
        verse: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
        reference: "Proverbs 3:5-6"
    },
    {
        verse: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
        reference: "Romans 8:28"
    },
    {
        verse: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
        reference: "Joshua 1:9"
    },
    {
        verse: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.",
        reference: "Matthew 6:34"
    },
    {
        verse: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
        reference: "Zephaniah 3:17"
    },
    {
        verse: "Cast all your anxiety on him because he cares for you.",
        reference: "1 Peter 5:7"
    }
];

// Get today's scripture based on day of year
export const getTodaysScripture = (): DailyScripture => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return dailyScriptures[dayOfYear % dailyScriptures.length];
};
