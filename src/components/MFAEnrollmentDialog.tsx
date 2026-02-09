import { useState, useEffect } from "react";
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
import { Shield, Copy, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface MFAEnrollmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const MFAEnrollmentDialog = ({ open, onOpenChange, onSuccess }: MFAEnrollmentDialogProps) => {
    const [step, setStep] = useState<"enroll" | "verify">("enroll");
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [factorId, setFactorId] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [secretCopied, setSecretCopied] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && step === "enroll") {
            enrollMFA();
        }
    }, [open]);

    const enrollMFA = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "Authenticator App",
            });

            if (error) throw error;

            if (data) {
                const { id, totp } = data;
                setFactorId(id);

                if (totp.qr_code) {
                    setQrCodeUrl(totp.qr_code);
                }

                if (totp.secret) {
                    setSecret(totp.secret);

                    // Generate QR code if not provided
                    if (!totp.qr_code) {
                        const uri = totp.uri || `otpauth://totp/The%20Power%20House:user?secret=${totp.secret}&issuer=The%20Power%20House`;
                        const qrUrl = await QRCode.toDataURL(uri);
                        setQrCodeUrl(qrUrl);
                    }
                }

                setStep("verify");
            }
        } catch (error: any) {
            toast({
                title: "Enrollment Failed",
                description: error.message || "Failed to start MFA enrollment",
                variant: "destructive",
            });
            onOpenChange(false);
        }
        setIsLoading(false);
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });

            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verificationCode,
            });

            if (verify.error) throw verify.error;

            toast({
                title: "MFA Enabled!",
                description: "Two-factor authentication has been successfully enabled.",
            });

            onSuccess();
            handleClose();
        } catch (error: any) {
            toast({
                title: "Verification Failed",
                description: error.message || "Invalid verification code",
                variant: "destructive",
            });
        }

        setIsLoading(false);
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret);
        setSecretCopied(true);
        toast({
            title: "Copied!",
            description: "Secret key copied to clipboard",
        });
        setTimeout(() => setSecretCopied(false), 2000);
    };

    const handleClose = () => {
        setStep("enroll");
        setQrCodeUrl("");
        setSecret("");
        setFactorId("");
        setVerificationCode("");
        setSecretCopied(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        Enable Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Add an extra layer of security to your account
                    </DialogDescription>
                </DialogHeader>

                {isLoading && step === "enroll" ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Setting up MFA...</p>
                    </div>
                ) : step === "verify" ? (
                    <form onSubmit={handleVerify} className="space-y-6">
                        {/* QR Code Display */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 bg-white rounded-2xl shadow-md">
                                {qrCodeUrl && (
                                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                                )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                Scan this QR code with your authenticator app
                            </p>
                        </div>

                        {/* Secret Key Display */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                Or enter this key manually
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={secret}
                                    readOnly
                                    className="font-mono text-sm bg-gray-50 dark:bg-slate-700 rounded-xl"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopySecret}
                                    className="shrink-0 rounded-xl"
                                >
                                    {secretCopied ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Verification Code Input */}
                        <div className="space-y-2">
                            <Label htmlFor="verification-code" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                Enter Verification Code
                            </Label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <Input
                                    id="verification-code"
                                    type="text"
                                    placeholder="000000"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="pl-12 h-12 rounded-2xl text-center text-2xl tracking-widest font-mono"
                                    required
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Enter the 6-digit code from your authenticator app
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 h-12 rounded-2xl font-semibold"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold transition-all duration-300"
                                disabled={isLoading || verificationCode.length !== 6}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Verifying...
                                    </div>
                                ) : (
                                    "Verify & Enable"
                                )}
                            </Button>
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                💡 <span className="font-semibold">Recommended apps:</span> Google Authenticator, Authy, 1Password, or Microsoft Authenticator
                            </p>
                        </div>
                    </form>
                ) : null}
            </DialogContent>
        </Dialog>
    );
};

export default MFAEnrollmentDialog;
