-- Seed Academy Modules
-- Cleanup existing modules with these titles to prevent duplicates if re-seeded
DELETE FROM public.choir_academy_modules 
WHERE title IN ('Biblical Foundations of Choir', 'The Power of Prayer in Choir');

INSERT INTO public.choir_academy_modules (title, description, content, category, location, video_url)
VALUES
(
    'Biblical Foundations of Choir',
    'Understanding the spiritual role of a choir member beyond singing.',
    '<h2>The Levites and their Role</h2><p>In the Old Testament, the Levites were set apart for service in the tabernacle and temple...</p><h3>Worship as Warfare</h3><p>Singing is not just performance; it is a spiritual act...</p>',
    'core',
    'galway', -- Default to galway, or make dynamic if needed
    NULL -- Removed video as requested
),
(
    'The Power of Prayer in Choir',
    'Why we pray before we sing, and how to maintain a prayerful spirit.',
    '<h2>Unity through Prayer</h2><p>Prayer knits our hearts together...</p>',
    'newcomer',
    'galway',
    NULL
);

-- Seed Quiz for Biblical Foundations
DO $$
DECLARE
    module_id UUID;
    quiz_id UUID;
BEGIN
    SELECT id INTO module_id FROM public.choir_academy_modules WHERE title = 'Biblical Foundations of Choir' LIMIT 1;

    INSERT INTO public.choir_academy_quizzes (module_id, title, description, passing_score)
    VALUES (module_id, 'Foundations Check', 'Test your understanding of the biblical role of choir.', 80)
    RETURNING id INTO quiz_id;

    INSERT INTO public.choir_academy_questions (quiz_id, question_text, options, correct_answer_index)
    VALUES
    (quiz_id, 'Who were the primary musicians in the Old Testament?', '["The Levites", "The Pharisees", "The Roman Soldiers"]'::jsonb, 0),
    (quiz_id, 'Worship is described as what in this lesson?', '["Entertainment", "Warfare", "A Hobby"]'::jsonb, 1),
    (quiz_id, 'Which Psalm calls us to make a joyful noise?', '["Psalm 23", "Psalm 100", "Psalm 1"]'::jsonb, 1),
    (quiz_id, 'What was the specific task of the Kohathites?', '["Cleaning the temple", "Carrying the most holy things", "Guarding the gates"]'::jsonb, 1),
    (quiz_id, 'In 1 Chronicles 15, who was the master of the music because he was skillful?', '["David", "Chenaniah", "Solomon"]'::jsonb, 1),
    (quiz_id, 'What garment did the singers wear in 2 Chronicles 5:12?', '["Purple robes", "Fine linen", "Gold armor"]'::jsonb, 1),
    (quiz_id, 'Which king sent singers ahead of the army to sing to the Lord?', '["Saul", "Jehoshaphat", "Hezekiah"]'::jsonb, 1),
    (quiz_id, 'How many musicians were trained and skillful for the Lord in 1 Chronicles 25:7?', '["100", "288", "500"]'::jsonb, 1),
    (quiz_id, 'According to Colossians 3:16, where should the word of Christ dwell?', '["In the library", "Richly in you", "Only on Sundays"]'::jsonb, 1),
    (quiz_id, 'According to Ephesians 5:19, we should make melody in our...', '["Voices", "Hearts", "Instruments"]'::jsonb, 1),
    (quiz_id, 'Which leader saw the Seraphim singing "Holy, Holy, Holy"?', '["Daniel", "Isaiah", "Ezekiel"]'::jsonb, 1),
    (quiz_id, 'Who was the lead singer that David appointed to minister before the ark?', '["Asaph", "Gideon", "Manoah"]'::jsonb, 0),
    (quiz_id, 'In Nehemiah 12, what was being dedicated when the two large choirs gave thanks?', '["The Temple", "The Wall of Jerusalem", "The King''s Palace"]'::jsonb, 1),
    (quiz_id, 'What is the biblical term for a song accompanied by a stringed instrument?', '["Anthem", "Psalm", "Chant"]'::jsonb, 1),
    (quiz_id, 'Which book of the Bible mentions the "New Song" before the throne?', '["Genesis", "Revelation", "Proverbs"]'::jsonb, 1);
END $$;

-- Seed Quiz for The Power of Prayer in Choir
DO $$
DECLARE
    module_id UUID;
    quiz_id UUID;
