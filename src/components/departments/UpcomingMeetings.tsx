
export interface Meeting {
  department: string;
  date: string;
  time: string;
  topic: string;
}

const UpcomingMeetings = () => {
  const upcomingMeetings: Meeting[] = [
    { department: "Choir", date: "2025-06-11", time: "7:00 PM", topic: "Christmas cantata practice" },
    { department: "Evangelism", date: "2025-06-14", time: "2:00 PM", topic: "Street witnessing downtown" },
    { department: "Media", date: "2025-06-08", time: "8:00 AM", topic: "Sound check and setup" },
    { department: "Youth", date: "2025-06-13", time: "7:00 PM", topic: "Game night planning" }
  ];

  return (
    <div className="space-y-3">
      {upcomingMeetings.map((meeting, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div>
            <h3 className="font-medium">{meeting.department}</h3>
            <p className="text-sm text-muted-foreground">{meeting.topic}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">{meeting.date}</p>
            <p className="text-sm text-muted-foreground">{meeting.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingMeetings;
