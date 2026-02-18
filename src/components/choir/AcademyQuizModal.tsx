import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AcademyModule, AcademyQuiz, QuizQuestion, choirService } from "@/services/choirService";
import { CheckCircle2, XCircle, Award, ArrowRight, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";

interface AcademyQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    module: AcademyModule;
}

export const AcademyQuizModal = ({ isOpen, onClose, module }: AcademyQuizModalProps) => {
    const [quiz, setQuiz] = useState<AcademyQuiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        if (isOpen && module) {
            loadQuiz();
        } else {
            resetQuiz();
        }
    }, [isOpen, module]);

    const loadQuiz = async () => {
        setLoading(true);
        try {
            const data = await choirService.getAcademyQuiz(module.id);
            if (data && data.questions && data.questions.length > 0) {
                // Randomize each time it's opened
                const randomized = [...data.questions].sort(() => Math.random() - 0.5);

                // Set limits based on user requests: 10 for Foundations, 20 for Prayer
                let limit = 20; // Default
                if (module.title.toLowerCase().includes('foundations')) {
                    limit = 10;
                }

                setQuiz({
                    ...data,
                    questions: randomized.slice(0, limit)
                });
            } else {
                setQuiz(data);
            }
        } catch (error) {
            console.error("Failed to load quiz", error);
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setScore(0);
        setIsCompleted(false);
        setShowFeedback(false);
    };

    const handleAnswerSelect = (index: number) => {
        if (showFeedback) return;
        setSelectedAnswer(index);
    };

    const handleNextQuestion = () => {
        if (!quiz || !quiz.questions) return;

        const currentQuestion = quiz.questions[currentQuestionIndex];
        const isCorrect = selectedAnswer === currentQuestion.correct_answer_index;

        if (isCorrect) {
            setScore(score + 1);
        }

        setShowFeedback(true);

        // Auto advance after short delay or wait for user? Let's wait for user click to reinforce learning
    };

    const advanceQuestion = () => {
        if (!quiz || !quiz.questions) return;

        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setShowFeedback(false);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        setIsCompleted(true);
        if (quiz && quiz.questions && score + (selectedAnswer === quiz.questions[currentQuestionIndex].correct_answer_index ? 1 : 0) >= Math.ceil(quiz.questions.length * (quiz.passing_score / 100))) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    };

    // Calculate final score including the last question if correct
    const finalScore = isCompleted && quiz && quiz.questions ? score + (selectedAnswer === quiz.questions[currentQuestionIndex]?.correct_answer_index ? 1 : 0) : score; // Wait, logic error in finishQuiz vs state. 
    // Actually, let's fix scoring logic. 
    // Better: update score state BEFORE calling finishQuiz.

    // Rework navigation logic slightly for clarity 
    const submitAnswer = () => {
        if (!quiz || !quiz.questions) return;
        const currentQuestion = quiz.questions[currentQuestionIndex];

        if (selectedAnswer === currentQuestion.correct_answer_index) {
            setScore(s => s + 1); // Functional update for immediate accuracy if needed later, but next render will have it
        }
        setShowFeedback(true);
    }

    const proceed = () => {
        if (!quiz || !quiz.questions) return;
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowFeedback(false);
        } else {
            setIsCompleted(true);
            // Trigger confetti if passed
            const totalQuestions = quiz.questions.length;
            const finalScoreVal = score; // Score was already updated in submitAnswer
            // Wait, passing score logic needs current correctness? No, submitAnswer updated it.
            // But state updates are async. calculate passing based on (score) might be one step behind if called immediately in same render cycle?
            // Actually, proceed is called AFTER feedback is shown, so score is updated.

            const percentage = (score / totalQuestions) * 100;
            if (percentage >= quiz.passing_score) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
    }


    if (!isOpen) return null;

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>No Quiz Available</DialogTitle>
                        <DialogDescription>There is no quiz for this module yet.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / quiz.questions.length) * 100;

    // Results View
    if (isCompleted) {
        const percentage = Math.round((score / quiz.questions.length) * 100);
        const passed = percentage >= quiz.passing_score;

        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center items-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {passed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                        </div>
                        <DialogTitle className="text-2xl font-bold">
                            {passed ? 'Quiz Passed!' : 'Keep Trying'}
                        </DialogTitle>
                        <DialogDescription>
                            You scored {Math.round(percentage)}%
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 text-center space-y-2">
                        <p className="text-slate-600 dark:text-slate-300">
                            {passed
                                ? "Excellent work! You've mastered this module."
                                : "Review the material and try again. You got this!"}
                        </p>
                        <p className="text-sm text-slate-400">
                            Passing Score: {quiz.passing_score}%
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-2">
                        <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700">
                            {passed ? 'Complete Lesson' : 'Close'}
                        </Button>
                        {!passed && (
                            <Button onClick={resetQuiz} variant="outline" className="w-full">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Retake Quiz
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!fixed sm:!absolute !inset-x-0 !bottom-0 !top-[env(safe-area-inset-top,0px)] !w-full sm:max-w-xl !h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:!h-auto overflow-hidden flex flex-col p-1.5 pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 sm:p-6 !transform-none !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] !left-0 sm:!left-[50%] !translate-x-0 sm:!translate-x-[-50%] !rounded-none sm:rounded-3xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full duration-500">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round((currentQuestionIndex / quiz.questions.length) * 100)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    <DialogTitle className="pt-4 text-xl">{currentQuestion.question_text}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 py-4 space-y-3 overflow-y-auto">
                    {currentQuestion.options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswerSelect(idx)}
                            disabled={showFeedback}
                            className={`w-full p-4 rounded-xl text-left border-2 transition-all relative
                                ${showFeedback && idx === currentQuestion.correct_answer_index
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                                    : showFeedback && idx === selectedAnswer && idx !== currentQuestion.correct_answer_index
                                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200'
                                        : selectedAnswer === idx
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-600'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                                }
                            `}
                        >
                            <span className="font-medium">{option}</span>
                            {showFeedback && idx === currentQuestion.correct_answer_index && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute right-4 top-1/2 -translate-y-1/2" />
                            )}
                            {showFeedback && idx === selectedAnswer && idx !== currentQuestion.correct_answer_index && (
                                <XCircle className="w-5 h-5 text-rose-600 absolute right-4 top-1/2 -translate-y-1/2" />
                            )}
                        </button>
                    ))}
                </div>

                <DialogFooter className="pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
                    {!showFeedback ? (
                        <Button
                            onClick={submitAnswer}
                            disabled={selectedAnswer === null}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl"
                        >
                            Check Answer
                        </Button>
                    ) : (
                        <Button
                            onClick={proceed}
                            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-6 rounded-xl animate-in slide-in-from-bottom-2"
                        >
                            {currentQuestionIndex < quiz.questions.length - 1 ? (
                                <>Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
                            ) : (
                                <>See Results <Award className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
