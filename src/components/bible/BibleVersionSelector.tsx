import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle } from "lucide-react";

interface BibleVersion {
  id?: string;
  name: string;
  abbreviation: string;
  language?: string | { name: string; code: string };
  version?: string;
}

interface BibleVersionSelectorProps {
  versions: BibleVersion[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
}

export const BibleVersionSelector = ({ versions, selectedVersion, onVersionChange }: BibleVersionSelectorProps) => {
  const currentVersion = versions.find(v => v.abbreviation === selectedVersion);

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <BookOpen className="w-5 h-5" />
          <span>Bible Translation</span>
          {currentVersion && (
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedVersion} onValueChange={onVersionChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Bible translation" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {versions.map((version) => (
              <SelectItem key={version.abbreviation} value={version.abbreviation}>
                <div className="flex flex-col">
                  <span className="font-medium">{version.name}</span>
                  <span className="text-sm text-muted-foreground">{version.abbreviation.toUpperCase()}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentVersion && (
          <p className="text-sm text-muted-foreground mt-2">
            Currently using: <span className="font-medium">{currentVersion.name}</span>
          </p>
        )}
        <div className="text-sm text-gray-600 mb-4">
          Choose your preferred Bible translation for reading and study.
        </div>
      </CardContent>
    </Card>
  );
};
