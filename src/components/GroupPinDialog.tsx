
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface GroupPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  onSuccess: () => void;
}

const GroupPinDialog = ({ isOpen, onClose, departmentName, onSuccess }: GroupPinDialogProps) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Demo PINs for different departments
  const departmentPins: Record<string, string> = {
    choir: "1234",
    ushering: "5678",
    evangelism: "9012",
    pastoral: "3456",
    media: "7890",
    youth: "2468"
  };

  const handleSubmit = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const correctPin = departmentPins[departmentName.toLowerCase().replace(/\s+/g, '')];
      
      if (pin === correctPin) {
        toast({
          title: "Welcome!",
          description: `Successfully joined ${departmentName} group.`,
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again.",
          variant: "destructive"
        });
      }
      setLoading(false);
      setPin("");
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join {departmentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Enter the PIN provided by your group leader to join this department.
          </p>
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={4}
          />
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={pin.length !== 4 || loading}
              className="flex-1"
            >
              {loading ? "Joining..." : "Join Group"}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Demo PINs: Choir (1234), Ushering (5678), Evangelism (9012)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupPinDialog;
