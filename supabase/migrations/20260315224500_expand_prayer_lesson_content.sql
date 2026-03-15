-- Expand "The Power of Prayer in Choir" Lesson Content
-- This migration updates the lesson content to comprehensively cover all 20 quiz questions.

UPDATE public.choir_academy_modules
SET content = '<h1>The Power of Prayer in Choir</h1>
<p>Prayer is not something we just do before we sing; it is the engine that drives the spiritual impact of our worship. There is a synchronisation that happens when we pray together, we align ourseves to the heart of God almighty. The primary purpose of our prayer is to <strong>invite the Holy Spirit</strong> to take control of our rehearsal and ministry.</p>

<h2>1. The Spiritual Mandate (2 Chronicles 20:21-22)</h2>
<p>When King Jehoshaphat appointed singers to go out before the army, he didn''t just pick talented people; he <strong>prayed and consulted with God</strong> first. They didn''t just sing songs; they proclaimed the holiness of God. The victory was won because their praise was rooted in a deep reliance on God. This teaches us that our public worship is only as deep as our private devotion.</p>

<h2>2. Entering His Gates (Psalm 100)</h2>
<p>The Bible tells us in <strong>Psalm 100:4</strong> to "Enter his gates with thanksgiving." Every choir rehearsal should begin with a heart of gratitude. As we acknowledge that our talent comes from God, we cultivate the <strong>humility</strong> necessary for true ministry. Humility is acknowledging that we are vessels for His glory, not our own.</p>

<h2>3. The Power of Unity (Matthew 18:20)</h2>
<p>Jesus promised that "where two or three are gathered in my name, <strong>I am there in the midst of them</strong>." Unity in prayer is essential because it allows the choir to become "one voice" in spirit and harmony. If there is ever <strong>conflict</strong> within the choir, the biblical first step is always prayer and reconciliation. We "pray without ceasing" (1 Thess 5:17) to maintain this atmosphere of peace.</p>

<h2>4. Vocal & Spiritual Connection</h2>
<p>A prayerful heart releases physical tension. When you shift your focus from yourself to God, it helps handle "performance" nerves. More importantly, prayer sharpens your spiritual ears. We are called to "sing with the spirit and with the understanding" (1 Cor 14:15), which means focusing on both the heart and the truth within the lyrics.</p>

<h2>5. Atmospheric Intercession</h2>
<p>As a choir, we are intercessors. Through prayer, we "prepare the spiritual ground" of the service, asking God to open the hearts of the congregation through our music. We are like the <strong>Seraphim</strong> Isaiah saw, crying out "Holy, Holy, Holy," constant in our devotion. Even in difficult times, like Paul and Silas in prison (Acts 16), our prayers and songs have the power to break chains and impact the atmosphere.</p>

<h2>6. Seeking Direction</h2>
<p>We pray for our <strong>Choir Director</strong>, asking for wisdom and spiritual leadership. We also seek God''s direction for <strong>song selection</strong>, ensuring the message align with what the Spirit is doing. The ultimate goal of every prayer session is that <strong>God alone be exalted</strong>.'
WHERE title ILIKE '%Power of Prayer%' OR title ILIKE '%Prayer in Choir%';
