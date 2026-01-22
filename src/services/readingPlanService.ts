export interface DailyReading {
  day: number;
  readings: string[];
  description?: string;
  teachingTitle?: string;
  teachingText?: string;
  reflectionQuestion?: string;
}

export interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  duration: string;
  totalDays: number;
  category: "beginner" | "intermediate" | "advanced";
  reward: string;
  dailyReadings: DailyReading[];
}

class ReadingPlanService {
  private plans: ReadingPlan[] = [
    {
      id: "bible-year",
      name: "Bible in a Year",
      description: "Read through the entire Bible in 365 days with a structured plan",
      duration: "365 days",
      totalDays: 365,
      category: "intermediate",
      reward: "🏆 Bible Scholar Badge + Certificate of Completion",
      dailyReadings: this.generateBibleInAYearPlan()
    },
    {
      id: "psalms-proverbs",
      name: "Psalms & Proverbs",
      description: "Monthly reading through wisdom literature",
      duration: "31 days",
      totalDays: 31,
      category: "beginner",
      reward: "🌟 Wisdom Seeker Badge",
      dailyReadings: this.generatePsalmsProverbsPlan()
    },
    {
      id: "new-testament",
      name: "New Testament Focus",
      description: "Journey through the New Testament in 90 days",
      duration: "90 days",
      totalDays: 90,
      category: "intermediate",
      reward: "✝️ Gospel Reader Badge",
      dailyReadings: this.generateNewTestamentPlan()
    },
    {
      id: "gospels",
      name: "The Four Gospels",
      description: "Study the life of Jesus through Matthew, Mark, Luke, and John",
      duration: "30 days",
      totalDays: 30,
      category: "beginner",
      reward: "❤️ Jesus Follower Badge",
      dailyReadings: this.generateGospelsPlan()
    },
    {
      id: "prophets",
      name: "Major Prophets",
      description: "Deep dive into Isaiah, Jeremiah, Ezekiel, and Daniel",
      duration: "120 days",
      totalDays: 120,
      category: "advanced",
      reward: "🔮 Prophet Scholar Badge + Special Study Guide",
      dailyReadings: this.generateProphetsPlan()
    },
    {
      id: "epistles",
      name: "Paul's Letters",
      description: "Study all of Paul's epistles with commentary and reflection",
      duration: "60 days",
      totalDays: 60,
      category: "intermediate",
      reward: "📜 Apostolic Student Badge",
      dailyReadings: this.generateEpistlesPlan()
    },
    {
      id: "foundations-faith",
      name: "Foundations of Faith",
      description: "A 7-day deep dive into the core pillars of the Christian walk",
      duration: "7 days",
      totalDays: 7,
      category: "beginner",
      reward: "🧱 Solid Foundation Badge + Devotional Guide",
      dailyReadings: this.generateFoundationsPlan()
    }
  ];

  private generateBibleInAYearPlan(): DailyReading[] {
    const readings: DailyReading[] = [];

    // Sample structure for Bible in a Year (first 30 days as example)
    const dailyStructure = [
      { old: "Genesis 1-3", new: "Matthew 1" },
      { old: "Genesis 4-7", new: "Matthew 2" },
      { old: "Genesis 8-11", new: "Matthew 3" },
      { old: "Genesis 12-15", new: "Matthew 4" },
      { old: "Genesis 16-18", new: "Matthew 5" },
      { old: "Genesis 19-21", new: "Matthew 6" },
      { old: "Genesis 22-24", new: "Matthew 7" },
      { old: "Genesis 25-26", new: "Matthew 8" },
      { old: "Genesis 27-29", new: "Matthew 9" },
      { old: "Genesis 30-31", new: "Matthew 10" },
      { old: "Genesis 32-34", new: "Matthew 11" },
      { old: "Genesis 35-37", new: "Matthew 12" },
      { old: "Genesis 38-40", new: "Matthew 13" },
      { old: "Genesis 41-42", new: "Matthew 14" },
      { old: "Genesis 43-45", new: "Matthew 15" },
      { old: "Genesis 46-47", new: "Matthew 16" },
      { old: "Genesis 48-50", new: "Matthew 17" },
      { old: "Exodus 1-3", new: "Matthew 18" },
      { old: "Exodus 4-6", new: "Matthew 19" },
      { old: "Exodus 7-9", new: "Matthew 20" },
      { old: "Exodus 10-12", new: "Matthew 21" },
      { old: "Exodus 13-15", new: "Matthew 22" },
      { old: "Exodus 16-18", new: "Matthew 23" },
      { old: "Exodus 19-21", new: "Matthew 24" },
      { old: "Exodus 22-24", new: "Matthew 25" },
      { old: "Exodus 25-27", new: "Matthew 26" },
      { old: "Exodus 28-29", new: "Matthew 27" },
      { old: "Exodus 30-32", new: "Matthew 28" },
      { old: "Exodus 33-35", new: "Mark 1" },
      { old: "Exodus 36-38", new: "Mark 2" },
      { old: "Exodus 39-40", new: "Mark 3" },
      { old: "Leviticus 1-3", new: "Mark 4" },
      { old: "Leviticus 4-6", new: "Mark 5" },
      { old: "Leviticus 7-9", new: "Mark 6" },
      { old: "Leviticus 10-12", new: "Mark 7" },
      { old: "Leviticus 13-14", new: "Mark 8" },
      { old: "Leviticus 15-17", new: "Mark 9" },
      { old: "Leviticus 18-20", new: "Mark 10" }
    ];

    dailyStructure.forEach((reading, index) => {
      readings.push({
        day: index + 1,
        readings: [reading.old, reading.new],
        description: `Day ${index + 1}: Old Testament and New Testament reading`
      });
    });

    return readings;
  }

