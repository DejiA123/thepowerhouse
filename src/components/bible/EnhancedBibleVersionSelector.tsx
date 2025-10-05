import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, CheckCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { enhancedBibleApi, type BibleVersion } from "@/services/enhancedBibleApi";

interface EnhancedBibleVersionSelectorProps {
  selectedVersion: string;
  onVersionChange: (version: string) => void;
}

export const EnhancedBibleVersionSelector = ({ 
  selectedVersion, 
  onVersionChange 
}: EnhancedBibleVersionSelectorProps) => {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        const fetchedVersions = await enhancedBibleApi.getVersions();
        setVersions(fetchedVersions);
      } catch (error) {
        console.error('Error loading Bible versions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVersions();
  }, []);

  const filteredVersions = useMemo(() => {
    if (!searchQuery.trim()) {
      return versions;
    }
    const searchLower = searchQuery.toLowerCase();
    return versions.filter(v => 
      v.name.toLowerCase().includes(searchLower) ||
      v.abbreviation.toLowerCase().includes(searchLower)
    );
  }, [versions, searchQuery]);

  const currentVersion = versions.find(v => v.version === selectedVersion);

  if (loading) {
    return (
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <BookOpen className="w-5 h-5" />
            <span>Bible Translation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Bible Translation</span>
            {currentVersion && (
              <div className="flex items-center space-x-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Selected</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedVersion} onValueChange={onVersionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Bible translation" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredVersions.map((version) => (
                <SelectItem key={version.version} value={version.version}>
                  <div className="flex flex-col">
                    <span className="font-medium">{version.name}</span>
                    <span className="text-sm text-muted-foreground">{version.abbreviation.toUpperCase()}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentVersion && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Currently using: <span className="font-medium">{currentVersion.name} ({currentVersion.abbreviation.toUpperCase()})</span>
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            Choose from {versions.length} available English Bible translations.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};