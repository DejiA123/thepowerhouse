
import { useState, useMemo } from "react";
import { Search, Check, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVersions = useMemo(() => {
    if (!searchQuery.trim()) return versions;
    const query = searchQuery.toLowerCase();
    return versions.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.abbreviation.toLowerCase().includes(query)
    );
  }, [versions, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search translation (e.g. KJV, NIV)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* Popular / Recent Suggestions (Mock logic: if no search, show a separator label) */}
      {!searchQuery && (
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Available Translations
        </div>
      )}

      {/* Versions List */}
      <div className="space-y-1">
        {filteredVersions.length > 0 ? (
          filteredVersions.map((version) => {
            const isSelected = (version.id || version.abbreviation) === selectedVersion;

            return (
              <div
                key={version.id || version.abbreviation}
                onClick={() => onVersionChange(version.id || version.abbreviation)}
                className={`
                  flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                  ${isSelected
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100 dark:bg-transparent dark:hover:bg-gray-800 dark:hover:border-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Abbreviation Badge */}
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm transition-colors
                    ${isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }
                  `}>
                    {version.abbreviation.toUpperCase().replace('ENG', '')}
                  </div>

                  {/* Details */}
                  <div className="flex flex-col">
                    <span className={`font-semibold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {version.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      English
                    </span>
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>No translations found</p>
          </div>
        )}
      </div>
    </div>
  );
};