  private generatePsalmsProverbsPlan(): DailyReading[] {
    const readings: DailyReading[] = [];

    for (let day = 1; day <= 31; day++) {
      const psalmChapter = day <= 150 ? day : ((day - 1) % 150) + 1;
      const proverbChapter = day <= 31 ? day : ((day - 1) % 31) + 1;

      readings.push({
        day,
        readings: [`Psalm ${psalmChapter}`, `Proverbs ${proverbChapter}`],
        description: `Day ${day}: Wisdom from Psalms and Proverbs`
      });
    }

    return readings;
  }

  private generateNewTestamentPlan(): DailyReading[] {
    const readings: DailyReading[] = [];

    // New Testament books with approximate chapter distribution
    const ntStructure = [
      { book: "Matthew", chapters: 28 },
      { book: "Mark", chapters: 16 },
      { book: "Luke", chapters: 24 },
      { book: "John", chapters: 21 },
      { book: "Acts", chapters: 28 },
      { book: "Romans", chapters: 16 },
      { book: "1 Corinthians", chapters: 16 },
      { book: "2 Corinthians", chapters: 13 },
      { book: "Galatians", chapters: 6 },
      { book: "Ephesians", chapters: 6 },
      { book: "Philippians", chapters: 4 },
      { book: "Colossians", chapters: 4 },
      { book: "1 Thessalonians", chapters: 5 },
      { book: "2 Thessalonians", chapters: 3 },
      { book: "1 Timothy", chapters: 6 },
      { book: "2 Timothy", chapters: 4 },
      { book: "Titus", chapters: 3 },
      { book: "Philemon", chapters: 1 },
      { book: "Hebrews", chapters: 13 },
      { book: "James", chapters: 5 },
      { book: "1 Peter", chapters: 5 },
      { book: "2 Peter", chapters: 3 },
      { book: "1 John", chapters: 5 },
      { book: "2 John", chapters: 1 },
      { book: "3 John", chapters: 1 },
      { book: "Jude", chapters: 1 },
      { book: "Revelation", chapters: 22 }
    ];

    let day = 1;
    let currentBookIndex = 0;
    let currentChapter = 1;

    while (day <= 90 && currentBookIndex < ntStructure.length) {
      const book = ntStructure[currentBookIndex];
      const chaptersForToday = Math.ceil(book.chapters / 3); // Spread chapters across multiple days

      const todayReadings: string[] = [];
      for (let i = 0; i < chaptersForToday && currentChapter <= book.chapters; i++) {
        todayReadings.push(`${book.book} ${currentChapter}`);
        currentChapter++;
      }

      if (currentChapter > book.chapters) {
        currentBookIndex++;
        currentChapter = 1;
      }

      readings.push({
        day,
        readings: todayReadings,
        description: `Day ${day}: New Testament reading`
      });

      day++;
    }

    return readings;
  }

  private generateGospelsPlan(): DailyReading[] {
    const readings: DailyReading[] = [];

    // Gospels structure (30 days)
    const gospelsStructure = [
      { book: "Matthew", days: 8 },
      { book: "Mark", days: 6 },
      { book: "Luke", days: 8 },
      { book: "John", days: 8 }
    ];

    let day = 1;
    gospelsStructure.forEach(gospel => {
      const chaptersPerDay = Math.ceil(gospel.days === 8 ? 28 / 8 : gospel.days === 6 ? 16 / 6 : 21 / 8);

      for (let i = 0; i < gospel.days && day <= 30; i++) {
        const startChapter = i * chaptersPerDay + 1;
        const endChapter = Math.min((i + 1) * chaptersPerDay,
          gospel.book === "Matthew" ? 28 :
            gospel.book === "Mark" ? 16 :
              gospel.book === "Luke" ? 24 : 21);

        readings.push({
          day,
          readings: [`${gospel.book} ${startChapter}-${endChapter}`],
          description: `Day ${day}: ${gospel.book} reading`
        });
        day++;
      }
    });

    return readings;
  }

