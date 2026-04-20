
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Trash2, Search, ExternalLink, Sparkles, 
  ChevronRight, Bookmark, Pin
} from "lucide-react";
import { useSidebarShortcuts, ICON_MAP, PRESET_SHORTCUTS } from "@/hooks/useSidebarShortcuts";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarCustomizer = ({ isOpen, onClose }: SidebarCustomizerProps) => {
  const { shortcuts, addShortcut, removeShortcut } = useSidebarShortcuts();
  const location = useLocation();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Bookmark");
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddCurrentPage = () => {
    // Basic formatting for names based on path
    let autoName = document.title.split('|')[0].trim() || "New Shortcut";
    
    addShortcut({
      name: autoName,
      path: location.pathname,
      icon: selectedIcon
    });
    
    // Clear form
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

  const currentIcons = Object.keys(ICON_MAP).filter(key => 
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">Customize Sidebar</DialogTitle>
              <DialogDescription>Personalize your navigation for quick access.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-8 pb-8 space-y-6">
          <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
            <div className="space-y-8 py-4">
              {/* Active Shortcuts */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  Your Shortcuts ({shortcuts.length})
                </h3>
                {shortcuts.length === 0 ? (
                  <div className="text-center py-8 bg-accent/30 rounded-2xl border border-dashed border-border/60">
                    <p className="text-sm text-muted-foreground">No custom shortcuts yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {shortcuts.map((shortcut) => {
                      const Icon = ICON_MAP[shortcut.icon] || Pin;
                      return (
                        <div 
                          key={shortcut.id}
                          className="flex items-center justify-between p-3 bg-accent/40 rounded-xl border border-border/40 group hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{shortcut.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{shortcut.path}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                            onClick={() => removeShortcut(shortcut.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Section */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                   Quick Actions
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                   <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-between border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-2xl group"
                    onClick={handleAddCurrentPage}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary">Shortcut Current Page</p>
                        <p className="text-xs text-muted-foreground underline decoration-primary/20">{location.pathname}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-primary/40" />
                  </Button>
                </div>

                <div className="space-y-4 pt-2">
                   <h3 className="text-sm font-semibold text-muted-foreground">Suggestions</h3>
                   <div className="flex flex-wrap gap-2">
                      {PRESET_SHORTCUTS.map((preset) => (
                        <Button
                          key={preset.path}
                          variant="secondary"
                          size="sm"
                          className="rounded-full text-xs bg-accent/60 hover:bg-primary hover:text-white transition-all gap-1.5"
                          onClick={() => addShortcut(preset)}
                        >
                          <Plus className="w-3 h-3" />
                          {preset.name}
                        </Button>
                      ))}
                   </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Custom Form */}
                <form onSubmit={handleAddCustom} className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Create Manual Shortcut</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. Choir" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="path">Path</Label>
                      <Input 
                        id="path" 
                        placeholder="e.g. /groups/choir" 
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Select Icon</Label>
                      <div className="relative w-32 sm:w-48">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="Search..." 
                          className="h-7 pl-7 text-[10px] rounded-lg"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 bg-accent/20 rounded-xl border border-border/40 scrollbar-hide">
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
                                : "hover:bg-accent text-muted-foreground"
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
                    className="w-full rounded-xl h-11 transition-all"
                    disabled={!name || !path}
                  >
                    Add Shortcut
                  </Button>
                </form>
              </div>
            </div>
          </ScrollArea>

          <DialogHeader className="pt-4 mt-4 border-t">
            <Button variant="ghost" onClick={onClose} className="w-full rounded-xl h-11 text-muted-foreground">
              Close Customizer
            </Button>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SidebarCustomizer;
