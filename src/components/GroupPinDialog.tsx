
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

interface GroupPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  onSuccess: () => void;
}

const GroupPinDialog = ({ isOpen, onClose, departmentName, onSuccess }: GroupPinDialogProps) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setPin("");
      setSuccess(false);
    }
  }, [isOpen]);

  // Demo PINs for different departments
  const departmentPins: Record<string, string> = {
    choir: "1234",
    ushering: "5678",
    evangelism: "9012",
    pastoral: "3456",
    media: "7890",
    youth: "2468"
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const correctPin = departmentPins[departmentName.toLowerCase().replace(/\s+/g, '')];

      // For demo purposes, if no specific PIN is found, use '1234'
      const checkPin = correctPin || "1234";

      if (pin === checkPin) {
        setSuccess(true);
        setTimeout(() => {

          onSuccess();
          onClose();
        }, 800);
      } else {
        toast({
          title: "Incorrect PIN",
          description: "Please check the code and try again.",
          variant: "destructive"
        });
        setPin("");
        inputRef.current?.focus();
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-3xl">
        <div className="relative">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/patterns/circuit.svg')] opacity-10"></div>
            <div className="relative z-10">
              <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-white/20">
                {success ? (
                  <CheckCircle2 className="w-8 h-8 text-white scale-125 transition-transform" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-bold mb-1">Enter Access PIN</h2>
              <p className="text-blue-100/90 text-sm">Join {departmentName}</p>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Please enter the 4-digit code provided by your leader
                </label>

                <div className="relative flex justify-center py-4">
                  {/* Visual blocks for PIN */}
                  <div className="flex gap-3 relative z-0" onClick={() => inputRef.current?.focus()}>
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${pin[i]
                          ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-400'
                          : i === pin.length
                            ? 'border-blue-400 ring-4 ring-blue-100 dark:ring-blue-900/30 bg-white dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                          }`}
                      >
                        {pin[i] && (
                          <span className="animate-in zoom-in duration-200">{pin[i]}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Hidden actual input */}
                  <Input
                    ref={inputRef}
                    type="tel" // numerical keyboard on mobile
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPin(val);
                      if (val.length === 4) {
                        // Auto-submit when full
                        // setTimeout(() => handleSubmit(), 100); 
                        // Often better UX to let user click or handle in effect, but manual submit is safer to prevent accidental submissions
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 rounded-xl text-gray-500 hover:text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pin.length !== 4 || loading || success}
                  className={`flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all ${success ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : success ? (
                    <span className="flex items-center gap-2">Success <CheckCircle2 className="w-4 h-4" /></span>
                  ) : (
                    <span className="flex items-center gap-2">Join Group <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Demo Code: 1234</p>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupPinDialog;
