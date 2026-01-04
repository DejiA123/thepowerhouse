import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { FeedbackService } from '@/services/feedbackService';
import { ArrowLeft, Send, Sparkles, Heart, MessageCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

const formSchema = z.object({
    enjoyed_most: z.string().min(1, "Please share what you enjoyed!"),
    want_more_of: z.string().optional(),
    didnt_work_well: z.string().optional(),
    suggestions: z.string().optional(),
    concerns: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const FollowUpPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            enjoyed_most: "",
            want_more_of: "",
            didnt_work_well: "",
            suggestions: "",
            concerns: "",
        },
    });

    async function onSubmit(data: FormValues) {
        setIsSubmitting(true);
        const { error } = await FeedbackService.submitFeedback({
            enjoyed_most: data.enjoyed_most,
            want_more_of: data.want_more_of || "",
            didnt_work_well: data.didnt_work_well || "",
            suggestions: data.suggestions || "",
            concerns: data.concerns || "",
        });

        setIsSubmitting(false);

        if (error) {
            toast({
                title: "Something went wrong",
                description: "We couldn't submit your feedback. Please try again.",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Feedback Received! 🎉",
                description: "Thank you for helping us grow.",
            });
            form.reset();
            navigate('/resources');
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <div className="relative z-50 sticky top-0 backdrop-blur-xl bg-slate-900/80 border-b border-white/20">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="text-white hover:bg-white/20 rounded-full"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 space-y-12">
                {/* Hero */}
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl mb-4">
                        <Heart className="w-10 h-10 text-pink-400" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-5xl font-black text-white drop-shadow-2xl">
                        We Value Your Voice
                    </h2>
                    <p className="text-xl text-white font-medium max-w-md mx-auto">
                        Help us shape the future of our church family. Your honest feedback is a gift.
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                        {/* Question 1 */}
                        <FormField
                            control={form.control}
                            name="enjoyed_most"
                            render={({ field }) => (
                                <div className={cn(
                                    "relative rounded-2xl p-[2px] transition-all duration-300",
                                    focusedField === 'enjoyed_most'
                                        ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-2xl shadow-purple-500/50"
                                        : "bg-white/20"
                                )}>
                                    <div className="bg-slate-800 rounded-2xl p-6">
                                        <FormItem>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-purple-500/30">
                                                    <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
                                                </div>
                                                <FormLabel className="text-2xl font-bold text-white m-0">
                                                    What did you enjoy most?
                                                </FormLabel>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="The worship was powerful..."
                                                    className="bg-slate-900/80 border-white/30 text-white text-lg placeholder:text-white font-normal min-h-[100px] rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-purple-500"
                                                    {...field}
                                                    onFocus={() => setFocusedField('enjoyed_most')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-300" />
                                        </FormItem>
                                    </div>
                                </div>
                            )}
                        />

                        {/* Question 2 */}
                        <FormField
                            control={form.control}
                            name="want_more_of"
                            render={({ field }) => (
                                <div className={cn(
                                    "relative rounded-2xl p-[2px] transition-all duration-300",
                                    focusedField === 'want_more_of'
                                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 shadow-2xl shadow-blue-500/50"
                                        : "bg-white/20"
                                )}>
                                    <div className="bg-slate-800 rounded-2xl p-6">
                                        <FormItem>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-blue-500/30">
                                                    <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
                                                </div>
                                                <FormLabel className="text-2xl font-bold text-white m-0">
                                                    What would you love more of?
                                                </FormLabel>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="More community events..."
                                                    className="bg-slate-900/80 border-white/30 text-white text-lg placeholder:text-white font-normal min-h-[100px] rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                    {...field}
                                                    onFocus={() => setFocusedField('want_more_of')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-300" />
                                        </FormItem>
                                    </div>
                                </div>
                            )}
                        />

                        {/* Question 3 */}
                        <FormField
                            control={form.control}
                            name="didnt_work_well"
                            render={({ field }) => (
                                <div className={cn(
                                    "relative rounded-2xl p-[2px] transition-all duration-300",
                                    focusedField === 'didnt_work_well'
                                        ? "bg-gradient-to-r from-orange-500 to-yellow-500 shadow-2xl shadow-orange-500/50"
                                        : "bg-white/20"
                                )}>
                                    <div className="bg-slate-800 rounded-2xl p-6">
                                        <FormItem>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-orange-500/30">
                                                    <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
                                                </div>
                                                <FormLabel className="text-2xl font-bold text-white m-0">
                                                    What could be improved?
                                                </FormLabel>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="The sound was a bit loud..."
                                                    className="bg-slate-900/80 border-white/30 text-white text-lg placeholder:text-white font-normal min-h-[100px] rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                                    {...field}
                                                    onFocus={() => setFocusedField('didnt_work_well')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-300" />
                                        </FormItem>
                                    </div>
                                </div>
                            )}
                        />

                        {/* Question 4 */}
                        <FormField
                            control={form.control}
                            name="suggestions"
                            render={({ field }) => (
                                <div className={cn(
                                    "relative rounded-2xl p-[2px] transition-all duration-300",
                                    focusedField === 'suggestions'
                                        ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-2xl shadow-green-500/50"
                                        : "bg-white/20"
                                )}>
                                    <div className="bg-slate-800 rounded-2xl p-6">
                                        <FormItem>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-green-500/30">
                                                    <Lightbulb className="w-6 h-6 text-white" strokeWidth={2.5} />
                                                </div>
                                                <FormLabel className="text-2xl font-bold text-white m-0">
                                                    Suggestions or encouragement?
                                                </FormLabel>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Keep up the great work..."
                                                    className="bg-slate-900/80 border-white/30 text-white text-lg placeholder:text-white font-normal min-h-[100px] rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-green-500"
                                                    {...field}
                                                    onFocus={() => setFocusedField('suggestions')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-300" />
                                        </FormItem>
                                    </div>
                                </div>
                            )}
                        />

                        {/* Question 5 */}
                        <FormField
                            control={form.control}
                            name="concerns"
                            render={({ field }) => (
                                <div className={cn(
                                    "relative rounded-2xl p-[2px] transition-all duration-300",
                                    focusedField === 'concerns'
                                        ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-2xl shadow-red-500/50"
                                        : "bg-white/20"
                                )}>
                                    <div className="bg-slate-800 rounded-2xl p-6">
                                        <FormItem>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-red-500/30">
                                                    <MessageCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
                                                </div>
                                                <FormLabel className="text-2xl font-bold text-white m-0">
                                                    Other concerns?
                                                </FormLabel>
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Whatever is on your mind..."
                                                    className="bg-slate-900/80 border-white/30 text-white text-lg placeholder:text-white font-normal min-h-[100px] rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-red-500"
                                                    {...field}
                                                    onFocus={() => setFocusedField('concerns')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-300" />
                                        </FormItem>
                                    </div>
                                </div>
                            )}
                        />

                        <div className="pt-6">
                            <Button
                                type="submit"
                                className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl rounded-2xl shadow-2xl shadow-purple-600/50 transition-all active:scale-95"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-3">
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-3">
                                        Submit Feedback <Send className="w-6 h-6" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default FollowUpPage;
