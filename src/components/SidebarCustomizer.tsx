
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Trash2, Search, Sparkles, 
  ChevronRight, Bookmark, Pin, Edit2, Check, X,
  Settings2, ListMusic
} from "lucide-react";
import { useSidebarShortcuts, ICON_MAP, PRESET_SHORTCUTS } from "@/hooks/useSidebarShortcuts";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarCustomizer = ({ isOpen, onClose }: SidebarCustomizerProps) => {
  const { shortcuts, addShortcut, updateShortcut, removeShortcut } = useSidebarShortcuts();
  const location = useLocation();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Bookmark");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Map paths to friendly names for better auto-naming
  const getFriendlyPageName = (pathname: string) => {
    if (pathname === "/") return "Home";
    if (pathname === "/news") return "News Feed";
    if (pathname === "/bible") return "Bible";
    if (pathname === "/bible-notes") return "My Notes";
    if (pathname === "/social") return "Social Circle";
    if (pathname === "/give") return "Giving";
    if (pathname === "/prayer") return "Prayer Wall";
    if (pathname === "/groups") return "All Groups";
    
    // Pattern matches
    if (pathname.includes("/groups/choir/galway")) return "Galway Choir";
    if (pathname.includes("/groups/choir/dublin")) return "Dublin Choir";
    if (pathname.includes("/groups/choir")) return "Choir Portal";
    if (pathname.includes("/groups/management")) return "Management";
    
    // Fallback to title but remove the site name
    const title = document.title.split('|')[0].trim();
    if (title && title !== "The Power House" && title !== "The PowerHouse") {
      return title;
    }
    
    // Last resort: Format the path
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
    }
    
    return "New Shortcut";
  };

  const currentAutoName = useMemo(() => getFriendlyPageName(location.pathname), [location.pathname]);

  const handleAddCurrentPage = () => {
    addShortcut({
      name: currentAutoName,
      path: location.pathname,
      icon: selectedIcon
    });
    
    setName("");
    setPath("");
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !path) return;
    
    addShortcut({
      name,
      path,
      icon: selectedIcon
    });
    
    setName("");
    setPath("");
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updateShortcut(id, { name: editName });
    setEditingId(null);
  };

  const currentIcons = Object.keys(ICON_MAP).filter(key => 
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-3xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Sidebar Settings</DialogTitle>
              <DialogDescription>Manage your personalized navigation.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="manage" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent gap-2 p-0">
              <TabsTrigger 
                value="manage" 
                className="rounded-t-xl data-[state=active]:bg-accent/40 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary transition-all font-semibold"
              >
                <ListMusic className="w-4 h-4 mr-2" />
                Manage
              </TabsTrigger>
              <TabsTrigger 
                value="add"
                className="rounded-t-xl data-[state=active]:bg-accent/40 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary transition-all font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <TabsContent value="manage" className="m-0 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Your Active Shortcuts ({shortcuts.length})
                    </h3>
                  </div>
                  
                  {shortcuts.length === 0 ? (
                    <div className="text-center py-12 bg-accent/20 rounded-2xl border border-dashed border-border/60">
                      <Bookmark className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No custom shortcuts yet.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Add one to personalize your sidebar!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {shortcuts.map((shortcut) => {
                        const Icon = ICON_MAP[shortcut.icon] || Pin;
                        const isEditing = editingId === shortcut.id;

                        return (
                          <div 
                            key={shortcut.id}
                            className={cn(
                              "flex items-center justify-between p-3 bg-accent/30 rounded-xl border border-border/40 group transition-all",
                              isEditing ? "border-primary/50 shadow-sm bg-accent/50" : "hover:border-primary/20"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <Input 
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="h-8 text-sm focus:ring-1 focus:ring-primary rounded-lg"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(shortcut.id);
                                        if (e.key === 'Escape') setEditingId(null);
                                      }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50" onClick={() => handleSaveEdit(shortcut.id)}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm font-medium truncate">{shortcut.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{shortcut.path}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {!isEditing && (
                              <div className="flex items-center gap-1 ml-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleStartEdit(shortcut.id, shortcut.name)}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                                  onClick={() => removeShortcut(shortcut.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="add" className="m-0 space-y-8">
                  {/* Pin Current Page */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Pin</h3>
                    <Button 
                      variant="outline" 
                      className="w-full h-auto p-4 justify-between border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-2xl group transition-all"
                      onClick={handleAddCurrentPage}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                          <Pin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">Pin Current Page</p>
                          <p className="text-xs text-muted-foreground">Add "{currentAutoName}" as shortcut</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-primary/40" />
                    </Button>
                  </div>

                  {/* Manual Form */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custom Shortcut</h3>
                    <form onSubmit={handleAddCustom} className="space-y-4 p-4 rounded-2xl bg-accent/10 border border-border/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider opacity-60">Name</Label>
                          <Input 
                            id="name" 
                            placeholder="e.g. Choir" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-xl border-border/40 h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="path" className="text-xs font-bold uppercase tracking-wider opacity-60">Path</Label>
                          <Input 
                            id="path" 
                            placeholder="e.g. /groups/choir" 
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            className="rounded-xl border-border/40 h-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Select Icon</Label>
                          <div className="relative w-32 sm:w-48">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                            <Input 
                              placeholder="Search icons..." 
                              className="h-8 pl-8 text-[11px] rounded-lg border-border/40 focus:ring-1 focus:ring-primary"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-32 overflow-y-auto p-2 bg-background/50 rounded-xl border border-border/20 scrollbar-hide">
                          {currentIcons.map((iconName) => {
                            const Icon = ICON_MAP[iconName];
                            return (
                              <button
                                key={iconName}
                                type="button"
                                className={cn(
                                  "w-10 h-10 flex items-center justify-center rounded-lg transition-all",
                                  selectedIcon === iconName 
                                    ? "bg-primary text-white shadow-md scale-110" 
                                    : "hover:bg-accent text-muted-foreground/80 hover:text-primary"
                                )}
                                title={iconName}
                                onClick={() => setSelectedIcon(iconName)}
                              >
                                <Icon className="w-5 h-5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full rounded-xl h-11 transition-all bg-primary hover:bg-primary/90 font-bold tracking-wide"
                        disabled={!name || !path}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    </form>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Suggestions</h3>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_SHORTCUTS.map((preset) => (
                          <Button
                            key={preset.path}
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs bg-white dark:bg-gray-800 border-border/40 hover:bg-primary hover:text-white hover:border-primary transition-all gap-1.5 py-1"
                            onClick={() => addShortcut(preset)}
                          >
                            <Plus className="w-3 h-3" />
                            {preset.name}
                          </Button>
                        ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 pt-2 border-t mt-auto">
            <Button variant="ghost" onClick={onClose} className="w-full rounded-xl h-11 text-muted-foreground font-medium hover:bg-accent/50">
              Done Customizing
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SidebarCustomizer;
