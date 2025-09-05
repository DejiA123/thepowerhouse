
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SharedFile {
  name: string;
  type: string;
  date: string;
  department: string;
}

const SharedFiles = () => {
  const sharedFiles: SharedFile[] = [
    { name: "Choir Song List - June", type: "PDF", date: "2025-06-01", department: "Choir" },
    { name: "Evangelism Training Manual", type: "PDF", date: "2025-05-28", department: "Evangelism" },
    { name: "Ushering Guidelines", type: "DOCX", date: "2025-05-25", department: "Ushering" },
    { name: "Media Equipment Manual", type: "PDF", date: "2025-05-20", department: "Media" }
  ];

  return (
    <div className="space-y-3">
      {sharedFiles.map((file, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium">{file.name}</h3>
              <p className="text-sm text-muted-foreground">{file.department} • {file.date}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{file.type}</Badge>
            <Button variant="ghost" size="sm">Download</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SharedFiles;
