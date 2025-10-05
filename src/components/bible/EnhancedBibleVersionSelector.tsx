import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CheckCircle, Search, Star, Volume2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { enhancedBibleBrainService, type EnhancedBibleVersion } from "@/services/enhancedBibleBrainService";

interface EnhancedBibleVersionSelectorProps {
  selectedVersion: string;
  onVersionChange: (version: string) => void;
}

type ViewMode = 'dropdown' | 'detailed';
type FilterCategory = 'all' | 'Traditional' | 'Modern' | 'Paraphrase' | 'Study' | 'Regional' | 'Other';

export const EnhancedBibleVersionSelector = ({ 
  selectedVersion, 
  onVersionChange 
}: EnhancedBibleVersionSelectorProps) => {
  const [versions, setVersions] = useState<EnhancedBibleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('dropdown');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [showPopularOnly, setShowPopularOnly] = useState(false);

  // Load all English versions on component mount
  useEffect(() => {
    loadAllVersions();
  }, []);

  const loadAllVersions = async () => {
    try {
      setLoading(true);
      const allVersions = await enhancedBibleBrainService.getAllEnglishVersions();
      setVersions(allVersions);
    } catch (error) {
      console.error('Error loading Bible versions:', error);
      // Load fallback versions on error
      const fallbackVersions = enhancedBibleBrainService.getFallbackVersions();
      setVersions(fallbackVersions);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search versions
  const filteredVersions = useMemo(() => {
    let filtered = versions;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(v => v.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchLower) ||
        v.abbreviation.toLowerCase().includes(searchLower) ||
        (v.description?.toLowerCase().includes(searchLower))
      );
    }

    // Show only popular versions if toggled
    if (showPopularOnly) {
      filtered = filtered.filter(v => (v.popularity || 0) >= 50);
    }

    return filtered;
  }, [versions, selectedCategory, searchQuery, showPopularOnly]);

  // Get current version info
  const currentVersion = versions.find(v => v.abbreviation === selectedVersion);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      all: versions.length,
      Traditional: 0,
      Modern: 0,
      Paraphrase: 0,
      Study: 0,
      Regional: 0,
      Other: 0
    };

    versions.forEach(v => {
      if (v.category) {
        counts[v.category]++;
      }
    });

    return counts;
  }, [versions]);

  const getCategoryIcon = (category: FilterCategory) => {
    switch (category) {
      case 'Traditional': return '📜';
      case 'Modern': return '🆕';
      case 'Paraphrase': return '💬';
      case 'Study': return '🔍';
      case 'Regional': return '🌍';
      default: return '📖';
    }
  };

  const VersionCard = ({ version }: { version: EnhancedBibleVersion }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedVersion === version.abbreviation ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onVersionChange(version.abbreviation)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-sm">{version.name}</h4>
              {version.hasAudio && <Volume2 className="w-4 h-4 text-blue-500" />}
              {selectedVersion === version.abbreviation && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {version.abbreviation}
              </Badge>
              {version.category && (
                <Badge variant="outline" className="text-xs">
                  {getCategoryIcon(version.category)} {version.category}
                </Badge>
              )}
              {(version.popularity || 0) >= 70 && (
                <Badge variant="outline" className="text-xs text-yellow-600">
                  <Star className="w-3 h-3 mr-1" /> Popular
                </Badge>
              )}
            </div>
            
            {version.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {version.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {version.year && <span>Published: {version.year}</span>}
              {version.publisher && <span>Publisher: {version.publisher}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
            <Skeleton className="h-4 w-1/2" />
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
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'dropdown' ? 'detailed' : 'dropdown')}
                  >
                    {viewMode === 'dropdown' ? <Info className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {viewMode === 'dropdown' ? 'Show detailed view' : 'Show simple dropdown'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'dropdown' ? (
          // Simple dropdown view
          <div className="space-y-4">
            <Select value={selectedVersion} onValueChange={onVersionChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Bible translation" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {versions.map((version) => (
                  <SelectItem key={version.abbreviation} value={version.abbreviation}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.name}</span>
                        {version.hasAudio && <Volume2 className="w-3 h-3 text-blue-500" />}
                        {(version.popularity || 0) >= 70 && <Star className="w-3 h-3 text-yellow-500" />}
                      </div>
                      <span className="text-sm text-muted-foreground">{version.abbreviation.toUpperCase()}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {currentVersion && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Currently using: <span className="font-medium">{currentVersion.name}</span>
                </p>
                {currentVersion.description && (
                  <p className="text-xs">{currentVersion.description}</p>
                )}
              </div>
            )}
            
            <div className="text-sm text-gray-600">
              Choose from {versions.length} available English Bible translations.
            </div>
          </div>
        ) : (
          // Detailed view with search and filtering
          <div className="space-y-4">
            {/* Search and filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search translations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant={showPopularOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPopularOnly(!showPopularOnly)}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Popular Only
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  {filteredVersions.length} of {versions.length} translations
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as FilterCategory)}>
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="all" className="text-xs">
                  All ({categoryCounts.all})
                </TabsTrigger>
                <TabsTrigger value="Traditional" className="text-xs">
                  📜 Traditional ({categoryCounts.Traditional})
                </TabsTrigger>
                <TabsTrigger value="Modern" className="text-xs">
                  🆕 Modern ({categoryCounts.Modern})
                </TabsTrigger>
                <TabsTrigger value="Paraphrase" className="text-xs">
                  💬 Paraphrase ({categoryCounts.Paraphrase})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Version list */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredVersions.length > 0 ? (
                filteredVersions.map((version) => (
                  <VersionCard key={version.abbreviation} version={version} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2" />
                  <p>No translations found matching your criteria</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setShowPopularOnly(false);
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};