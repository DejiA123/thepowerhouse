import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, GraduationCap } from "lucide-react";
import { AcademyModule, choirService } from "@/services/choirService";
import { AcademyModuleCard } from "./AcademyModuleCard";
import { AcademyLessonViewer } from "./AcademyLessonViewer";
import { AcademyQuizModal } from "./AcademyQuizModal";
import { AddModuleDialog } from "./AddModuleDialog";

interface AcademyDashboardProps {
    locationId: string;
}

export const AcademyDashboard = ({ locationId }: AcademyDashboardProps) => {
    const [modules, setModules] = useState<AcademyModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeModule, setActiveModule] = useState<AcademyModule | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    useEffect(() => {
        loadModules();
    }, [locationId]);

    const loadModules = async () => {
        try {
            setIsLoading(true);
            const data = await choirService.getAcademyModules(locationId);
            setModules(data);
        } catch (error) {
            console.error("Failed to load modules", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartModule = (module: AcademyModule) => {
        setActiveModule(module);
        setIsViewerOpen(true);
    };

    const handleTakeQuiz = (module: AcademyModule) => {
        setActiveModule(module);
        setIsViewerOpen(false);
        setIsQuizOpen(true);
    };

    const newcomerModules = modules.filter(m => m.category === 'newcomer');
    const coreModules = modules.filter(m => m.category === 'core');

    return (
        <div className="space-y-12">
            {/* Header/Actions */}
            <div className="flex items-center justify-between">
                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-black hover:to-slate-900 font-bold rounded-xl shadow-lg border border-slate-700/50 transition-all hover:scale-105 active:scale-95"
                >
                    <PlusCircle className="w-4 h-4 mr-2 text-blue-400" />
                    Create Teaching
                </Button>
                <div />
            </div>

            {/* Newcomers Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">New Members Path</h3>
                        <p className="text-sm text-emerald-600 font-bold uppercase tracking-wider">Start Here</p>
                    </div>
                </div>

                {newcomerModules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newcomerModules.map(module => (
                            <AcademyModuleCard
                                key={module.id}
                                module={module}
                                onStart={handleStartModule}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No newcomer modules yet. Create one to welcome new members!</p>
                    </div>
                )}
            </div>

            {/* Core Training Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-indigo-100 dark:border-indigo-900/30 pb-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Core Training</h3>
                        <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider">Advanced Learning</p>
                    </div>
                </div>

                {coreModules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coreModules.map(module => (
                            <AcademyModuleCard
                                key={module.id}
                                module={module}
                                onStart={handleStartModule}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No core training modules available yet.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {activeModule && (
                <>
                    <AcademyLessonViewer
                        isOpen={isViewerOpen}
                        onClose={() => setIsViewerOpen(false)}
                        module={activeModule}
                        onTakeQuiz={() => handleTakeQuiz(activeModule)}
                    />
                    <AcademyQuizModal
                        isOpen={isQuizOpen}
                        onClose={() => setIsQuizOpen(false)}
                        module={activeModule}
                    />
                </>
            )}

            <AddModuleDialog
                isOpen={isAddOpen}
                onClose={() => {
                    setIsAddOpen(false);
                    loadModules();
                }}
                locationId={locationId}
            />
        </div>
    );
};
