import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, FileText, CheckCircle2, Lock } from "lucide-react";
import { AcademyModule } from "@/services/choirService";

interface AcademyModuleCardProps {
    module: AcademyModule;
    onStart: (module: AcademyModule) => void;
    isLocked?: boolean;
    isCompleted?: boolean;
}

export const AcademyModuleCard = ({ module, onStart, isLocked = false, isCompleted = false }: AcademyModuleCardProps) => {
    return (
        <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800/50">
            {/* Background Gradient Accent */}
            <div className={`absolute top-0 w-full h-1 z-10 ${module.category === 'newcomer' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    module.category === 'core' ? 'bg-gradient-to-r from-indigo-400 to-purple-500' :
                        'bg-gradient-to-r from-amber-400 to-orange-500'
                }`} />

            <CardHeader className="pt-6 relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className={`${module.category === 'newcomer' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                            module.category === 'core' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                        {module.category === 'newcomer' ? 'Start Here' :
                            module.category === 'core' ? 'Core Training' : 'Leadership'}
                    </Badge>
                    {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {isLocked && <Lock className="w-5 h-5 text-slate-400" />}
                </div>
                <CardTitle className="text-xl font-bold line-clamp-2 leading-tight">
                    {module.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2 text-sm">
                    {module.description}
                </CardDescription>
            </CardHeader>

            <CardContent className="pb-4">
                {/* Could add progress bar or reading time estimate here */}
            </CardContent>

            <CardFooter className="pt-0 pb-6">
                <Button
                    onClick={() => onStart(module)}
                    disabled={isLocked}
                    className={`w-full font-bold shadow-md transition-all ${isLocked ? 'bg-slate-200 text-slate-400 dark:bg-slate-800' :
                            module.category === 'newcomer' ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5' :
                                'bg-indigo-600 hover:bg-indigo-700 text-white hover:-translate-y-0.5'
                        }`}
                >
                    {isCompleted ? 'Review Lesson' : 'Start Lesson'}
                    {module.video_url ? <PlayCircle className="w-4 h-4 ml-2" /> : <FileText className="w-4 h-4 ml-2" />}
                </Button>
            </CardFooter>
        </Card>
    );
};
