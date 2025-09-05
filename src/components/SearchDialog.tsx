
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchDialogProps {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const SearchDialog = ({ searchOpen, setSearchOpen }: SearchDialogProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic search functionality - could be expanded
    if (searchQuery.toLowerCase().includes("bible")) {
      navigate("/bible");
    } else if (searchQuery.toLowerCase().includes("give")) {
      navigate("/give");
    } else if (searchQuery.toLowerCase().includes("service")) {
      navigate("/services");
    } else {
      // General search result
      alert(`Searching for: ${searchQuery}`);
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2">
          <Search className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-4">
          <Input
            placeholder="Search for sermons, bible verses, events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setSearchOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Search</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
