
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, MapPin, ChevronRight, Users, Mic2, Star, ArrowLeft, Wallet } from "lucide-react";

const ChoirPortalPage = () => {
    const navigate = useNavigate();

    const branches = [
        {
            id: "galway",
            name: "Galway Choir",
            location: "Galway",
            color: "from-blue-600 to-indigo-700",
            icon: <Star className="w-6 h-6" />
        },
        {
            id: "kildare",
            name: "Kildare Choir",
            location: "Kildare",
            color: "from-amber-500 to-orange-600",
            icon: <Music className="w-6 h-6" />
        },
        {
            id: "athlone",
            name: "Athlone Choir",
            location: "Athlone",
            color: "from-emerald-500 to-teal-600",
            icon: <Mic2 className="w-6 h-6" />
        },
        {
            id: "dublin",
            name: "Dublin Choir",
            location: "Dublin",
            color: "from-rose-500 to-pink-600",
            icon: <Users className="w-6 h-6" />
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-32">
            {/* Header section with safe area padding */}
            <div className="relative bg-primary pt-[calc(1.5rem+env(safe-area-inset-top))] pb-20 px-6 rounded-b-[2.5rem] shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 opacity-95" />
                <div className="absolute inset-0 bg-[url('/patterns/circuit.svg')] opacity-10" />

                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="self-start mb-6 -ml-2 text-blue-200 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
                        onClick={() => navigate("/groups")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Back to Groups</span>
                    </Button>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center p-2 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20">
                            <Music className="w-6 h-6 text-blue-100" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Choir Portal</h1>

                        <div className="flex flex-col items-center gap-6 mb-4">
                            <button
                                onClick={() => navigate("/groups/choir/contributions")}
                                className="group relative flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl transition-all hover:scale-[1.05] active:scale-[0.98]"
                            >
                                <div className="p-2 bg-blue-500 rounded-xl shadow-lg group-hover:bg-blue-400 transition-colors">
                                    <Wallet className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="text-blue-200 text-[10px] font-black uppercase tracking-widest leading-none mb-1">National Vault</div>
                                    <div className="text-white font-black text-sm tracking-tight">National Choir Monthly Contribution</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />

                                {/* Pulse Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>

                        <p className="text-blue-100/80 text-sm font-medium">Select your branch to access setlists and resources</p>
                    </div>
                </div>
            </div>

            <div className="px-4 -mt-10 relative z-20 max-w-4xl mx-auto space-y-4 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {branches.map((branch) => (
                        <Card
                            key={branch.id}
                            className="group relative overflow-hidden border-0 shadow-sm cursor-pointer bg-white dark:bg-gray-800 rounded-3xl"
                            onClick={() => navigate(`/groups/choir/${branch.id}`)}
                        >
                            <CardContent className="p-0">
                                <div className={`h-2 w-full bg-gradient-to-r ${branch.color}`} />
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${branch.color} text-white shadow-lg shadow-gray-200 dark:shadow-black/20`}>
                                            {branch.icon}
                                        </div>
                                        <div className="flex items-center text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {branch.location}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                                        {branch.name}
                                    </h3>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                        <span className="text-xs font-bold text-primary dark:text-blue-400 flex items-center">
                                            Access Portal
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Background Decorative element */}
                                <div className={`absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br ${branch.color} opacity-[0.03] rounded-full`} />
                            </CardContent>
                        </Card>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ChoirPortalPage;
