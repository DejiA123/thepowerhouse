-- Sync Academy Modules Across All Locations
DO $$
DECLARE
    loc TEXT;
    loc_list TEXT[] := ARRAY['galway', 'kildare', 'athlone', 'dublin', 'national'];
    m_foundations_id UUID;
    m_prayer_id UUID;
    q_foundations_id UUID;
    q_prayer_id UUID;
BEGIN
    FOREACH loc IN ARRAY loc_list LOOP
        -- 1. Check if they already exist for this location
        IF NOT EXISTS (SELECT 1 FROM public.choir_academy_modules WHERE location = loc AND title = 'Biblical Foundations of Choir') THEN
            -- 2. Insert Biblical Foundations of Choir
            INSERT INTO public.choir_academy_modules (title, description, content, category, location, video_url)
            VALUES (
                'Biblical Foundations of Choir',
                'Understanding the spiritual role of a choir member beyond singing, modeled by the Levites.',
                '<h1>Biblical Foundations: The Role of the Levites</h1><p>In 1 Chronicles 15:16, David commanded the chiefs of the Levites to appoint their brothers as singers who should play loudly on musical instruments... to raise sounds of joy.</p><h2>1. Set Apart for a Specific Purpose</h2><p>The Levites were not chosen because they were the best singers in Israel; they were chosen and set apart by God. As a member of this choir, you must understand that you are not just a volunteer; you are "appointed" for a sacred task. This realization shifts our perspective from ''performance'' to ''priesthood''.</p><h2>2. Requirement of Skill (1 Chronicles 25)</h2><p>While the anointing is paramount, the Bible emphasizes that the Levites were "skillful" (Chenaniah was head of the singers because he was skillful). We pursue excellence not for our glory, but to ensure that our technical limitations do not distract from the spiritual atmosphere. God deserves our best offering.</p><h2>3. The Priesthood of the Choir</h2><p>A choir member serves as a bridge between the congregation and God. Like the priests of old, we stand in the gap, leading people into the courts of the Lord. This requires holiness, humility, and a heart that beats for the people we lead.</p>',
                'core',
                loc,
                NULL
            ) RETURNING id INTO m_foundations_id;

            -- 3. Seed Quiz for Biblical Foundations
            INSERT INTO public.choir_academy_quizzes (module_id, title, description, passing_score)
            VALUES (m_foundations_id, 'Foundations Check', 'Test your understanding of the biblical role of choir.', 80)
            RETURNING id INTO q_foundations_id;

            INSERT INTO public.choir_academy_questions (quiz_id, question_text, options, correct_answer_index)
            VALUES
            (q_foundations_id, 'Who were the primary musicians in the Old Testament?', '["The Levites", "The Pharisees", "The Roman Soldiers"]'::jsonb, 0),
            (q_foundations_id, 'Worship is described as what in this lesson?', '["Entertainment", "Warfare", "A Hobby"]'::jsonb, 1),
            (q_foundations_id, 'Which Psalm calls us to make a joyful noise?', '["Psalm 23", "Psalm 100", "Psalm 1"]'::jsonb, 1),
            (q_foundations_id, 'What was the specific task of the Kohathites?', '["Cleaning the temple", "Carrying the most holy things", "Guarding the gates"]'::jsonb, 1),
            (q_foundations_id, 'In 1 Chronicles 15, who was the master of the music because he was skillful?', '["David", "Chenaniah", "Solomon"]'::jsonb, 1),
            (q_foundations_id, 'What garment did the singers wear in 2 Chronicles 5:12?', '["Purple robes", "Fine linen", "Gold armor"]'::jsonb, 1),
            (q_foundations_id, 'Which king sent singers ahead of the army to sing to the Lord?', '["Saul", "Jehoshaphat", "Hezekiah"]'::jsonb, 1),
            (q_foundations_id, 'How many musicians were trained and skillful for the Lord in 1 Chronicles 25:7?', '["100", "288", "500"]'::jsonb, 1),
            (q_foundations_id, 'According to Colossians 3:16, where should the word of Christ dwell?', '["In the library", "Richly in you", "Only on Sundays"]'::jsonb, 1),
            (q_foundations_id, 'According to Ephesians 5:19, we should make melody in our...', '["Voices", "Hearts", "Instruments"]'::jsonb, 1),
            (q_foundations_id, 'Which leader saw the Seraphim singing "Holy, Holy, Holy"?', '["Daniel", "Isaiah", "Ezekiel"]'::jsonb, 1),
            (q_foundations_id, 'Who was the lead singer that David appointed to minister before the ark?', '["Asaph", "Gideon", "Manoah"]'::jsonb, 0),
            (q_foundations_id, 'In Nehemiah 12, what was being dedicated when the two large choirs gave thanks?', '["The Temple", "The Wall of Jerusalem", "The King''s Palace"]'::jsonb, 1),
            (q_foundations_id, 'What is the biblical term for a song accompanied by a stringed instrument?', '["Anthem", "Psalm", "Chant"]'::jsonb, 1),
            (q_foundations_id, 'Which book of the Bible mentions the "New Song" before the throne?', '["Genesis", "Revelation", "Proverbs"]'::jsonb, 1);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.choir_academy_modules WHERE location = loc AND title = 'The Power of Prayer in Choir') THEN
            -- 4. Insert The Power of Prayer in Choir
            INSERT INTO public.choir_academy_modules (title, description, content, category, location, video_url)
            VALUES (
                'The Power of Prayer in Choir',
                'Why we pray before we sing, and how to maintain a prayerful spirit.',
                '<h1>The Power of Prayer in Choir</h1><p>Prayer is not just a ritual we perform before we sing; it is the engine that drives the spiritual impact of our worship. Scientific studies and spiritual traditions alike suggest that synchronization happens when we pray together, but for us, it is about alignment with the Father''s heart.</p><h2>1. The Spiritual Mandate (2 Chronicles 20:21-22)</h2><p>When King Jehoshaphat appointed singers to go out before the army, they didn''t just sing songs; they proclaimed the holiness of God. The victory was won not because of their vocal prowess, but because their praise was rooted in a deep reliance on God—which is the definition of prayer.</p><h2>2. Vocal & Spiritual Connection</h2><p>A prayerful heart releases tension. When you are spiritually aligned, your "instrument" (your body) is more relaxed, allowing for better breath control and resonance. More importantly, prayer sharpens your spiritual ears, helping you to hear what the Spirit is doing in the room and enabling you to "echo" that with your voice.</p><h2>3. The ''Secret Place'' Lifestyle</h2><p>Excellence on the choir loft is a byproduct of intimacy in the secret place. We encourage every choir member to establish a consistent personal prayer life. Your public worship is only as deep as your private devotion.</p>',
                'newcomer',
                loc,
                NULL
            ) RETURNING id INTO m_prayer_id;

            -- 5. Seed Quiz for The Power of Prayer in Choir
            INSERT INTO public.choir_academy_quizzes (module_id, title, description, passing_score)
            VALUES (m_prayer_id, 'Prayer & Worship Mastery', 'Deepen your spiritual walk through these 20 biblical questions.', 85)
            RETURNING id INTO q_prayer_id;

            INSERT INTO public.choir_academy_questions (quiz_id, question_text, options, correct_answer_index)
            VALUES
            (q_prayer_id, 'What is the primary purpose of prayer before a choir rehearsal?', '["To warm up the voice", "To invite the Holy Spirit", "To discuss the setlist"]'::jsonb, 1),
            (q_prayer_id, 'Which Psalm tells us to "Enter his gates with thanksgiving"?', '["Psalm 1", "Psalm 23", "Psalm 100"]'::jsonb, 2),
            (q_prayer_id, 'Why is unity in prayer essential for a choir?', '["To finish rehearsal faster", "To be one voice in spirit and harmony", "To impress the director"]'::jsonb, 1),
            (q_prayer_id, 'In Matthew 18:20, what does Jesus promise when two or three are gathered?', '["He will listen later", "He is there in the midst of them", "He will change the songs"]'::jsonb, 1),
            (q_prayer_id, 'How does prayer help a choir member handle "performance" nerves?', '["By practicing more", "By shifting focus from self to God", "By ignoring the audience"]'::jsonb, 1),
            (q_prayer_id, 'What did King Jehoshaphat do before sending the singers out?', '["Gave them new robes", "Prayed and consulted with God", "Had a quick rehearsal"]'::jsonb, 1),
            (q_prayer_id, 'Which verse encourages us to "Pray without ceasing"?', '["1 Thess 5:17", "John 3:16", "Genesis 1:1"]'::jsonb, 0),
            (q_prayer_id, 'How does prayer affect the atmosphere of a worship service?', '["It makes it louder", "It prepares the spiritual ground", "It makes people leave"]'::jsonb, 1),
            (q_prayer_id, 'What should a choir member pray for regarding their voice?', '["To be the loudest", "To be a vessel for God''s glory", "To win a competition"]'::jsonb, 1),
            (q_prayer_id, 'If there is conflict in the choir, what is the biblical first step?', '["Quitting", "Prayer and reconciliation", "Complaining to others"]'::jsonb, 1),
            (q_prayer_id, 'What is "praying the lyrics" of a song?', '["Reading them fast", "Meditating on meaning and talking to God", "Changing the words"]'::jsonb, 1),
            (q_prayer_id, 'Why is humility important in choir prayer?', '["To look good", "Acknowledging talent comes from God", "To follow the rules"]'::jsonb, 1),
            (q_prayer_id, 'How can a choir "intercede" for the congregation?', '["By looking at them", "Asking God to open hearts through music", "By singing louder"]'::jsonb, 1),
            (q_prayer_id, 'Which prophet saw the Seraphim crying "Holy, Holy, Holy"?', '["Daniel", "Isaiah", "Jonah"]'::jsonb, 1),
            (q_prayer_id, 'What does it mean to "sing with the spirit and with the understanding"?', '["Singing while sleeping", "Focusing on both heart and truth", "Singing without thinking"]'::jsonb, 1),
            (q_prayer_id, 'How does personal prayer life impact choir ministry?', '["It doesn''t", "Outer worship flows from inner devotion", "It only matters on Sunday"]'::jsonb, 1),
            (q_prayer_id, 'What is the role of prayer in choosing songs?', '["Pick what is popular", "Seeking God''s direction for the message", "Pick what is easy"]'::jsonb, 1),
            (q_prayer_id, 'In Acts 16, what happened when Paul and Silas sang in prison?', '["They were told to be quiet", "An earthquake opened the doors", "Nothing happened"]'::jsonb, 1),
            (q_prayer_id, 'Why should we pray for the Choir Director?', '["For wisdom and spiritual leadership", "To get better songs", "To have shorter rehearsals"]'::jsonb, 0),
            (q_prayer_id, 'What is the ultimate goal of every choir prayer session?', '["To get the notes right", "That God alone be exalted", "To be the best choir in town"]'::jsonb, 1);
        END IF;

    END LOOP;
END $$;