  private generateProphetsPlan(): DailyReading[] {
    const readings: DailyReading[] = [];

    // Major Prophets structure (120 days)
    const prophetsStructure = [
      { book: "Isaiah", chapters: 66, days: 30 },
      { book: "Jeremiah", chapters: 52, days: 30 },
      { book: "Ezekiel", chapters: 48, days: 30 },
      { book: "Daniel", chapters: 12, days: 30 }
    ];

    let day = 1;
    prophetsStructure.forEach(prophet => {
      const chaptersPerDay = Math.ceil(prophet.chapters / prophet.days);

      for (let i = 0; i < prophet.days && day <= 120; i++) {
        const startChapter = i * chaptersPerDay + 1;
        const endChapter = Math.min((i + 1) * chaptersPerDay, prophet.chapters);

        readings.push({
          day,
          readings: [`${prophet.book} ${startChapter}-${endChapter}`],
          description: `Day ${day}: ${prophet.book} reading`
        });
        day++;
      }
    });

    return readings;
  }

  private generateEpistlesPlan(): DailyReading[] {
    const readings: DailyReading[] = [];

    // Paul's Letters structure (60 days)
    const epistlesStructure = [
      { book: "Romans", chapters: 16, days: 8 },
      { book: "1 Corinthians", chapters: 16, days: 8 },
      { book: "2 Corinthians", chapters: 13, days: 7 },
      { book: "Galatians", chapters: 6, days: 3 },
      { book: "Ephesians", chapters: 6, days: 3 },
      { book: "Philippians", chapters: 4, days: 2 },
      { book: "Colossians", chapters: 4, days: 2 },
      { book: "1 Thessalonians", chapters: 5, days: 3 },
      { book: "2 Thessalonians", chapters: 3, days: 2 },
      { book: "1 Timothy", chapters: 6, days: 3 },
      { book: "2 Timothy", chapters: 4, days: 2 },
      { book: "Titus", chapters: 3, days: 2 },
      { book: "Philemon", chapters: 1, days: 1 },
      { book: "Hebrews", chapters: 13, days: 7 },
      { book: "James", chapters: 5, days: 3 },
      { book: "1 Peter", chapters: 5, days: 3 },
      { book: "2 Peter", chapters: 3, days: 2 },
      { book: "1 John", chapters: 5, days: 3 },
      { book: "2 John", chapters: 1, days: 1 },
      { book: "3 John", chapters: 1, days: 1 },
      { book: "Jude", chapters: 1, days: 1 }
    ];

    let day = 1;
    epistlesStructure.forEach(epistle => {
      const chaptersPerDay = Math.ceil(epistle.chapters / epistle.days);

      for (let i = 0; i < epistle.days && day <= 60; i++) {
        const startChapter = i * chaptersPerDay + 1;
        const endChapter = Math.min((i + 1) * chaptersPerDay, epistle.chapters);

        readings.push({
          day,
          readings: [`${epistle.book} ${startChapter}-${endChapter}`],
          description: `Day ${day}: ${epistle.book} reading`
        });
        day++;
      }
    });

    return readings;
  }

