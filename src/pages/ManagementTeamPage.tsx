
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
    Calendar, CheckCircle2, ClipboardList, Clock, CreditCard, FileText, Flag, Users, Edit, Plus, Save, Trash2,
    Link, Settings, DollarSign, PieChart, UserPlus, Briefcase, Mail, Phone, MapPin, ExternalLink, Target, AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from 'sonner';

// --- Interfaces ---

interface Expense {
    id: string;
    item: string;
    category: string;
    amount: number;
    status: 'Paid' | 'Pending' | 'Approved';
}

interface Guest {
    id: string;
    name: string;
    role: string;
    organization?: string;
    rsvp: 'Confirmed' | 'Pending' | 'Declined';
    seat?: string;
}

interface Phase {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: string;
    description: string;
}

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

interface Unit {
    name: string;
    description: string;
    tasks: Task[];
    deadline?: string;
}

interface ToolLink {
    id: string;
    name: string;
    description: string;
    url: string;
    icon: any;
}

// --- Components ---

const BudgetTracker = () => {
    const [expenses, setExpenses] = useState<Expense[]>([
        { id: "1", item: "Convention Centre Deposit", category: "Venue", amount: 5000, status: "Paid" },
        { id: "2", item: "Guest Speaker Flights", category: "Travel", amount: 1200, status: "Approved" },
        { id: "3", item: "Sound Equipment Rental", category: "Media", amount: 800, status: "Pending" },
    ]);
    const [newItem, setNewItem] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newCategory, setNewCategory] = useState("Logistics");

    const totalBudget = 25000;
    const spent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const percentUsed = (spent / totalBudget) * 100;

    const addExpense = () => {
        if (!newItem || !newAmount) return;
        const expense: Expense = {
            id: Date.now().toString(),
            item: newItem,
            amount: parseFloat(newAmount),
            category: newCategory,
            status: "Pending"
        };
        setExpenses([...expenses, expense]);
        setNewItem("");
        setNewAmount("");
        toast.success("Expense added successfully");
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                {/* Summary Cards */}
                <div className="grid sm:grid-cols-3 gap-4">
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-100">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold text-green-600 uppercase">Total Budget</p>
                            <p className="text-2xl font-bold">€{totalBudget.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-100">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold text-orange-600 uppercase">Spend to Date</p>
                            <p className="text-2xl font-bold">€{spent.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold text-blue-600 uppercase">Remaining</p>
                            <p className="text-2xl font-bold">€{(totalBudget - spent).toLocaleString()}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Expense Log</CardTitle>
                        <CardDescription>Recent transactions and approvals</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.item}</TableCell>
                                        <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                                        <TableCell>€{expense.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge className={
                                                expense.status === 'Paid' ? 'bg-green-500 hover:bg-green-600' :
                                                    expense.status === 'Approved' ? 'bg-blue-500 hover:bg-blue-600' :
                                                        'bg-orange-500 hover:bg-orange-600'
                                            }>{expense.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Add Expense</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input placeholder="e.g. Printing Flyers" value={newItem} onChange={e => setNewItem(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (€)</Label>
                            <Input type="number" placeholder="0.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={newCategory} onValueChange={setNewCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Venue">Venue</SelectItem>
                                    <SelectItem value="Travel">Travel</SelectItem>
                                    <SelectItem value="Media">Media</SelectItem>
                                    <SelectItem value="Hospitality">Hospitality</SelectItem>
                                    <SelectItem value="Logistics">Logistics</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={addExpense}>
                            <Plus className="w-4 h-4 mr-2" /> Record Expense
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-none">
                    <CardHeader>
                        <CardTitle className="text-white">Budget Health</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                            {/* Simple circular progress visualization */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className={`text-green-500 transition-all duration-1000`} strokeDasharray={`${(percentUsed / 100) * 377} 377`} />
                            </svg>
                            <span className="absolute text-2xl font-bold">{Math.round(percentUsed)}%</span>
                        </div>
                        <p className="text-sm opacity-80">You are within budget targets for Phase I.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const GuestListManager = () => {
    const [guests, setGuests] = useState<Guest[]>([
        { id: "1", name: "Bishop David Oyedepo", role: "Special Guest", organization: "LFC Worldwide", rsvp: "Confirmed", seat: "VIP-01" },
        { id: "2", name: "Mayor of Dublin", role: "Government", organization: "City Council", rsvp: "Pending" },
    ]);
    const [newGuestName, setNewGuestName] = useState("");
    const [newGuestRole, setNewGuestRole] = useState("Guest");
    const [newOrg, setNewOrg] = useState("");

    // Edit state
    const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
    const [editSeat, setEditSeat] = useState("");
    const [editRsvp, setEditRsvp] = useState("");

    const addGuest = () => {
        if (!newGuestName) return;
        const guest: Guest = {
            id: Date.now().toString(),
            name: newGuestName,
            role: newGuestRole,
            organization: newOrg,
            rsvp: "Pending"
        };
        setGuests([...guests, guest]);
        setNewGuestName("");
        setNewOrg("");
        toast.success("Guest added to list");
    };

    const startEditing = (guest: Guest) => {
        setEditingGuestId(guest.id);
        setEditSeat(guest.seat || "");
        setEditRsvp(guest.rsvp);
    };

    const saveEdit = (id: string) => {
        setGuests(guests.map(g => g.id === id ? { ...g, seat: editSeat, rsvp: editRsvp as any } : g));
        setEditingGuestId(null);
        toast.success("Guest details updated");
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Guest List</CardTitle>
                            <CardDescription>Manage invitations and RSVPs</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="secondary">{guests.filter(g => g.rsvp === 'Confirmed').length} Confirmed</Badge>
                            <Badge variant="outline">{guests.length} Total</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Overflow-x-auto handles horizontal scrolling for small screens */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Name</TableHead>
                                        <TableHead>Role/Org</TableHead>
                                        <TableHead>Seat</TableHead>
                                        <TableHead>RSVP</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {guests.map((guest) => (
                                        <TableRow key={guest.id}>
                                            <TableCell className="font-bold">{guest.name}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">{guest.role}</div>
                                                <div className="text-xs text-slate-500">{guest.organization}</div>
                                            </TableCell>
                                            <TableCell>
                                                {editingGuestId === guest.id ? (
                                                    <Input className="w-20 h-8" value={editSeat} onChange={e => setEditSeat(e.target.value)} />
                                                ) : (
                                                    <span className="font-mono text-xs text-slate-500">{guest.seat || '-'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingGuestId === guest.id ? (
                                                    <Select value={editRsvp} onValueChange={setEditRsvp}>
                                                        <SelectTrigger className="w-32 h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                                                            <SelectItem value="Pending">Pending</SelectItem>
                                                            <SelectItem value="Declined">Declined</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Badge className={
                                                        guest.rsvp === 'Confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none' :
                                                            guest.rsvp === 'Declined' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-none' :
                                                                'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none'
                                                    }>{guest.rsvp}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {editingGuestId === guest.id ? (
                                                    <Button size="sm" variant="ghost" onClick={() => saveEdit(guest.id)} className="text-green-600"><CheckCircle2 className="w-4 h-4" /></Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" onClick={() => startEditing(guest)}><Edit className="w-3 h-3" /></Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Invite Guest</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input placeholder="John Doe" value={newGuestName} onChange={e => setNewGuestName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Organization</Label>
                            <Input placeholder="Organization Name" value={newOrg} onChange={e => setNewOrg(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={newGuestRole} onValueChange={setNewGuestRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bishop">Bishop / Apostle</SelectItem>
                                    <SelectItem value="Pastor">Pastor / Minister</SelectItem>
                                    <SelectItem value="Government">Government / Dignitary</SelectItem>
                                    <SelectItem value="Guest">General Guest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={addGuest}>
                            <UserPlus className="w-4 h-4 mr-2" /> Add to List
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100">
                    <CardHeader>
                        <CardTitle className="text-purple-900 dark:text-purple-100 text-sm">Protocol Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                            Ensure all Bishops are assigned a Personal Assistant from the Pastoral Care Unit. Hotel bookings should be confirmed 2 weeks prior to arrival.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const ModernProjectBrief = () => {
    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-50 pointer-events-none" />
                <div className="relative z-10 max-w-3xl">
                    <Badge className="bg-amber-400 text-amber-900 border-none mb-6">Confidential - Management Only</Badge>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
                        Bishopric Consecration & <br />Outpouring Convention
                    </h2>
                    <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                        A definitive guide to the planning, execution, and spiritual preparation for the upcoming consecration ceremony and convention.
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column: Core Pillars */}
                <div className="md:col-span-2 space-y-8">
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Target className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Strategic Objective</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                            To facilitate a seamless, spiritually charged, and excellently organized event that honors the consecration of the Bishop-Elect and hosts the Outpouring Convention, ensuring maximum impact and comfort for all attendees and dignitaries.
                        </p>
                    </section>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Card className="bg-slate-50 dark:bg-slate-800/50 border-none">
                            <CardContent className="p-6">
                                <h4 className="font-bold flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-purple-600" /> Unit Formation</h4>
                                <p className="text-sm text-slate-500">Pastors will nominate members based on skills and spiritual maturity. Units integrated to ensure blended collaboration.</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 dark:bg-slate-800/50 border-none">
                            <CardContent className="p-6">
                                <h4 className="font-bold flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-purple-600" /> Legacy Integration</h4>
                                <p className="text-sm text-slate-500">Leveraging existing structures: National Organising Committee, Choir, and Pastoral Teams.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <section>
                        <h3 className="text-xl font-bold mb-4 border-l-4 border-purple-600 pl-4">Key Responsibilities</h3>
                        <div className="space-y-4">
                            {[
                                { title: "Spiritual Preparedness", desc: "Intercessory Unit to maintain spiritual atmosphere throughout planning." },
                                { title: "Excellence in Hospitality", desc: "Usher & Protocol / Flights & Accomms to ensure world-class treatment of guests." },
                                { title: "Operational Efficiency", desc: "NOC & Admin to handle budgets, deadlines, and compliance." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">{i + 1}</div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.title}</h4>
                                        <p className="text-slate-500 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Key Contacts & Info */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 text-white border-none">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Project Lead</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold">National Organising Committee</p>
                                    <p className="text-sm text-slate-400">Main Coordinator</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Mail className="w-4 h-4" /> noc@thepowerhouse.ie
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Phone className="w-4 h-4" /> +353 89 999 9999
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Resources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                                <FileText className="w-4 h-4 text-red-500" />
                                <div className="text-left">
                                    <div className="font-bold text-xs">Full PDF Brief</div>
                                    <div className="text-[10px] text-slate-500">2.4 MB • Updated Today</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <div className="text-left">
                                    <div className="font-bold text-xs">Venue Layouts</div>
                                    <div className="text-[10px] text-slate-500">High Res Maps</div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};


// --- Main Page Component ---

const ManagementTeamPage = () => {
    // --- State Management ---
    const [currentTime] = useState(new Date());
    const [isEditMode, setIsEditMode] = useState(false);

    // Progress
    const [overallProgress, setOverallProgress] = useState(33);
    const [isManualProgress, setIsManualProgress] = useState(false);
    const [manualProgress, setManualProgress] = useState(33);

    // Tools
    const [tools, setTools] = useState<ToolLink[]>([
        { id: "1", name: "Budget Tracker", description: "Monitor expenses", url: "#", icon: CreditCard },
        { id: "2", name: "Guest List", description: "Manage VIP RSVPs", url: "#", icon: Users },
        { id: "3", name: "Venue Plan", description: "Seating Layouts", url: "https://example.com/map", icon: MapPin },
    ]);
    const [newToolName, setNewToolName] = useState("");
    const [newToolUrl, setNewToolUrl] = useState("");

    // Units
    const [immediateUnits, setImmediateUnits] = useState<Unit[]>([
        {
            name: "Intercessory Unit",
            description: "Spiritual foundation and covering",
            tasks: [
                { id: "iu1", text: "Daily midnight prayers (12am - 1am)", completed: true },
                { id: "iu2", text: "Weekly Friday vigils", completed: false },
                { id: "iu3", text: "Prayer walk at convention venue", completed: false },
            ],
            deadline: "Ongoing"
        },
        {
            name: "National Organising Committee",
            description: "Overall coordination and strategy",
            tasks: [
                { id: "noc1", text: "Finalize budget approval", completed: true },
                { id: "noc2", text: "Secure convention venue deposit", completed: true },
                { id: "noc3", text: "Draft letter to guest ministers", completed: false },
            ],
            deadline: "Jan 30"
        }
    ]);

    const [subsequentUnits, setSubsequentUnits] = useState<Unit[]>([
        {
            name: "Ushering & Protocol",
            description: "Guest management and order",
            tasks: [
                { id: "up1", text: "Uniform inspection", completed: false },
                { id: "up2", text: "Protocol training for VIP handling", completed: false },
            ]
        },
        {
            name: "Media & Technical",
            description: "Audio, video and streaming",
            tasks: [
                { id: "mt1", text: "Equipment audit", completed: true },
                { id: "mt2", text: "Hire additional sound engineer", completed: false },
            ]
        }
    ]);

    // Phases
    const phases: Phase[] = [
        { id: "p1", name: "Phase I", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 2, 31), status: "In Progress", description: "Planning & Formation" },
        { id: "p2", name: "Phase II", startDate: new Date(2026, 3, 1), endDate: new Date(2026, 4, 31), status: "Upcoming", description: "Heavy Lifting & Execution" },
        { id: "p3", name: "Phase III", startDate: new Date(2026, 5, 1), endDate: new Date(2026, 6, 31), status: "Upcoming", description: "Final Preparations" },
    ];

    // Derived State
    const currentPhase = phases.find(p => currentTime >= p.startDate && currentTime <= p.endDate) || phases[0];

    const activeUnitCount = immediateUnits.length + subsequentUnits.length; // Simplified for now

    // --- Effects ---
    useEffect(() => {
        if (!isManualProgress) {
            // Calculate progress based on tasks
            const allTasks = [...immediateUnits.flatMap(u => u.tasks), ...subsequentUnits.flatMap(u => u.tasks)];
            const completedCount = allTasks.filter(t => t.completed).length;
            const newProgress = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;
            setOverallProgress(newProgress);
        } else {
            setOverallProgress(manualProgress);
        }
    }, [immediateUnits, subsequentUnits, isManualProgress, manualProgress]);

    // --- Handlers ---
    const toggleTask = (unitName: string, taskId: string, isImmediate: boolean) => {
        const updateUnits = (units: Unit[]) => units.map(unit => {
            if (unit.name === unitName) {
                return {
                    ...unit,
                    tasks: unit.tasks.map(task =>
                        task.id === taskId ? { ...task, completed: !task.completed } : task
                    )
                };
            }
            return unit;
        });

        if (isImmediate) {
            setImmediateUnits(updateUnits(immediateUnits));
        } else {
            setSubsequentUnits(updateUnits(subsequentUnits));
        }
    };

    const handleAddTool = () => {
        if (!newToolName) return;
        const newTool: ToolLink = {
            id: Date.now().toString(),
            name: newToolName,
            description: "Custom Link",
            url: newToolUrl || "#",
            icon: Link
        };
        setTools([...tools, newTool]);
        setNewToolName("");
        setNewToolUrl("");
        toast.success("Tool added");
    };

    const handleDeleteTool = (id: string) => {
        setTools(tools.filter(t => t.id !== id));
        toast.success("Tool removed");
    };


    return (
        <div className="container mx-auto pb-24 md:pb-12 px-4 pt-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <Badge variant="outline" className="mb-2 border-amber-500 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {currentPhase.name} Active
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Bishopric Consecration & <span className="text-purple-600 block md:inline">Outpouring Convention</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                        Project Management Dashboard for {currentTime.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <p className="hidden md:block text-xs uppercase tracking-widest text-slate-400 font-bold">Days Remaining</p>
                    <div className="flex items-center gap-4">
                        <p className="hidden md:block text-xl font-bold font-mono text-purple-600">
                            {Math.ceil((new Date(2026, 7, 14).getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))} Days
                        </p>
                        <Button
                            variant={isEditMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsEditMode(!isEditMode)}
                            className="gap-2"
                        >
                            {isEditMode ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                            {isEditMode ? "Save Changes" : "Edit Dashboard"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8 h-auto p-1">
                    <TabsTrigger value="dashboard" className="py-2">Dashboard</TabsTrigger>
                    <TabsTrigger value="brief" className="py-2">Brief</TabsTrigger>
                    <TabsTrigger value="budget" className="py-2">Budget</TabsTrigger>
                    <TabsTrigger value="guests" className="py-2">Guest List</TabsTrigger>
                    <TabsTrigger value="units" className="py-2">Units</TabsTrigger>
                </TabsList>

                {/* DASHBOARD TAB - RESTORED HYBRID VERSION */}
                <TabsContent value="dashboard" className="space-y-6">
                    {/* Status Overview */}
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none shadow-xl col-span-1 md:col-span-2">
                            <CardHeader className="pb-2 flex flex-row justify-between items-center">
                                <CardTitle className="text-lg font-medium opacity-90">Overall Progress</CardTitle>
                                {isEditMode && (
                                    <div className="flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full">
                                        <Checkbox
                                            id="manual-mode"
                                            checked={isManualProgress}
                                            onCheckedChange={(c) => setIsManualProgress(!!c)}
                                            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-600"
                                        />
                                        <label htmlFor="manual-mode" className="text-xs font-medium cursor-pointer select-none">Manual Override</label>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-2 mb-4">
                                    {isEditMode && isManualProgress ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={manualProgress}
                                                onChange={(e) => setManualProgress(Number(e.target.value))}
                                                className="w-24 h-12 text-3xl font-bold bg-white/20 border-none text-white focus-visible:ring-1 focus-visible:ring-white"
                                            />
                                            <span className="text-3xl font-bold">%</span>
                                        </div>
                                    ) : (
                                        <div className="text-4xl font-bold">{overallProgress}%</div>
                                    )}
                                </div>
                                <Progress value={overallProgress} className="h-2 bg-white/20" indicatorClassName="bg-white" />
                                <p className="text-xs mt-2 opacity-75">
                                    {isManualProgress ? "Manually set by admin" : "Auto-calculated from task completion"}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Active Units</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{activeUnitCount}</div>
                                <p className="text-xs text-slate-500">Mobilized teams</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Day Count</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">214</div>
                                <p className="text-xs text-slate-500">Until Convention</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Management Tools Panel */}
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-lg">Management Tools</CardTitle>
                                <CardDescription>Quick access links</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {tools.map(tool => (
                                    <div key={tool.id} className="group flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                        <a href={tool.url} className="flex items-center gap-3 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                                                <tool.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{tool.name}</div>
                                                <div className="text-[10px] text-slate-400">{tool.description}</div>
                                            </div>
                                        </a>
                                        {isEditMode && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteTool(tool.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {isEditMode && (
                                    <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                                        <Input placeholder="Tool Name" className="h-8 text-xs" value={newToolName} onChange={e => setNewToolName(e.target.value)} />
                                        <Input placeholder="https://..." className="h-8 text-xs" value={newToolUrl} onChange={e => setNewToolUrl(e.target.value)} />
                                        <Button size="sm" variant="secondary" className="w-full h-8 text-xs" onClick={handleAddTool}>Add Tool</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Master Timeline</CardTitle>
                                <CardDescription>Real-time phase tracking</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-8 py-4">
                                    {phases.map((phase) => {
                                        const isActive = currentTime >= phase.startDate && currentTime <= phase.endDate;
                                        const isPast = currentTime > phase.endDate;

                                        return (
                                            <div key={phase.id} className="ml-6 relative">
                                                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${isActive ? 'bg-purple-600 border-purple-600 animate-pulse' :
                                                        isPast ? 'bg-slate-400 border-slate-400' :
                                                            'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600'
                                                    }`} />
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className={`text-lg font-bold ${isActive ? 'text-purple-600' : 'text-slate-900 dark:text-white'}`}>
                                                            {phase.name}
                                                        </h3>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{phase.description}</p>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                        {phase.startDate.toLocaleDateString(undefined, { month: 'short' })} - {phase.endDate.toLocaleDateString(undefined, { month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* BRIEF TAB */}
                <TabsContent value="brief">
                    <ModernProjectBrief />
                </TabsContent>

                {/* BUDGET TAB */}
                <TabsContent value="budget">
                    <BudgetTracker />
                </TabsContent>

                {/* GUESTS TAB */}
                <TabsContent value="guests">
                    <GuestListManager />
                </TabsContent>

                {/* UNITS TAB - RESTORED & IMPROVED */}
                <TabsContent value="units" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-600">
                                <AlertCircle className="w-5 h-5" /> Immediate Action Required
                            </h3>
                            <div className="space-y-4">
                                {immediateUnits.map((unit, idx) => (
                                    <Card key={idx} className="border-l-4 border-l-orange-500">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between">
                                                <CardTitle className="text-base">{unit.name}</CardTitle>
                                                {unit.deadline && <Badge variant="outline" className="text-xs">{unit.deadline}</Badge>}
                                            </div>
                                            <CardDescription>{unit.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {unit.tasks.map(task => (
                                                    <div key={task.id} className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={task.id}
                                                            checked={task.completed}
                                                            onCheckedChange={() => toggleTask(unit.name, task.id, true)}
                                                        />
                                                        <label
                                                            htmlFor={task.id}
                                                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.completed ? 'line-through text-slate-400' : ''}`}
                                                        >
                                                            {task.text}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-blue-600">
                                <CheckCircle2 className="w-5 h-5" /> Subsequent Units
                            </h3>
                            <div className="space-y-4">
                                {subsequentUnits.map((unit, idx) => (
                                    <Card key={idx} className="border-l-4 border-l-blue-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">{unit.name}</CardTitle>
                                            <CardDescription>{unit.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {unit.tasks.map(task => (
                                                    <div key={task.id} className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={task.id}
                                                            checked={task.completed}
                                                            onCheckedChange={() => toggleTask(unit.name, task.id, false)}
                                                        />
                                                        <label
                                                            htmlFor={task.id}
                                                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.completed ? 'line-through text-slate-400' : ''}`}
                                                        >
                                                            {task.text}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
};

export default ManagementTeamPage;
