import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const EmailOTPForm = () => {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: false, // Only allow existing users
                }
            });

            if (error) {
                toast({
                    title: "Failed to send OTP",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setOtpSent(true);
                setCountdown(60); // 60 second cooldown
                toast({
                    title: "OTP Sent!",
                    description: "Check your email for the verification code.",
                });

                // Start countdown timer
                const timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        }

        setIsLoading(false);
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email,
                token: otp,
                type: 'email'
            });

            if (error) {
                toast({
                    title: "Verification Failed",
                    description: error.message,
                    variant: "destructive",
                });
            } else if (data.user) {
                toast({
                    title: "Success!",
                    description: "You've been logged in successfully.",
                });
                navigate("/");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        }

        setIsLoading(false);
    };

    const handleResendOTP = async () => {
        setOtp(""); // Clear previous OTP
        await handleSendOTP({ preventDefault: () => { } } as React.FormEvent);
    };

    if (otpSent) {
        return (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        We sent a 6-digit code to <span className="font-semibold text-blue-600 dark:text-blue-400">{email}</span>
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="otp" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Verification Code
                    </Label>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <Input
                            id="otp"
                            type="text"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="pl-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 text-center text-2xl tracking-widest font-mono"
                            required
                            maxLength={6}
                            autoFocus
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    disabled={isLoading || otp.length !== 6}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                        </div>
                    ) : (
                        "Verify & Sign In"
                    )}
                </Button>

                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        onClick={() => {
                            setOtpSent(false);
                            setOtp("");
                            setEmail("");
                        }}
                    >
                        ← Change email
                    </Button>

                    <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        onClick={handleResendOTP}
                        disabled={countdown > 0 || isLoading}
                    >
                        {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                    </Button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
                        💡 Check your spam folder if you don't see the email
                    </p>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="text-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter your email to receive a one-time passcode
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="otp-email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Email Address
                </Label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                        id="otp-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200"
                        required
                        autoFocus
                    />
                </div>
            </div>

            <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                    </div>
                ) : (
                    "Send Passcode"
                )}
            </Button>

            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <p className="text-xs text-indigo-800 dark:text-indigo-200 text-center">
                    🔒 No password needed! We'll email you a secure one-time code.
                </p>
            </div>
        </form>
    );
};

export default EmailOTPForm;
