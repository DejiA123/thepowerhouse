import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AcademyModule } from "@/services/choirService";
import { PlayCircle, Award, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

interface AcademyLessonViewerProps {
    isOpen: boolean;
    onClose: () => void;
    module: AcademyModule;
    onTakeQuiz?: (module: AcademyModule) => void;
}

export const AcademyLessonViewer = ({ isOpen, onClose, module, onTakeQuiz }: AcademyLessonViewerProps) => {
    const videoId = module.video_url ? extractYoutubeId(module.video_url) : null;

    useEffect(() => {
        if (isOpen) {
            const scrollContainer = document.getElementById('lesson-content-scroll');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    }, [isOpen, module.id]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!fixed !inset-0 !top-[env(safe-area-inset-top,0px)] !w-full !h-[calc(100dvh-env(safe-area-inset-top,0px))] !max-w-none !m-0 !p-0 !rounded-none bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-4 [&>button]:!right-6 !transform-none !translate-y-0 !translate-x-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full duration-500 flex flex-col border-none">
                <DialogHeader className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full h-8 w-8 -ml-2"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white line-clamp-1">
                                {module.title}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                                {module.category === 'newcomer' ? 'New Member Path' : 'Core Training'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto" id="lesson-content-scroll">
                    <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
                        {/* Video Section */}
                        {videoId && (
                            <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/10 bg-black group relative">
                                <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                                    title={module.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        {/* Content Section */}
                        <div className="space-y-10">
                            {module.description && (
                                <p className="text-xl font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-indigo-500 pl-6">
                                    {module.description}
                                </p>
                            )}

                            <div className="prose prose-lg md:prose-xl dark:prose-invert prose-indigo max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-p:leading-8 prose-p:text-slate-600 dark:prose-p:text-slate-300">
                                {module.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: module.content }} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700">
                                        <PlayCircle className="w-12 h-12 text-indigo-500 mb-4 opacity-50" />
                                        <p className="text-slate-500 dark:text-slate-400 font-bold text-center">
                                            Watch the video above to complete this lesson.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="pt-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
                            <div className="text-center space-y-2">
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Ready for the challenge?</h4>
                                <p className="text-sm text-slate-500">Complete the quiz to earn your module completion badge.</p>
                            </div>
                            <Button
                                onClick={() => onTakeQuiz && onTakeQuiz(module)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[24px] h-20 px-16 text-xl font-bold shadow-2xl shadow-indigo-500/30 transform transition-all hover:scale-105 active:scale-95 group"
                            >
                                <Award className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                                Take Quiz & Complete
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

function extractYoutubeId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
