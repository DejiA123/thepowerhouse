
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Wallet, TrendingUp, Users, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contribution {
    name: string;
    months: (number | null)[];
    notes?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CONTRIBUTION_DATA: Contribution[] = [
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
    { name: "Lola", months: [null, null, null, null, null, null, null, null, null, null, null, null] },
];

const ContributionTrackerPage = () => {
    const navigate = useNavigate();

    const calculateTotal = (months: (number | null)[]) => {
        return months.reduce((acc, curr) => acc + (curr || 0), 0);
    };


    const totalMembers = CONTRIBUTION_DATA.length;
    const activeContributors = CONTRIBUTION_DATA.filter(m => calculateTotal(m.months) > 0).length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header Section */}
            <div className="relative bg-indigo-900 pt-[calc(2rem+env(safe-area-inset-top))] pb-32 px-6 rounded-b-[3rem] overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-800 opacity-95" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <Button
                        variant="ghost"
                        className="text-indigo-200 hover:text-white hover:bg-white/10 mb-8 -ml-2 transition-all flex items-center gap-2 group"
                        onClick={() => navigate("/groups/choir")}
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold uppercase tracking-wider text-xs">Back to Portal</span>
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-md rounded-2xl border border-blue-400/30">
                                <Wallet className="w-5 h-5 text-blue-300" />
                                <span className="text-blue-200 text-xs font-black uppercase tracking-widest">Vault Tracker</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                                National Choir <br />
                                <span className="text-blue-400">Monthly Contribution</span>
                            </h1>
                            <p className="text-indigo-200/70 max-w-xl font-medium">
                                Tracking the €5 monthly contributions for the National Choir Revolut Vault to support robes, equipment, and transportation.
                            </p>
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
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider pt-1">Active Contributors</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Table */}
            <div className="px-4 max-w-7xl mx-auto">
                <Card className="bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Contribution Register</CardTitle>
                                <CardDescription className="font-medium">Monthly breakdown for {new Date().getFullYear()}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Validated till Feb 2026
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
                                {CONTRIBUTION_DATA.map((row, idx) => {
                                    const total = calculateTotal(row.months);
                                    return (
                                        <TableRow key={row.name} className={cn(
                                            "group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 border-b border-slate-50 dark:border-slate-800/50",
                                            idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/30 dark:bg-slate-800/10"
                                        )}>
                                            <TableCell className="pl-8 py-6 font-black text-slate-800 dark:text-slate-100 text-sm italic tracking-tight">
                                                {row.name}
                                                {row.notes && (
                                                    <div className="text-[10px] font-bold text-indigo-500 mt-1 uppercase flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        {row.notes}
                                                    </div>
                                                )}
                                            </TableCell>
                                            {row.months.map((val, mIdx) => (
                                                <TableCell key={mIdx} className="text-center py-6">
                                                    {val ? (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black shadow-sm border border-emerald-500/20 transition-transform group-hover:scale-110">
                                                            {val}
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-xs font-bold">
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
            </div>
        </div>
    );
};

export default ContributionTrackerPage;
