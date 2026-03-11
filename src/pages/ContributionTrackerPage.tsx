
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, Users, CheckCircle2, AlertCircle, Calendar, Lock, Unlock, ShieldCheck, X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { choirService } from "@/services/choirService";

interface Contribution {
    name: string;
    months: (number | null)[];
    notes?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INITIAL_DATA: Record<string, Contribution[]> = {
    "2025": [
        { name: "Min. Nenette", months: [5, 5, 5, 5, 5, null, null, null, null, null, null, null] },
        { name: "YP Sodiq", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "AP Zainab", months: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { name: "Njuare", months: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], notes: "Another €50 was sent" },
        { name: "Min. Mercy", months: [5, 5, 5, 5, 5, 5, 5, 5, null, null, null, null] },
        { name: "Min. Merit", months: [5, 5, 5, 5, 5, 5, 5, 5, 5, null, null, null] },
        { name: "Sister. Mercy", months: [5, 5, 5, 5, 5, null, null, null, null, null, null, null] },
        { name: "Kido", months: [5, 5, 5, 5, 5, 5, 5, null, null, null, null, null] },
        { name: "Min. Kingsley", months: [5, 5, 5, 5, null, null, null, null, null, null, null, null] },
        { name: "Joanne", months: [5, 5, 5, 5, 5, 5, 5, null, null, null, null, null] },
        { name: "Pastor Deji", months: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { name: "AP Mr's Ojo", months: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { name: "Borja", months: [5, 5, 5, 5, 5, 5, null, null, null, null, null, null] },
        { name: "Sister Rekky", months: [5, 5, 5, 5, 5, null, null, null, null, null, null, null] },
        { name: "Tomi", months: [5, 5, 5, null, null, null, null, null, null, null, null, null] },
    ],
    "2026": [
        { name: "Min. Nenette", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "YP Sodiq", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "AP Zainab", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Njuare", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Min. Mercy", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Min. Merit", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Sister. Mercy", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Kido", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Min. Kingsley", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Joanne", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Pastor Deji", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "AP Mr's Ojo", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Borja", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Sister Rekky", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Tomi", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
        { name: "Lola", months: [5, 5, null, null, null, null, null, null, null, null, null, null] },
    ]
};

const ADMIN_PIN = "090312";

const ContributionTrackerPage = () => {
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState("2026");
    const [contributionData, setContributionData] = useState(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [pinInput, setPinInput] = useState("");

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const savedData = await choirService.getContributions("National");
                if (savedData) {
                    setContributionData(prev => {
                        const merged = { ...prev, ...savedData };
                        // If saved 2026 data is empty (no payments), keep the INITIAL_DATA's Jan/Feb restoration
                        const has2026Payments = (savedData["2026"] || []).some(m => m.months.some(v => v !== null));
                        if (!has2026Payments) {
                            merged["2026"] = INITIAL_DATA["2026"];
                        }
                        return merged;
                    });
                }
                setIsDataLoaded(true);
            } catch (error) {
                console.error("Failed to fetch contributions:", error);
                toast.error("Failed to load contribution data. Using offline defaults.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const saveToSupabase = async (newData: Record<string, Contribution[]>) => {
        if (!isDataLoaded) {
            console.warn("Attempted to save contributions before data was loaded. Aborting to prevent data loss.");
            return;
        }
        try {
            await choirService.saveContributions(newData, "National");
        } catch (error) {
            console.error("Failed to save contributions:", error);
            toast.error("Failed to sync changes with server");
        }
    };

    const calculateTotal = (months: (number | null)[]) => {
        return months.reduce((acc, curr) => acc + (curr || 0), 0);
    };

    const currentData = useMemo(() => contributionData[selectedYear] || [], [contributionData, selectedYear]);
    const totalMembers = currentData.length;
    const activeContributors = currentData.filter(m => calculateTotal(m.months) > 0).length;

    const handlePinSubmit = () => {
        if (pinInput === ADMIN_PIN) {
            setIsAdmin(true);
            setIsPinDialogOpen(false);
            setPinInput("");

        } else {
            toast.error("Incorrect PIN");
        }
    };

    const toggleAdmin = () => {
        if (isAdmin) {
            setIsAdmin(false);

        } else {
            setIsPinDialogOpen(true);
        }
    };

    const updateMemberName = (index: number, newName: string) => {
        const newData = { ...contributionData };
        newData[selectedYear][index].name = newName;
        setContributionData(newData);
        saveToSupabase(newData);
    };

    const toggleMonthContribution = (memberIndex: number, monthIndex: number) => {
        if (!isAdmin) return;
        const newData = { ...contributionData };
        const currentVal = newData[selectedYear][memberIndex].months[monthIndex];
        newData[selectedYear][memberIndex].months[monthIndex] = currentVal ? null : 5;
        setContributionData(newData);
        saveToSupabase(newData);
    };

    const addNewMember = () => {
        const newData = { ...contributionData };
        newData[selectedYear] = [
            ...newData[selectedYear],
            { name: "New Member", months: Array(12).fill(null) }
        ];
        setContributionData(newData);
        saveToSupabase(newData);
    };

    const deleteMember = (index: number) => {
        if (!isAdmin) return;
        const newData = { ...contributionData };
        newData[selectedYear] = newData[selectedYear].filter((_, i) => i !== index);
        setContributionData(newData);
        saveToSupabase(newData);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Initializing National Vault</h2>
                <p className="text-slate-500 font-medium">Fetching the latest contributions...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header Section */}
            <div className="relative bg-indigo-900 pt-[calc(2rem+env(safe-area-inset-top))] pb-32 px-6 rounded-b-[3rem] overflow-hidden shadow-2xl transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-800 opacity-95" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <Button
                            variant="ghost"
                            className="text-indigo-200 hover:text-white hover:bg-white/10 -ml-2 transition-all flex items-center gap-2 group"
                            onClick={() => navigate("/groups/choir")}
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-bold uppercase tracking-wider text-xs">Back to Portal</span>
                        </Button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-md rounded-2xl border border-blue-400/30">
                                <ShieldCheck className={cn("w-5 h-5", isAdmin ? "text-emerald-400" : "text-blue-300")} />
                                <span className="text-blue-200 text-xs font-black uppercase tracking-widest">
                                    {isAdmin ? "Admin Mode Active" : "National Vault Tracker"}
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                                National Choir <br />
                                <span className="text-blue-400">Contribution Tracker</span>
                            </h1>
                            <p className="text-indigo-200/70 max-w-xl font-medium">
                                Tracking the €5 monthly contributions for the National Choir Revolut Vault.
                                Support for robes, equipment, and transportation.
                            </p>
                        </div>

                        {/* Year Selector Tabs */}
                        <div className="bg-white/5 backdrop-blur-lg p-1.5 rounded-[2rem] border border-white/10 shadow-xl">
                            <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-full sm:w-[300px]">
                                <TabsList className="grid grid-cols-2 bg-transparent h-12 gap-1 px-0">
                                    <TabsTrigger
                                        value="2025"
                                        className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-indigo-900 text-indigo-100 font-black uppercase tracking-widest text-[10px] transition-all"
                                    >
                                        2025 Ledger
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="2026"
                                        className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-indigo-900 text-indigo-100 font-black uppercase tracking-widest text-[10px] transition-all"
                                    >
                                        2026 Ledger
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="px-4 -mt-10 relative z-20 max-w-7xl mx-auto mb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-slate-900 border-none shadow-xl rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 text-blue-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{totalMembers}</div>
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider pt-1">Total Members</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-xl rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 text-emerald-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{activeContributors}</div>
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider pt-1">Active Contributors ({selectedYear})</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-xl rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 text-indigo-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{selectedYear}</div>
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider pt-1">Current View</div>
                        </CardContent>
                    </Card>

                    {isAdmin && (
                        <Card
                            onClick={addNewMember}
                            className="bg-indigo-600 dark:bg-indigo-700 border-none shadow-xl rounded-3xl overflow-hidden cursor-pointer hover:bg-indigo-500 transition-colors group"
                        >
                            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-white">
                                <Plus className="w-8 h-8 mb-2 group-hover:scale-125 transition-transform" />
                                <div className="text-xs font-black uppercase tracking-widest text-center">Add New Member</div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Main Table Content */}
            <div className="px-4 max-w-7xl mx-auto">
                <Card className="bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Register: {selectedYear}</CardTitle>
                                <CardDescription className="font-medium">Monthly contribution breakdown for the year {selectedYear}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                {selectedYear === "2026" ? "Validated till Feb 2026" : "Final 2025 Ledger"}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto no-scrollbar">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                    <TableHead className="w-[200px] pl-8 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Name</TableHead>
                                    {MONTHS.map(month => (
                                        <TableHead key={month} className="text-center py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">{month}</TableHead>
                                    ))}
                                    <TableHead className="text-right pr-8 py-5 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-[10px]">Total (€)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentData.map((row, idx) => {
                                    const total = calculateTotal(row.months);
                                    return (
                                        <TableRow key={`${row.name}-${idx}`} className={cn(
                                            "group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 border-b border-slate-50 dark:border-slate-800/50",
                                            idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/30 dark:bg-slate-800/10"
                                        )}>
                                            <TableCell className="pl-8 py-6 font-black text-slate-800 dark:text-slate-100 text-sm italic tracking-tight">
                                                {isAdmin ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={row.name}
                                                            onChange={(e) => updateMemberName(idx, e.target.value)}
                                                            className="h-8 bg-transparent border-none p-0 focus-visible:ring-0 font-black italic text-indigo-600 dark:text-indigo-400"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => deleteMember(idx)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    row.name
                                                )}
                                                {row.notes && selectedYear === "2025" && (
                                                    <div className="text-[10px] font-bold text-indigo-500 mt-1 uppercase flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        {row.notes}
                                                    </div>
                                                )}
                                            </TableCell>
                                            {row.months.map((val, mIdx) => (
                                                <TableCell
                                                    key={mIdx}
                                                    className="text-center py-6 cursor-pointer"
                                                    onClick={() => toggleMonthContribution(idx, mIdx)}
                                                >
                                                    {val ? (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black shadow-sm border border-emerald-500/20 transition-transform hover:scale-110">
                                                            {val}
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                            -
                                                        </div>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right pr-8 py-6">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-black text-sm shadow-sm border",
                                                    total >= 60
                                                        ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-200"
                                                        : total > 0
                                                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent"
                                                )}>
                                                    €{total}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Legend/Footer */}
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Payment Verified</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Annual Paid in Full</span>
                    </div>
                </div>

                {/* Admin Toggle */}
                <div className="mt-12 flex justify-center">
                    <button
                        onClick={toggleAdmin}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3 rounded-2xl transition-all active:scale-95 shadow-lg border",
                            isAdmin
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-200 dark:shadow-none"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                    >
                        {isAdmin ? <Unlock className="w-5 h-4" /> : <Lock className="w-5 h-4" />}
                        <span className="text-xs font-black uppercase tracking-widest">
                            {isAdmin ? "Admin: Unlocked" : "Admin Login"}
                        </span>
                    </button>
                </div>
            </div>

            {/* PIN Entry Dialog */}
            <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900 border-none rounded-[2rem] p-8 shadow-2xl">

                    <DialogHeader className="items-center text-center pb-6">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white">Admin Access</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Enter the administrative PIN <br /> to enable editing features.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label htmlFor="pin" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Lock Pin</Label>
                            <Input
                                id="pin"
                                type="password"
                                placeholder="••••••"
                                maxLength={6}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                className="h-14 text-center text-3xl font-black tracking-[1em] bg-slate-50 dark:bg-slate-800 border-none rounded-2xl"
                                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                            />
                        </div>

                        <Button
                            onClick={handlePinSubmit}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                        >
                            Unlock Ledger
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ContributionTrackerPage;