  private generateFoundationsPlan(): DailyReading[] {
    return [
      {
        day: 1,
        readings: ["Genesis 1", "John 1:1-5"],
        description: "The Creator and His Word",
        teachingTitle: "In the Beginning",
        teachingText: "The Christian journey begins with an understanding of our origin. Scripture doesn't start with an argument for God's existence; it starts with His action. 'In the beginning, God created...'\n\nWhen we recognize God as Creator, we recognize His authority and His love. John's Gospel echoes this, revealing that the Word (Jesus) was there from the start. Today, as you read, consider that the same God who spoke the stars into existence is the same God who wants to speak into your life.\n\nHis Word is not just a book of rules, but a source of life and light that no darkness can overcome.",
        reflectionQuestion: "How does knowing that God is your Creator change the way you view your purpose today?"
      },
      {
        day: 2,
        readings: ["Ephesians 2:1-10", "John 3:16-17"],
        description: "Grace: The Free Gift",
        teachingTitle: "Not by Works",
        teachingText: "Many religions are about what man can do to reach God. Christianity is about what God has done to reach man. Grace is 'unmerited favor'—receiving something beautiful that we could never earn.\n\nPaul explains that we were spiritually dead, but God made us alive. This weren't something we achieved; it's a gift. Why? So that no one can boast. Our salvation is anchored in His love, not our performance.\n\nYou are God's 'handiwork,' created in Christ Jesus to do good works. We don't do good works *to be* saved, but *because* we are saved.",
        reflectionQuestion: "Are you trying to earn God's love, or are you resting in the gift of His grace?"
      },
      {
        day: 3,
        readings: ["Romans 8:1-17", "Galatians 5:16-25"],
        description: "Life in the Spirit",
        teachingTitle: "The Helper Within",
        teachingText: "The Christian life is not a solo effort. Before Jesus ascended, He promised a Helper—the Holy Spirit. Living 'in the Spirit' means our internal motivation and power come from God Himself.\n\nRomans 8 tells us there is no condemnation for those in Christ. We are no longer slaves to our old nature but are adopted as children. The Holy Spirit confirms this in our hearts, allowing us to cry out 'Abba, Father.'\n\nWhen we walk by the Spirit, we begin to see 'fruit' grow: love, joy, peace, and patience. It's a natural result of staying connected to the Vine.",
        reflectionQuestion: "In what area of your life do you need to stop relying on your own strength and start relying on the Holy Spirit?"
      },
      {
        day: 4,
        readings: ["Philippians 4:4-9", "Matthew 6:25-34"],
        description: "The Power of Prayer",
        teachingTitle: "Anxious for Nothing",
        teachingText: "Prayer is more than just asking God for things; it's an exchange. We give God our worries, and He gives us His peace. Paul encourages us in Philippians to not be anxious about anything, but in everything, by prayer and petition, with thanksgiving, present our requests to God.\n\nThe 'peace of God, which transcends all understanding' is a supernatural guard over our hearts and minds. Jesus reminds us that our Heavenly Father knows what we need. When we seek His kingdom first, all these concerns find their proper place.\n\nToday, spend time not just talking to God, but thanking Him. Gratitude is the key that unlocks the door to peace.",
        reflectionQuestion: "What is one specific worry you can hand over to God in prayer right now?"
      },
      {
        day: 5,
        readings: ["Psalm 119:105-112", "Hebrews 4:12-13"],
        description: "The Living Word",
        teachingTitle: "A Lamp and a Light",
        teachingText: "The Bible is not a static history book; it is 'alive and active.' It is described as a lamp to our feet and a light to our path. In a world of confusing messages, Scripture provides the stable truth we need to navigate.\n\nHebrews explains that God's Word penetrates deep, judging the thoughts and attitudes of the heart. It reveals our true selves and points us toward the Truth. When we read it, we aren't just gaining information; we are being transformed.\n\nMake it a habit to let the Word have the final say in your decisions. It is the solid ground upon which our faith is built.",
        reflectionQuestion: "When was the last time a specific verse gave you clarity in a difficult situation?"
      },
      {
        day: 6,
        readings: ["John 13:1-17", "1 Corinthians 12:12-27"],
        description: "Community and Service",
        teachingTitle: "The Body of Christ",
        teachingText: "Following Jesus was never meant to be a private, isolated journey. We are called to be part of a community—the Body of Christ. Just as a human body has many parts with different functions, the Church is diverse yet unified.\n\nJesus modeled this through service, washing His disciples' feet. He told them, 'I have set you an example that you should do as I have done for you.' We find our greatest fulfillment when we use our unique gifts to serve others.\n\nWhen we support one another, the world sees a reflection of God's love. We were created for connection.",
        reflectionQuestion: "How can you use your unique gifts to encourage someone else in your church community this week?"
      },
      {
        day: 7,
        readings: ["Matthew 28:16-20", "Acts 1:1-8"],
        description: "The Great Commission",
        teachingTitle: "Go and Make Disciples",
        teachingText: "A foundation is only as good as what is built upon it. Jesus' final words to His followers were a call to action: 'Go and make disciples of all nations.' This isn't just for 'professional' missionaries; it's the calling of every believer.\n\nWe are empowered by the Holy Spirit to be witnesses. This means sharing our story—what God has done in our lives—with those around us. You don't need to have all the answers; you just need to share the Light you've found.\n\nAs you conclude this 7-day journey, remember that Jesus is with you always, to the very end of the age. Your mission starts today, right where you are.",
        reflectionQuestion: "Who is one person in your life who needs to hear about the hope you have in Christ?"
      }
    ];
  }

  getAllPlans(): ReadingPlan[] {
    return this.plans;
  }

  getPlanById(planId: string): ReadingPlan | null {
    return this.plans.find(plan => plan.id === planId) || null;
  }

  getTodaysReading(planId: string, currentDay: number): DailyReading | null {
    const plan = this.getPlanById(planId);
    if (!plan) return null;

    return plan.dailyReadings.find(reading => reading.day === currentDay) || null;
  }

  getCurrentDate(): number {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return dayOfYear;
  }
}

export const readingPlanService = new ReadingPlanService(); 