BEGIN
    SELECT id INTO module_id FROM public.choir_academy_modules WHERE title = 'The Power of Prayer in Choir' LIMIT 1;
    
    IF module_id IS NOT NULL THEN
        INSERT INTO public.choir_academy_quizzes (module_id, title, description, passing_score)
        VALUES (module_id, 'Prayer & Worship Mastery', 'Deepen your spiritual walk through these 20 biblical questions.', 85)
        RETURNING id INTO quiz_id;

        INSERT INTO public.choir_academy_questions (quiz_id, question_text, options, correct_answer_index)
        VALUES
        (quiz_id, 'What is the primary purpose of prayer before a choir rehearsal?', '["To warm up the voice", "To invite the Holy Spirit", "To discuss the setlist"]'::jsonb, 1),
        (quiz_id, 'Which Psalm tells us to "Enter his gates with thanksgiving"?', '["Psalm 1", "Psalm 23", "Psalm 100"]'::jsonb, 2),
        (quiz_id, 'Why is unity in prayer essential for a choir?', '["To finish rehearsal faster", "To be one voice in spirit and harmony", "To impress the director"]'::jsonb, 1),
        (quiz_id, 'In Matthew 18:20, what does Jesus promise when two or three are gathered?', '["He will listen later", "He is there in the midst of them", "He will change the songs"]'::jsonb, 1),
        (quiz_id, 'How does prayer help a choir member handle "performance" nerves?', '["By practicing more", "By shifting focus from self to God", "By ignoring the audience"]'::jsonb, 1),
        (quiz_id, 'What did King Jehoshaphat do before sending the singers out?', '["Gave them new robes", "Prayed and consulted with God", "Had a quick rehearsal"]'::jsonb, 1),
        (quiz_id, 'Which verse encourages us to "Pray without ceasing"?', '["1 Thess 5:17", "John 3:16", "Genesis 1:1"]'::jsonb, 0),
        (quiz_id, 'How does prayer affect the atmosphere of a worship service?', '["It makes it louder", "It prepares the spiritual ground", "It makes people leave"]'::jsonb, 1),
        (quiz_id, 'What should a choir member pray for regarding their voice?', '["To be the loudest", "To be a vessel for God''s glory", "To win a competition"]'::jsonb, 1),
        (quiz_id, 'If there is conflict in the choir, what is the biblical first step?', '["Quitting", "Prayer and reconciliation", "Complaining to others"]'::jsonb, 1),
        (quiz_id, 'What is "praying the lyrics" of a song?', '["Reading them fast", "Meditating on meaning and talking to God", "Changing the words"]'::jsonb, 1),
        (quiz_id, 'Why is humility important in choir prayer?', '["To look good", "Acknowledging talent comes from God", "To follow the rules"]'::jsonb, 1),
        (quiz_id, 'How can a choir "intercede" for the congregation?', '["By looking at them", "Asking God to open hearts through music", "By singing louder"]'::jsonb, 1),
        (quiz_id, 'Which prophet saw the Seraphim crying "Holy, Holy, Holy"?', '["Daniel", "Isaiah", "Jonah"]'::jsonb, 1),
        (quiz_id, 'What does it mean to "sing with the spirit and with the understanding"?', '["Singing while sleeping", "Focusing on both heart and truth", "Singing without thinking"]'::jsonb, 1),
        (quiz_id, 'How does personal prayer life impact choir ministry?', '["It doesn''t", "Outer worship flows from inner devotion", "It only matters on Sunday"]'::jsonb, 1),
        (quiz_id, 'What is the role of prayer in choosing songs?', '["Pick what is popular", "Seeking God''s direction for the message", "Pick what is easy"]'::jsonb, 1),
        (quiz_id, 'In Acts 16, what happened when Paul and Silas sang in prison?', '["They were told to be quiet", "An earthquake opened the doors", "Nothing happened"]'::jsonb, 1),
        (quiz_id, 'Why should we pray for the Choir Director?', '["For wisdom and spiritual leadership", "To get better songs", "To have shorter rehearsals"]'::jsonb, 0),
        (quiz_id, 'What is the ultimate goal of every choir prayer session?', '["To get the notes right", "That God alone be exalted", "To be the best choir in town"]'::jsonb, 1);
    END IF;
END $$;
