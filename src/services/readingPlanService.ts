export interface DailyReading {
  day: number;
  readings: string[];
  description?: string;
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