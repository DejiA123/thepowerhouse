import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MFAVerificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    factorId: string;
    onSuccess: () => void;
}

const MFAVerificationDialog = ({ open, onOpenChange, factorId, onSuccess }: MFAVerificationDialogProps) => {
    const [verificationCode, setVerificationCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Create a challenge
            const challenge = await supabase.auth.mfa.challenge({ factorId });

            if (challenge.error) throw challenge.error;

            // Verify the code
            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verificationCode,
            });

            if (verify.error) throw verify.error;

            toast({
                title: "Verified!",
                description: "Authentication successful.",
            });

            onSuccess();
            handleClose();
        } catch (error: any) {
            toast({
                title: "Verification Failed",
                description: error.message || "Invalid verification code. Please try again.",
                variant: "destructive",
            });
            setVerificationCode(""); // Clear on error
        }

        setIsLoading(false);
    };

    const handleClose = () => {
        setVerificationCode("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Enter the verification code from your authenticator app
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleVerify} className="space-y-6">
                    {/* Verification Code Input */}
                    <div className="space-y-2">
                        <Label htmlFor="mfa-code" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Verification Code
                        </Label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <Input
                                id="mfa-code"
                                type="text"
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-center text-3xl tracking-widest font-mono focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200"
                                required
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            Open your authenticator app to get the code
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1 h-12 rounded-2xl font-semibold border-2"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                            disabled={isLoading || verificationCode.length !== 6}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </div>
                            ) : (
                                "Verify"
                            )}
                        </Button>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
                            🔒 Your account is protected with two-factor authentication
                        </p>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default MFAVerificationDialog;
