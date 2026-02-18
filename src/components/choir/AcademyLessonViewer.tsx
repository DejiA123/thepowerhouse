import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AcademyModule } from "@/services/choirService";
import { PlayCircle, Award, ArrowLeft } from "lucide-react";
import { useState } from "react";

interface AcademyLessonViewerProps {
    isOpen: boolean;
    onClose: () => void;
    module: AcademyModule;
    onTakeQuiz?: (module: AcademyModule) => void;
}

export const AcademyLessonViewer = ({ isOpen, onClose, module, onTakeQuiz }: AcademyLessonViewerProps) => {
    const videoId = module.video_url ? extractYoutubeId(module.video_url) : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!fixed !inset-x-0 !bottom-0 !top-[env(safe-area-inset-top,0px)] !w-full !h-[calc(100dvh-env(safe-area-inset-top,0px))] !max-w-none !m-0 !p-0 !rounded-none bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-6 [&>button]:!right-10 !transform-none !translate-y-0 !translate-x-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full duration-500 flex flex-col">
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

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-8">
                        {/* Video Section */}
                        {videoId && (
                            <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/10 bg-black">
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
                        <div className="prose prose-lg dark:prose-invert prose-indigo max-w-none">
                            {module.content ? (
                                <div dangerouslySetInnerHTML={{ __html: module.content }} />
                            ) : (
                                <p className="text-slate-500 italic pb-8">
                                    Watch the video above to complete this lesson.
                                </p>
                            )}
                        </div>

                        {/* Action Footer */}
                        <div className="pt-12 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] flex justify-center">
                            <Button
                                onClick={() => onTakeQuiz && onTakeQuiz(module)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-8 px-12 text-xl font-bold shadow-xl shadow-blue-500/20 transform transition-all hover:scale-105 active:scale-95"
                            >
                                <Award className="w-6 h-6 mr-3" />
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
