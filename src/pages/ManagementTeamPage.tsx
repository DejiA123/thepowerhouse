
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
    Calendar, CheckCircle2, ClipboardList, Clock, CreditCard, FileText, Flag, Users, Edit, Plus, Save, Trash2,
    Link, Settings, DollarSign, PieChart, UserPlus, Briefcase, Mail, Phone, MapPin, ExternalLink, Target, AlertCircle, LayoutDashboard, X, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { managementService, type Expense, type Guest, type Task, type ProjectTool, type ManagementSettings } from '@/services/managementService';
import { generateProjectBriefPDF } from '@/utils/pdfGenerator';
import { supabase } from "@/integrations/supabase/client";

// Re-map interfaces to match DB schema and unify field names for UI
interface Phase {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: string;
    description: string;
}

// --- Interfaces ---

interface Unit {
    name: string;
    description: string;
    tasks: Task[];
    deadline?: string;
}

const ICON_MAP: Record<string, any> = {
    CreditCard,
    Users,
    MapPin,
    Link,
    Briefcase,
    FileText,
};

// --- Components ---

const BudgetTracker = ({
    isEditMode,
    totalBudget,
    setTotalBudget,
    expenses,
    onAddExpense,
    onDeleteExpense,
    onUpdateExpense
}: {
    isEditMode: boolean;
    totalBudget: number;
    setTotalBudget: (v: number) => void;
    expenses: Expense[];
    onAddExpense: (exp: any) => void;
    onDeleteExpense: (id: string) => void;
    onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
}) => {
    const [newItem, setNewItem] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newCategory, setNewCategory] = useState("Logistics");
    const [newStatus, setNewStatus] = useState("Pending");

    // Inline editing states for expenses
    const [editingExpId, setEditingExpId] = useState<string | null>(null);
    const [editExpName, setEditExpName] = useState("");
    const [editExpAmount, setEditExpAmount] = useState("");
    const [editExpCategory, setEditExpCategory] = useState("");
    const [editExpStatus, setEditExpStatus] = useState("");

    const [uploading, setUploading] = useState(false);

    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
    const [showErrors, setShowErrors] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const spent = (expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
    const percentUsed = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

    const addExpense = () => {
        if (!newItem || !newAmount) {
            setShowErrors(true);
            toast.error("Please fill in all required fields");
            return;
        }
        setShowErrors(false);
        onAddExpense({
            item_name: newItem,
            amount: parseFloat(newAmount),
            category: newCategory,
            status: newStatus,
            receipt_url: receiptUrl
        });
        setNewItem("");
        setNewAmount("");
        setReceiptUrl(null);
    };

    const startEditing = (exp: Expense) => {
        setEditingExpId(exp.id);
        setEditExpName(exp.item_name);
        setEditExpAmount(exp.amount.toString());
        setEditExpCategory(exp.category);
        setEditExpStatus(exp.status);
    };

    const saveExpEdit = (id: string) => {
        onUpdateExpense(id, {
            item_name: editExpName,
            amount: parseFloat(editExpAmount),
            category: editExpCategory,
            status: editExpStatus
        });
        setEditingExpId(null);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Get upload URL
            const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
                body: {
                    fileName: `${Date.now()}-${file.name}`,
                    fileType: file.type
                }
            });

            if (error) throw error;

            // Upload to R2
            const response = await fetch(data.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type
                },
                body: file
            });

            if (!response.ok) throw new Error('Failed to upload file');

            setReceiptUrl(data.publicUrl);
        } catch (error) {
            console.error('Error uploading receipt:', error);
            toast.error("Failed to upload receipt");
        } finally {
            setUploading(false);
        }
    };
    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                {/* Summary Cards */}
                <div className="grid sm:grid-cols-3 gap-4">
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-100">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold text-green-600 uppercase">Total Budget</p>
                            {isEditMode ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-bold">€</span>
                                    <Input
                                        type="number"
                                        value={totalBudget}
                                        onChange={(e) => setTotalBudget(Number(e.target.value))}
                                        className="h-8 py-0 font-bold text-xl border-none bg-transparent focus-visible:ring-0 px-0"
                                    />
                                </div>
                            ) : (
                                <p className="text-2xl font-bold">€{totalBudget.toLocaleString()}</p>
                            )}
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
                    <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px] md:w-[180px] text-xs px-4">Item</TableHead>
                                        <TableHead className="text-xs w-[100px] md:w-[120px] px-4">Category</TableHead>
                                        <TableHead className="text-xs w-[80px] md:w-[100px] px-4">Amount</TableHead>
                                        <TableHead className="text-xs w-[80px] md:w-[100px] px-4">Receipt</TableHead>
                                        <TableHead className="text-right text-xs w-[120px] md:w-[140px] px-4">{isEditMode ? 'Status / Actions' : 'Status'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(expenses || []).map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium py-4 px-4">
                                                {editingExpId === expense.id ? (
                                                    <Input value={editExpName} onChange={e => setEditExpName(e.target.value)} className="w-full h-8 px-2 text-xs" />
                                                ) : (
                                                    <div className="truncate max-w-[120px] md:max-w-[170px]" title={expense.item_name}>{expense.item_name}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                {editingExpId === expense.id ? (
                                                    <Select value={editExpCategory} onValueChange={setEditExpCategory}>
                                                        <SelectTrigger className="w-full h-8 px-2 text-[10px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Venue">Venue</SelectItem>
                                                            <SelectItem value="Travel">Travel</SelectItem>
                                                            <SelectItem value="Media">Media</SelectItem>
                                                            <SelectItem value="Hospitality">Hospitality</SelectItem>
                                                            <SelectItem value="Logistics">Logistics</SelectItem>
                                                            <SelectItem value="Other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{expense.category}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                {editingExpId === expense.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs">€</span>
                                                        <Input type="number" value={editExpAmount} onChange={e => setEditExpAmount(e.target.value)} className="w-full h-8 px-2 text-xs" />
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-sm">€{expense.amount.toLocaleString()}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                {expense.receipt_url ? (
                                                    <Button
                                                        variant="ghost"
                                                        className="flex items-center text-blue-500 hover:text-blue-700 hover:underline p-0 h-auto font-normal"
                                                        onClick={() => setViewingReceipt(expense.receipt_url || "")}
                                                    >
                                                        <FileText className="w-4 h-4 mr-1" />
                                                        <span className="text-xs">View</span>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                <div className="flex items-center justify-end gap-2 text-xs">
                                                    {editingExpId === expense.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <Select value={editExpStatus} onValueChange={setEditExpStatus}>
                                                                <SelectTrigger className="w-[80px] md:w-[100px] h-8 text-[10px] px-2">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                                    <SelectItem value="Approved">Approved</SelectItem>
                                                                    <SelectItem value="Paid">Paid</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => saveExpEdit(expense.id)}>
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50" onClick={() => setEditingExpId(null)}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Badge className={
                                                                expense.status === 'Paid' ? 'bg-green-500 hover:bg-green-600 border-none px-2 py-0 text-[10px]' :
                                                                    expense.status === 'Approved' ? 'bg-blue-500 hover:bg-blue-600 border-none px-2 py-0 text-[10px]' :
                                                                        'bg-orange-500 hover:bg-orange-600 border-none px-2 py-0 text-[10px]'
                                                            }>{expense.status}</Badge>

                                                            {isEditMode && (
                                                                <div className="flex items-center">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => startEditing(expense)}>
                                                                        <Edit className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => onDeleteExpense(expense.id)}>
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
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
                        <CardTitle>Add Expense</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className={showErrors && !newItem ? "text-red-500" : ""}>Item Name</Label>
                            <Input
                                placeholder="e.g. Printing Flyers"
                                value={newItem}
                                onChange={e => {
                                    setNewItem(e.target.value);
                                    if (e.target.value) setShowErrors(false);
                                }}
                                className={showErrors && !newItem ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className={showErrors && !newAmount ? "text-red-500" : ""}>Amount (€)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={newAmount}
                                onChange={e => {
                                    setNewAmount(e.target.value);
                                    if (e.target.value) setShowErrors(false);
                                }}
                                className={showErrors && !newAmount ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
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
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative w-full">
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    variant="outline"
                                    className={`w-full border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 ${receiptUrl ? 'border-green-500 text-green-600 bg-green-50' : ''}`}
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploading ? (
                                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                                    ) : receiptUrl ? (
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                    ) : (
                                        <FileText className="w-4 h-4 mr-2" />
                                    )}
                                    {uploading ? "Uploading..." : receiptUrl ? "Receipt Attached" : "Attach Receipt"}
                                </Button>
                            </div>
                        </div>

                        {receiptUrl && (
                            <div className="relative group">
                                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="block p-2 bg-slate-50 border rounded-lg text-sm text-blue-600 hover:underline truncate">
                                    View Attached Receipt
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-red-500"
                                    onClick={() => setReceiptUrl(null)}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                        <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={addExpense}>
                            <Plus className="w-4 h-4 mr-2" /> Record Expense
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="bg-slate-900 text-white border-none">
                    <CardHeader>
                        <CardTitle className="text-white">Budget Health</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                            {/* Simple circular progress visualization */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className={`text-green-500 transition-all duration-1000`} strokeDasharray={`${Math.round((percentUsed / 100) * 377)} 377`} />
                            </svg>
                            <span className="absolute text-2xl font-bold text-white">{Math.round(percentUsed)}%</span>
                        </div>
                        <p className="text-sm opacity-80">You are within budget targets for Phase I.</p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
                <DialogContent className="max-w-full w-full h-screen flex flex-col p-0 gap-0 rounded-none m-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>View Receipt</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center">
                        {viewingReceipt && (viewingReceipt.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={viewingReceipt}
                                className="w-full h-full border-none rounded-md"
                                title="Receipt PDF"
                            />
                        ) : (
                            <img
                                src={viewingReceipt}
                                alt="Receipt"
                                className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                            />
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const GuestListManager = ({
    guests,
    onAddGuest,
    onUpdateGuest,
    onDeleteGuest,
    isEditMode
}: {
    guests: Guest[];
    onAddGuest: (g: any) => void;
    onUpdateGuest: (id: string, g: any) => void;
    onDeleteGuest: (id: string) => void;
    isEditMode: boolean;
}) => {
    const [newGuestName, setNewGuestName] = useState("");
    const [newGuestRole, setNewGuestRole] = useState("Guest");
    const [newOrg, setNewOrg] = useState("");
    const [newGuestPA, setNewGuestPA] = useState("");

    // Edit state
    const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editOrg, setEditOrg] = useState("");
    const [editRole, setEditRole] = useState("");
    const [editPA, setEditPA] = useState("");
    const [editSeat, setEditSeat] = useState("");
    const [editRsvp, setEditRsvp] = useState("");

    const addGuest = () => {
        if (!newGuestName) return;
        onAddGuest({
            name: newGuestName,
            role: newGuestRole,
            organization: newOrg,
            rsvp_status: "Pending",
            personal_assistant: newGuestRole === 'Bishop' ? newGuestPA : undefined
        });
        setNewGuestName("");
        setNewOrg("");
        setNewGuestPA("");
    };

    const startEditing = (guest: Guest) => {
        setEditingGuestId(guest.id);
        setEditName(guest.name);
        setEditOrg(guest.organization || "");
        setEditRole(guest.role || "");
        setEditPA(guest.personal_assistant || "");
        setEditSeat(guest.assigned_seat || "");
        setEditRsvp(guest.rsvp_status);
    };

    const saveEdit = (id: string) => {
        onUpdateGuest(id, {
            name: editName,
            organization: editOrg,
            role: editRole,
            personal_assistant: editRole === 'Bishop' ? editPA : null,
            assigned_seat: editSeat,
            rsvp_status: editRsvp as any
        });
        setEditingGuestId(null);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-6">
                        <div className="flex-1">
                            <CardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-1">Guest List</CardTitle>
                            <CardDescription className="font-medium text-slate-500">Manage invitations and RSVPs</CardDescription>
                        </div>

                        <div className="w-full sm:w-auto flex flex-col gap-3 min-w-[240px]">
                            <div className="flex items-center justify-between gap-6 px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                            {(guests || []).filter(g => g.rsvp_status === 'Confirmed').length}
                                        </div>
                                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Confirmed</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                            {(guests || []).length}
                                        </div>
                                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 px-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-blue-600">
                                    <span>RSVP Progress</span>
                                    <span>{Math.round(((guests || []).filter(g => g.rsvp_status === 'Confirmed').length / Math.max((guests || []).length, 1)) * 100)}%</span>
                                </div>
                                <Progress
                                    value={((guests || []).filter(g => g.rsvp_status === 'Confirmed').length / Math.max((guests || []).length, 1)) * 100}
                                    className="h-1.5 bg-slate-100 dark:bg-slate-800 [&>div]:bg-blue-600 [&>div]:transition-none"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[140px] md:w-[180px] text-xs px-4">Name</TableHead>
                                        <TableHead className="text-xs px-4 hidden sm:table-cell">Role/Org</TableHead>
                                        <TableHead className="text-xs w-[60px] md:w-[80px] px-4">Seat</TableHead>
                                        <TableHead className="text-xs w-[100px] md:w-[120px] px-4">RSVP</TableHead>
                                        {isEditMode && <TableHead className="text-right text-xs w-[80px] md:w-[100px] px-4">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(guests || []).map((guest) => (
                                        <TableRow key={guest.id}>
                                            <TableCell className="font-bold py-4 px-4">
                                                {editingGuestId === guest.id ? (
                                                    <Input
                                                        className="w-full h-8 px-2 text-xs mb-1"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        placeholder="Name"
                                                    />
                                                ) : (
                                                    <div className="truncate max-w-[100px] md:max-w-[170px]" title={guest.name}>
                                                        {guest.name}
                                                    </div>
                                                )}

                                                {/* Mobile-only Role and Org display/edit */}
                                                <div className="sm:hidden mt-1 space-y-1">
                                                    {editingGuestId === guest.id ? (
                                                        <>
                                                            <Select value={editRole} onValueChange={setEditRole}>
                                                                <SelectTrigger className="w-full h-7 px-2 text-[10px]">
                                                                    <SelectValue placeholder="Category" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Bishop">Bishop / Apostle</SelectItem>
                                                                    <SelectItem value="Pastor">Pastor / Minister</SelectItem>
                                                                    <SelectItem value="Government">Government / Dignitary</SelectItem>
                                                                    <SelectItem value="Guest">General Guest</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                className="w-full h-7 px-2 text-[10px]"
                                                                value={editOrg}
                                                                onChange={e => setEditOrg(e.target.value)}
                                                                placeholder="Org"
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">{guest.role}</div>
                                                            <div className="text-[10px] text-slate-500 truncate max-w-[100px]">{guest.organization}</div>
                                                            {guest.role === 'Bishop' && guest.personal_assistant && (
                                                                <div className="text-[10px] text-blue-600 italic">PA: {guest.personal_assistant}</div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-4 hidden sm:table-cell">
                                                {editingGuestId === guest.id ? (
                                                    <div className="space-y-1">
                                                        <Select value={editRole} onValueChange={setEditRole}>
                                                            <SelectTrigger className="w-full h-8 px-2 text-[10px]">
                                                                <SelectValue placeholder="Category" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Bishop">Bishop / Apostle</SelectItem>
                                                                <SelectItem value="Pastor">Pastor / Minister</SelectItem>
                                                                <SelectItem value="Government">Government / Dignitary</SelectItem>
                                                                <SelectItem value="Guest">General Guest</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            className="w-full h-7 px-2 text-[10px]"
                                                            value={editOrg}
                                                            onChange={e => setEditOrg(e.target.value)}
                                                            placeholder="Organization"
                                                        />
                                                        {editRole === 'Bishop' && (
                                                            <Input
                                                                className="w-full h-7 px-2 text-[10px] bg-blue-50 border-blue-100"
                                                                value={editPA}
                                                                onChange={e => setEditPA(e.target.value)}
                                                                placeholder="Personal Assistant"
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="text-sm truncate max-w-[120px] md:max-w-[150px]">{guest.role}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[120px] md:max-w-[150px]">{guest.organization}</div>
                                                        {guest.role === 'Bishop' && guest.personal_assistant && (
                                                            <div className="text-[10px] text-blue-600 font-medium italic mt-1">
                                                                PA: {guest.personal_assistant}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center sm:text-left">
                                                {editingGuestId === guest.id ? (
                                                    <Input
                                                        className="w-full h-8 px-2 text-xs"
                                                        value={editSeat}
                                                        onChange={e => setEditSeat(e.target.value)}
                                                        placeholder="S"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-xs text-slate-500">{guest.assigned_seat || '-'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                {editingGuestId === guest.id ? (
                                                    <Select value={editRsvp} onValueChange={setEditRsvp}>
                                                        <SelectTrigger className="w-full h-8 text-[10px] px-2">
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
                                                        guest.rsvp_status === 'Confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none px-1.5 py-0 text-[10px]' :
                                                            guest.rsvp_status === 'Declined' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-none px-1.5 py-0 text-[10px]' :
                                                                'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none px-1.5 py-0 text-[10px]'
                                                    }>{guest.rsvp_status}</Badge>
                                                )}
                                            </TableCell>
                                            {isEditMode && (
                                                <TableCell className="text-right py-4 px-4">
                                                    <div className="flex justify-end gap-1">
                                                        {editingGuestId === guest.id ? (
                                                            <Button size="icon" variant="ghost" onClick={() => saveEdit(guest.id)} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(guest)}>
                                                                    <Edit className="w-3 h-3 text-slate-400" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50" onClick={() => onDeleteGuest(guest.id)}>
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {isEditMode ? (
                    <>
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
                                {newGuestRole === 'Bishop' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                        <Label>Personal Assistant</Label>
                                        <Input placeholder="PA Name" value={newGuestPA} onChange={e => setNewGuestPA(e.target.value)} />
                                    </div>
                                )}
                                <Button className="w-full" onClick={addGuest}>
                                    <UserPlus className="w-4 h-4 mr-2" /> Add to List
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100">
                            <CardHeader>
                                <CardTitle className="text-blue-900 dark:text-blue-100 text-sm">Protocol Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                    Ensure all Bishops are assigned a Personal Assistant from the Pastoral Care Unit. Hotel bookings should be confirmed 2 weeks prior to arrival.
                                </p>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-24 h-24 -mt-8 -mr-8" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-white">Guest Management</CardTitle>
                            <CardDescription className="text-slate-400">View and track RSVPs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-xs text-slate-300 leading-relaxed italic">
                                    "Ensure all Bishops are assigned a Personal Assistant from the Pastoral Care Unit. Hotel bookings should be confirmed 2 weeks prior to arrival."
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-4">
                                <AlertCircle className="w-3 h-3" />
                                Click "Manage Guests" above to add or edit entries
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

const ModernProjectBrief = ({
    unitInformation,
    isEditMode,
    briefTitle,
    setBriefTitle,
    briefSubtitle,
    setBriefSubtitle,
    briefOverview,
    setBriefOverview,
    strategicObjective,
    setStrategicObjective,
    unitFormationPastor,
    setUnitFormationPastor,
    unitFormationMeeting,
    setUnitFormationMeeting,
    onUpdateUnit,
    onDeleteUnitRequest
}: {
    unitInformation: any[],
    isEditMode: boolean,
    briefTitle: string,
    setBriefTitle: (v: string) => void,
    briefSubtitle: string,
    setBriefSubtitle: (v: string) => void,
    briefOverview: string,
    setBriefOverview: (v: string) => void,
    strategicObjective: string,
    setStrategicObjective: (v: string) => void,
    unitFormationPastor: string,
    setUnitFormationPastor: (v: string) => void,
    unitFormationMeeting: string,
    setUnitFormationMeeting: (v: string) => void,
    onUpdateUnit: (id: string, updates: any) => void,
    onDeleteUnitRequest?: (id: string, name: string) => void
}) => {
    const alreadyExistingUnits = unitInformation.filter(u => u.is_existing_unit);
    const immediateActionUnits = unitInformation.filter(u => u.unit_type === 'Immediate Action');
    const subsequentUnits = unitInformation.filter(u => u.unit_type === 'Subsequent');

    const UnitCard = ({ unit, index, typePrefix }: { unit: any, index: number, typePrefix: string }) => {
        const longPressProps = useLongPress(() => {
            if (isEditMode && onDeleteUnitRequest) {
                onDeleteUnitRequest(unit.id, unit.unit_name);
            }
        });

        return (
            <Card
                {...longPressProps}
                className={cn(
                    "shadow-sm hover:shadow-md transition-shadow cursor-default active:scale-[0.98] transition-all",
                    typePrefix === 'immediate' ? "border-l-4 border-l-orange-500" :
                        typePrefix === 'subsequent' ? "border-l-4 border-l-blue-500" :
                            "bg-green-50 dark:bg-green-900/10 border-green-200"
                )}
            >
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        {typePrefix !== 'existing' ? (
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                                typePrefix === 'immediate' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                            )}>
                                {index + 1}
                            </div>
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            {isEditMode ? (
                                <div className="space-y-2">
                                    <Input
                                        value={unit.unit_name}
                                        onChange={(e) => onUpdateUnit(unit.id, { unit_name: e.target.value })}
                                        className={cn("font-bold h-8", typePrefix === 'existing' && "text-sm h-7")}
                                    />
                                    <Textarea
                                        value={unit.full_description}
                                        onChange={(e) => onUpdateUnit(unit.id, { full_description: e.target.value })}
                                        className={cn("text-sm min-h-[60px]", typePrefix === 'existing' && "text-xs min-h-[50px]")}
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Long press to delete unit</p>
                                </div>
                            ) : (
                                <>
                                    <h4 className={cn("font-bold text-slate-800 dark:text-slate-200", typePrefix === 'existing' && "text-sm")}>
                                        {unit.unit_name}
                                    </h4>
                                    <p className={cn("text-slate-600 dark:text-slate-400", typePrefix === 'existing' ? "text-xs mt-1" : "text-sm mt-1")}>
                                        {unit.full_description}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 mb-8 border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-40 pointer-events-none" />
                <div className="relative z-10 max-w-3xl">
                    <Badge className="bg-amber-400 text-amber-900 border-none mb-6 font-bold px-3 py-1">Confidential - Management Only</Badge>

                    {isEditMode ? (
                        <div className="space-y-4 mb-6">
                            <Input
                                value={briefTitle}
                                onChange={(e) => setBriefTitle(e.target.value)}
                                className="text-3xl md:text-5xl font-black bg-white/10 border-white/20 text-white h-auto py-2"
                            />
                            <Textarea
                                value={briefSubtitle}
                                onChange={(e) => setBriefSubtitle(e.target.value)}
                                className="text-lg bg-white/10 border-white/20 text-slate-300 h-24"
                            />
                        </div>
                    ) : (
                        <>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
                                {briefTitle}
                            </h2>
                            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-6">
                                {briefSubtitle}
                            </p>
                        </>
                    )}

                    <div className="flex items-center gap-4">
                        <Badge className="bg-green-500 text-white border-none px-3 py-1 shadow-lg shadow-green-500/20">Status: In Progress</Badge>
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-semibold tracking-wide">August 14th - 16th, 2026</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column: Core Information */}
                <div className="md:col-span-2 space-y-8">
                    {/* Overview */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shadow-sm">
                                <Target className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h3>
                        </div>
                        {isEditMode ? (
                            <Textarea
                                value={briefOverview}
                                onChange={(e) => setBriefOverview(e.target.value)}
                                className="text-lg min-h-[100px]"
                            />
                        ) : (
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                                {briefOverview}
                            </p>
                        )}
                    </section>

                    {/* Strategic Objective */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shadow-sm">
                                <Flag className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Strategic Objective</h3>
                        </div>
                        {isEditMode ? (
                            <Textarea
                                value={strategicObjective}
                                onChange={(e) => setStrategicObjective(e.target.value)}
                                className="text-base min-h-[100px]"
                            />
                        ) : (
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {strategicObjective}
                            </p>
                        )}
                    </section>

                    {/* Immediate Actions */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 border-l-4 border-orange-600 pl-4 text-orange-600">Immediate Actions</h3>
                        <div className="space-y-3">
                            {immediateActionUnits.map((unit, i) => (
                                <UnitCard key={unit.id || i} unit={unit} index={i} typePrefix="immediate" />
                            ))}
                        </div>
                    </section>

                    {/* Subsequent Units */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 border-l-4 border-blue-600 pl-4 text-blue-600">Subsequent Units</h3>
                        <div className="space-y-3">
                            {subsequentUnits.map((unit, i) => (
                                <UnitCard key={unit.id || i} unit={unit} index={i} typePrefix="subsequent" />
                            ))}
                        </div>
                    </section>

                    {/* Already Existing Units */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 border-l-4 border-green-600 pl-4 text-green-600">Already Existing Units</h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {alreadyExistingUnits.map((unit, i) => (
                                <UnitCard key={unit.id || i} unit={unit} index={i} typePrefix="existing" />
                            ))}
                        </div>
                    </section>

                    {/* Unit Formation Plan */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 border-l-4 border-blue-600 pl-4">Unit Formation Plan</h3>
                        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 shadow-sm">
                            <CardContent className="p-6">
                                {isEditMode ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Pastor Strategy</label>
                                            <Textarea
                                                value={unitFormationPastor}
                                                onChange={(e) => setUnitFormationPastor(e.target.value)}
                                                className="bg-white/50 min-h-[80px]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Meeting Strategy</label>
                                            <Textarea
                                                value={unitFormationMeeting}
                                                onChange={(e) => setUnitFormationMeeting(e.target.value)}
                                                className="bg-white/50 min-h-[80px]"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                                            <strong>National Workers Meeting:</strong> {unitFormationPastor}
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {unitFormationMeeting}
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* Key Responsibilities */}
                    <section>
                        <h3 className="text-xl font-bold mb-4 border-l-4 border-blue-600 pl-4">Key Responsibilities</h3>
                        <div className="space-y-4">
                            {[
                                { title: "Spiritual Preparedness", desc: "Intercessory Unit to maintain spiritual atmosphere throughout planning." },
                                { title: "Excellence in Hospitality", desc: "Usher & Protocol / Flights & Accommodations to ensure world-class treatment of guests." },
                                { title: "Operational Efficiency", desc: "NOC & Admin to handle budgets, deadlines, and compliance." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm font-black shrink-0 mt-1">{i + 1}</div>
                                    <div className="flex-1">
                                        {isEditMode ? (
                                            <div className="space-y-2">
                                                <Input value={item.title} readOnly className="font-bold h-8 bg-slate-100/50" />
                                                <Textarea value={item.desc} readOnly className="text-sm min-h-[40px] bg-slate-100/50" />
                                                <p className="text-[10px] text-slate-400 italic">Static responsibilities (editable soon)</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Key Contacts & Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Resources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 h-auto py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => generateProjectBriefPDF({})}
                            >
                                <FileText className="w-4 h-4 text-red-500" />
                                <div className="text-left">
                                    <div className="font-bold text-xs">Full PDF Brief</div>
                                    <div className="text-[10px] text-slate-500">2.4 MB • Updated Today</div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};




// --- Custom Hook for Long Press ---
const useLongPress = (onLongPress: () => void, onClick?: () => void, ms = 500) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = useRef(false);

    const start = useCallback((e: any) => {
        isLongPressActive.current = false;
        timerRef.current = setTimeout(() => {
            isLongPressActive.current = true;
            onLongPress();
        }, ms);
    }, [onLongPress, ms]);

    const stop = useCallback((e: any) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (!isLongPressActive.current && onClick) {
            onClick();
        }
    }, [onClick]);

    return {
        onMouseDown: start,
        onMouseUp: stop,
        onMouseLeave: stop,
        onTouchStart: start,
        onTouchEnd: stop,
    };
};

// --- Main Page Component ---

const ManagementTeamPage = () => {
    // --- State Management ---
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Update current time every hour to ensure month transitions are caught
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000 * 60 * 60);
        return () => clearInterval(timer);
    }, []);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isLoading, setIsLoading] = useState(true);
    const tabsListRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    const checkScroll = () => {
        if (tabsListRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
            setShowLeftFade(scrollLeft > 10);
            setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    // Function to change tabs and scroll to top
    const handleTabChange = (newTab: string) => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'instant' });
        } else {
            window.scrollTo(0, 0);
        }
        setActiveTab(newTab);
    };

    // Tab-specific Edit Modes
    const [isDashboardEditMode, setIsDashboardEditMode] = useState(false);
    const [isUnitsEditMode, setIsUnitsEditMode] = useState(false);
    const [isGuestsEditMode, setIsGuestsEditMode] = useState(false);
    const [isBudgetEditMode, setIsBudgetEditMode] = useState(false);
    const [isBriefEditMode, setIsBriefEditMode] = useState(false);

    // Dynamic Data
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [tools, setTools] = useState<ProjectTool[]>([]);
    const [phases, setPhases] = useState<Phase[]>([]);
    const [unitInformation, setUnitInformation] = useState<any[]>([]);

    // Progress & Settings
    const [overallProgress, setOverallProgress] = useState(0);
    const [isManualProgress, setIsManualProgress] = useState(false);
    const [manualProgress, setManualProgress] = useState(0);
    const [totalBudget, setTotalBudget] = useState(25000);

    // Brief Content States
    const [briefTitle, setBriefTitle] = useState("Outpouring Convention & Episcopal Consecration");
    const [briefSubtitle, setBriefSubtitle] = useState("A definitive guide to the planning, execution, and spiritual preparation for the upcoming consecration ceremony and convention.");
    const [briefOverview, setBriefOverview] = useState("This brief contains a high-level summary of the project management of the forthcoming Outpouring Convention & Episcopal Consecration.");
    const [strategicObjective, setStrategicObjective] = useState("To facilitate a seamless, spiritually charged, and excellently organized event that honors the consecration of the Bishop-Elect and hosts the Outpouring Convention, ensuring maximum impact and comfort for all attendees and dignitaries.");
    const [unitFormationPastor, setUnitFormationPastor] = useState("National Workers Meeting: Before this meeting, a list of all Units is given to each of the main Pastors. Pastors nominate different members and workers into groups they see fit based on skills and spiritual maturity.");
    const [unitFormationMeeting, setUnitFormationMeeting] = useState("During the meeting, everyone is informed by their Pastor what unit they will be joining and who the unit lead will be. This ensures a blended approach and maximum collaboration across all branches.");

    const [newToolName, setNewToolName] = useState("");
    const [newToolUrl, setNewToolUrl] = useState("");

    // Task Editing State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTaskText, setEditTaskText] = useState("");
    const [editTaskDeadline, setEditTaskDeadline] = useState("");

    // Task Delete Confirmation State
    const [taskToDelete, setTaskToDelete] = useState<{ id: string, text: string } | null>(null);
    const taskLongPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleTaskLongPressStart = (task: { id: string, task_text: string }) => {
        taskLongPressTimer.current = setTimeout(() => {
            if (window.navigator?.vibrate) window.navigator.vibrate(50);
            setTaskToDelete({ id: task.id, text: task.task_text });
        }, 500);
    };

    const handleTaskLongPressEnd = () => {
        if (taskLongPressTimer.current) {
            clearTimeout(taskLongPressTimer.current);
            taskLongPressTimer.current = null;
        }
    };

    // Saturday Prayer Accountability State
    const [prayerChecklist, setPrayerChecklist] = useState<Record<string, boolean>>({});
    const [isPrayerAccountabilityOpen, setIsPrayerAccountabilityOpen] = useState(false);

    // Unit Deletion State
    const [unitToRemove, setUnitToRemove] = useState<{ id: string, name: string } | null>(null);
    const [isRemoveUnitConfirmOpen, setIsRemoveUnitConfirmOpen] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [settingsData, expensesData, guestsData, tasksData, toolsData, phasesData, unitInfoData] = await Promise.all([
                managementService.getSettings(),
                managementService.getExpenses(),
                managementService.getGuests(),
                managementService.getTasks(),
                managementService.getTools(),
                managementService.getPhases(),
                managementService.getUnitInformation()
            ]);

            setTotalBudget(settingsData.total_budget);
            setOverallProgress(settingsData.overall_progress);
            setIsManualProgress(settingsData.is_manual_progress);
            setManualProgress(settingsData.manual_progress);

            // Brief Settings
            let updatedTitle = settingsData.brief_title;
            let updatedOverview = settingsData.brief_overview;
            let needsDbUpdate = false;

            // Sanitize old naming if it exists in DB
            if (updatedTitle === "Bishopric Consecration & Outpouring Convention") {
                updatedTitle = "Outpouring Convention & Episcopal Consecration";
                needsDbUpdate = true;
            }
            if (updatedOverview?.includes("Bishopric Consecration & Outpouring Convention")) {
                updatedOverview = updatedOverview.replace("Bishopric Consecration & Outpouring Convention", "Outpouring Convention & Episcopal Consecration");
                needsDbUpdate = true;
            }

            if (updatedTitle) setBriefTitle(updatedTitle);
            if (settingsData.brief_subtitle) setBriefSubtitle(settingsData.brief_subtitle);
            if (updatedOverview) setBriefOverview(updatedOverview);
            if (settingsData.strategic_objective) setStrategicObjective(settingsData.strategic_objective);
            if (settingsData.unit_formation_plan_pastor) setUnitFormationPastor(settingsData.unit_formation_plan_pastor);
            if (settingsData.unit_formation_plan_meeting) setUnitFormationMeeting(settingsData.unit_formation_plan_meeting);

            // If we found old naming, update the database record to permanently switch it
            if (needsDbUpdate) {
                managementService.updateSettings({
                    brief_title: updatedTitle,
                    brief_overview: updatedOverview
                }).catch(err => console.error("Auto-syncing renamed convention failed:", err));
            }

            setExpenses(expensesData);
            setGuests(guestsData);
            setAllTasks(tasksData);
            setTools(toolsData);
            setPhases(phasesData.map(p => ({
                id: p.id,
                name: p.name,
                startDate: new Date(p.start_date),
                endDate: new Date(p.end_date),
                status: p.status,
                description: p.description
            })));
            setUnitInformation(unitInfoData);
        } catch (error) {
            console.error("Error fetching management data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Scroll to top when tab changes
    useEffect(() => {
        const resetScroll = () => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.scrollTo(0, 0);
            } else {
                window.scrollTo(0, 0);
            }
        };

        // Immediate reset
        resetScroll();

        // Also reset after next paint and with a timeout for reliability
        requestAnimationFrame(resetScroll);
        const timer = setTimeout(resetScroll, 150);

        return () => clearTimeout(timer);
    }, [activeTab]);

    // Derived Units
    const immediateUnits: Unit[] = Array.from(new Set(allTasks.filter(t => t.is_immediate).map(t => t.unit_name))).map(name => ({
        name,
        description: name === 'Intercessory Unit' ? "Spiritual foundation and covering" : "Overall coordination and strategy",
        tasks: allTasks.filter(t => t.unit_name === name && t.is_immediate),
        deadline: allTasks.find(t => t.unit_name === name && t.is_immediate)?.deadline || undefined
    }));

    const subsequentUnits: Unit[] = Array.from(new Set(allTasks.filter(t => !t.is_immediate).map(t => t.unit_name))).map(name => ({
        name,
        description: name === 'Ushering & Protocol' ? "Guest management and order" : "Audio, video and streaming",
        tasks: allTasks.filter(t => t.unit_name === name && !t.is_immediate)
    }));

    // Derived Progress Calculation
    useEffect(() => {
        if (!isManualProgress && allTasks.length > 0) {
            const completedCount = allTasks.filter(t => t.is_completed).length;
            const newProgress = Math.round((completedCount / allTasks.length) * 100);
            if (newProgress !== overallProgress) {
                setOverallProgress(newProgress);
                managementService.updateSettings({ overall_progress: newProgress });
            }
        }
    }, [allTasks, isManualProgress]);

    // Handlers
    const handleUpdateTotalBudget = async (val: number) => {
        setTotalBudget(val);
        try {
            await managementService.updateSettings({ total_budget: val });
        } catch (error) {
            toast.error("Failed to update budget");
        }
    };

    const handleToggleManualProgress = async (c: boolean) => {
        setIsManualProgress(c);
        try {
            await managementService.updateSettings({ is_manual_progress: c });
        } catch (error) {
            toast.error("Failed to update mode");
        }
    };

    const handleUpdateManualProgress = async (val: number) => {
        setManualProgress(val);
        setOverallProgress(val);
        try {
            await managementService.updateSettings({ manual_progress: val, overall_progress: val });
        } catch (error) {
            toast.error("Failed to update progress");
        }
    };

    const toggleTask = async (unitName: string, taskId: string, isImmediate: boolean) => {
        try {
            const task = allTasks.find(t => t.id === taskId);
            if (!task) return;
            const newCompleted = !task.is_completed;

            // Optimistic Update
            setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: newCompleted } : t));

            await managementService.updateTask(taskId, { is_completed: newCompleted });
        } catch (error) {
            toast.error("Failed to update task");
            fetchData(); // Rollback
        }
    };

    const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
        try {
            await managementService.updateTask(id, updates);
            setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        } catch (error) {
            toast.error("Failed to update task");
        }
    };

    const handleDeleteTask = async (id: string) => {
        try {
            await managementService.deleteTask(id);
            setAllTasks(prev => prev.filter(t => t.id !== id));

        } catch (error) {
            toast.error("Failed to delete task");
        }
    };

    const handleAddTask = async (unitName: string, isImmediate: boolean) => {
        try {
            const newTask = await managementService.addTask({
                unit_name: unitName,
                task_text: "New Task",
                is_completed: false,
                is_immediate: isImmediate,
                deadline: "30th Jan 2026"
            });
            setAllTasks([...allTasks, newTask]);

        } catch (error) {
            toast.error("Failed to add task");
            console.error(error);
        }
    };

    const handleAddExpense = async (exp: any) => {
        try {
            const newExp = await managementService.addExpense(exp);
            setExpenses([newExp, ...expenses]);

        } catch (error) {
            toast.error("Failed to add expense");
        }
    };

    const handleDeleteExpense = async (id: string) => {
        try {
            await managementService.deleteExpense(id);
            setExpenses(expenses.filter(e => e.id !== id));

        } catch (error) {
            toast.error("Failed to delete expense");
        }
    };

    const handleUpdateExpense = async (id: string, updates: Partial<Expense>) => {
        try {
            await managementService.updateExpense(id, updates);
            setExpenses(expenses.map(e => e.id === id ? { ...e, ...updates } : e));

        } catch (error) {
            toast.error("Failed to update expense");
        }
    };

    const handleAddGuest = async (g: any) => {
        try {
            const newGuest = await managementService.addGuest(g);
            setGuests([newGuest, ...guests]);

        } catch (error) {
            toast.error("Failed to add guest");
        }
    };

    const handleUpdateGuest = async (id: string, updates: any) => {
        try {
            await managementService.updateGuest(id, updates);
            setGuests(guests.map(g => g.id === id ? { ...g, ...updates } : g));

        } catch (error) {
            toast.error("Failed to update guest");
        }
    };

    const handleDeleteGuest = async (id: string) => {
        try {
            await managementService.deleteGuest(id);
            setGuests(guests.filter(g => g.id !== id));

        } catch (error) {
            toast.error("Failed to delete guest");
        }
    };

    const handleAddTool = async () => {
        if (!newToolName) return;
        try {
            const newTool = await managementService.addTool({
                name: newToolName,
                description: "Custom Action",
                url: "#",
                icon_name: "Link"
            });
            setTools([...tools, newTool]);
            setNewToolName("");

        } catch (error) {
            toast.error("Failed to add tool");
        }
    };

    const handleDeleteTool = async (id: string) => {
        try {
            await managementService.deleteTool(id);
            setTools(tools.filter(t => t.id !== id));

        } catch (error) {
            toast.error("Failed to delete tool");
        }
    };

    const handleUpdateUnitInfo = async (id: string, updates: any) => {
        try {
            await managementService.updateUnitInformation(id, updates);
            setUnitInformation(unitInformation.map(u => u.id === id ? { ...u, ...updates } : u));
        } catch (error) {
            console.error("Error updating unit info:", error);
            toast.error("Failed to update unit information");
        }
    };

    const handleDeleteUnitInfo = async (id: string) => {
        try {
            await managementService.deleteUnitInformation(id);
            setUnitInformation(unitInformation.filter(u => u.id !== id));
            toast.success("Unit deleted successfully");
        } catch (error) {
            console.error("Error deleting unit info:", error);
            toast.error("Failed to delete unit");
        }
    };

    const handleSaveBrief = async () => {
        try {
            await managementService.updateSettings({
                brief_title: briefTitle,
                brief_subtitle: briefSubtitle,
                brief_overview: briefOverview,
                strategic_objective: strategicObjective,
                unit_formation_plan_pastor: unitFormationPastor,
                unit_formation_plan_meeting: unitFormationMeeting
            });
            setIsBriefEditMode(false);

        } catch (error) {
            console.error("Error saving brief:", error);
            toast.error("Failed to save project brief");
        }
    };

    // Derived State
    const currentPhase = phases.find(p => {
        const now = currentTime;
        return now >= p.startDate && now <= p.endDate;
    }) || (phases.length > 0 ? phases[0] : { name: "Planning", startDate: new Date(), endDate: new Date() });

    const activeUnitCount = immediateUnits.length + subsequentUnits.length;

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading Management Dashboard...</div>;
    }


    return (
        <div className="container mx-auto pb-24 md:pb-12 px-4 pt-6 space-y-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <Badge variant="outline" className="mb-2 border-amber-500 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {currentPhase.name} Active
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex flex-col md:flex-row md:items-center gap-4">
                        <span>Outpouring Convention & <span className="text-blue-600">Episcopal Consecration</span></span>
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-4 py-1.5 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-blue-200">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-[0.2em]">
                                14 - 16 Aug 2026
                            </span>
                        </div>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                        Project Management Dashboard for {currentTime.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <p className="hidden md:block text-xs uppercase tracking-widest text-slate-400 font-bold">Days Remaining</p>
                    <div className="flex items-center gap-4">
                        <p className="hidden md:block text-xl font-bold font-mono text-blue-600">
                            {Math.ceil((new Date(2026, 7, 14).getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))} Days
                        </p>

                        {activeTab === 'dashboard' && (
                            <Button
                                variant={isDashboardEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsDashboardEditMode(!isDashboardEditMode)}
                                className="gap-2"
                            >
                                {isDashboardEditMode ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                {isDashboardEditMode ? "Save Layout" : "Edit Dashboard"}
                            </Button>
                        )}

                        {activeTab === 'units' && (
                            <Button
                                variant={isUnitsEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsUnitsEditMode(!isUnitsEditMode)}
                                className="gap-2"
                            >
                                {isUnitsEditMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                {isUnitsEditMode ? "Finish Editing" : "Manage Units"}
                            </Button>
                        )}

                        {activeTab === 'guests' && (
                            <Button
                                variant={isGuestsEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsGuestsEditMode(!isGuestsEditMode)}
                                className="gap-2"
                            >
                                {isGuestsEditMode ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                {isGuestsEditMode ? "Finish Editing" : "Manage Guests"}
                            </Button>
                        )}

                        {activeTab === 'budget' && (
                            <Button
                                variant={isBudgetEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsBudgetEditMode(!isBudgetEditMode)}
                                className="gap-2"
                            >
                                {isBudgetEditMode ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                {isBudgetEditMode ? "Finish Editing" : "Manage Budget"}
                            </Button>
                        )}

                        {activeTab === 'brief' && (
                            <Button
                                variant={isBriefEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (isBriefEditMode) handleSaveBrief();
                                    else setIsBriefEditMode(true);
                                }}
                                className="gap-2"
                            >
                                {isBriefEditMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                {isBriefEditMode ? "Save Brief" : "Manage Brief"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Tabs - Redesigned with Sticky & Scroll Cues */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="sticky top-0 z-40 -mx-4 px-4 py-2 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 mb-4 transition-all duration-300">
                    <div className="relative group max-w-5xl mx-auto">
                        {/* Scroll Cues: Fades & Arrows */}
                        <div className={`absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none transition-opacity duration-300 bg-gradient-to-r from-slate-50 dark:from-slate-900 to-transparent ${showLeftFade ? 'opacity-100' : 'opacity-0'}`} />
                        <div className={`absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none transition-opacity duration-300 bg-gradient-to-l from-slate-50 dark:from-slate-900 to-transparent ${showRightFade ? 'opacity-100' : 'opacity-0'}`} />

                        {/* Left Arrow (Desktop) */}
                        {showLeftFade && (
                            <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-400">
                                <ChevronLeft className="w-4 h-4" />
                            </div>
                        )}

                        {/* Right Arrow (Desktop) */}
                        {showRightFade && (
                            <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-400">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        )}

                        <TabsList
                            ref={tabsListRef}
                            onScroll={checkScroll}
                            className="flex flex-nowrap overflow-x-auto pb-1 justify-start md:justify-center gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 w-full no-scrollbar rounded-2xl h-auto border border-white/40 dark:border-slate-700/40"
                        >
                            <TabsTrigger
                                value="dashboard"
                                className="flex-shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-xl px-4 md:px-6 py-2.5 transition-all duration-300 flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </TabsTrigger>
                            <TabsTrigger
                                value="brief"
                                className="flex-shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-xl px-4 md:px-6 py-2.5 transition-all duration-300 flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <FileText className="w-4 h-4" /> Brief
                            </TabsTrigger>
                            <TabsTrigger
                                value="units"
                                className="flex-shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-xl px-4 md:px-6 py-2.5 transition-all duration-300 flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <ClipboardList className="w-4 h-4" /> Units
                            </TabsTrigger>
                            <TabsTrigger
                                value="guests"
                                className="flex-shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-xl px-4 md:px-6 py-2.5 transition-all duration-300 flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <Users className="w-4 h-4" /> Guest List
                            </TabsTrigger>
                            <TabsTrigger
                                value="budget"
                                className="flex-shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-xl px-4 md:px-6 py-2.5 transition-all duration-300 flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <CreditCard className="w-4 h-4" /> Budget
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                {/* DASHBOARD TAB - RESTORED HYBRID VERSION */}
                <TabsContent value="dashboard" className="space-y-6">
                    {/* Status Overview */}
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 text-white border-none shadow-xl col-span-1 md:col-span-2">
                            <CardHeader className="pb-2 flex flex-row justify-between items-center">
                                <CardTitle className="text-lg font-medium opacity-90">Overall Progress</CardTitle>
                                {isDashboardEditMode && (
                                    <div className="flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full">
                                        <Checkbox
                                            id="manual-mode"
                                            checked={isManualProgress}
                                            onCheckedChange={(c) => handleToggleManualProgress(!!c)}
                                            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                                        />
                                        <label htmlFor="manual-mode" className="text-xs font-medium cursor-pointer select-none">Manual Override</label>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-2 mb-4">
                                    {isDashboardEditMode && isManualProgress ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={manualProgress}
                                                onChange={(e) => handleUpdateManualProgress(Number(e.target.value))}
                                                className="w-24 h-12 text-3xl font-bold bg-white/20 border-none text-white focus-visible:ring-1 focus-visible:ring-white"
                                            />
                                            <span className="text-3xl font-bold">%</span>
                                        </div>
                                    ) : (
                                        <div className="text-4xl font-bold">{overallProgress}%</div>
                                    )}
                                </div>
                                <Progress value={overallProgress} className="h-2 bg-white/20 [&>div]:transition-none" />
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

                        <Card className="relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                                    Day Count
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-blue-600">
                                    {Math.ceil((new Date(2026, 7, 14).getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))} Days
                                </div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter mt-1">
                                    Aug 14th - 16th, 2026
                                </p>
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
                                        <button
                                            onClick={() => handleTabChange(tool.url)}
                                            className="flex items-center gap-3 flex-1 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                                {React.createElement(ICON_MAP[tool.icon_name] || Link, { className: "w-4 h-4" })}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{tool.name}</div>
                                                <div className="text-[10px] text-slate-400">{tool.description}</div>
                                            </div>
                                        </button>
                                        {isDashboardEditMode && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteTool(tool.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {isDashboardEditMode && (
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
                                                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${isActive ? 'bg-blue-600 border-blue-600' :
                                                    isPast ? 'bg-slate-400 border-slate-400' :
                                                        'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600'
                                                    }`} />
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className={`text-lg font-bold ${isActive ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                                                            {phase.name}
                                                        </h3>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{phase.description}</p>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                        {phase.startDate.toLocaleDateString(undefined, { month: 'short' })} - {phase.endDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
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
                    <ModernProjectBrief
                        unitInformation={unitInformation}
                        isEditMode={isBriefEditMode}
                        briefTitle={briefTitle}
                        setBriefTitle={setBriefTitle}
                        briefSubtitle={briefSubtitle}
                        setBriefSubtitle={setBriefSubtitle}
                        briefOverview={briefOverview}
                        setBriefOverview={setBriefOverview}
                        strategicObjective={strategicObjective}
                        setStrategicObjective={setStrategicObjective}
                        unitFormationPastor={unitFormationPastor}
                        setUnitFormationPastor={setUnitFormationPastor}
                        unitFormationMeeting={unitFormationMeeting}
                        setUnitFormationMeeting={setUnitFormationMeeting}
                        onUpdateUnit={handleUpdateUnitInfo}
                        onDeleteUnitRequest={(id, name) => {
                            setUnitToRemove({ id, name });
                            setIsRemoveUnitConfirmOpen(true);
                        }}
                    />
                </TabsContent>

                {/* BUDGET TAB */}
                <TabsContent value="budget">
                    <BudgetTracker
                        isEditMode={isBudgetEditMode}
                        totalBudget={totalBudget}
                        setTotalBudget={handleUpdateTotalBudget}
                        expenses={expenses}
                        onAddExpense={handleAddExpense}
                        onDeleteExpense={handleDeleteExpense}
                        onUpdateExpense={handleUpdateExpense}
                    />
                </TabsContent>

                {/* GUESTS TAB */}
                <TabsContent value="guests">
                    <GuestListManager
                        guests={guests}
                        onAddGuest={handleAddGuest}
                        onUpdateGuest={handleUpdateGuest}
                        onDeleteGuest={handleDeleteGuest}
                        isEditMode={isGuestsEditMode}
                    />
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
                                            </div>
                                            <CardDescription>{unit.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {unit.tasks.map(task => (
                                                    <div key={task.id} className="group flex items-start justify-between space-x-2 select-none" onTouchStart={() => handleTaskLongPressStart(task)} onTouchEnd={handleTaskLongPressEnd} onMouseDown={() => handleTaskLongPressStart(task)} onMouseUp={handleTaskLongPressEnd} onMouseLeave={handleTaskLongPressEnd}>
                                                        <div className="flex items-start space-x-2 flex-1">
                                                            <Checkbox
                                                                id={task.id}
                                                                checked={task.is_completed}
                                                                onCheckedChange={() => toggleTask(unit.name, task.id, true)}
                                                            />
                                                            {editingTaskId === task.id ? (
                                                                <div className="flex-1 space-y-2">
                                                                    <Input
                                                                        value={editTaskText}
                                                                        onChange={e => setEditTaskText(e.target.value)}
                                                                        className="h-8 text-sm"
                                                                    />
                                                                    <Input
                                                                        value={editTaskDeadline}
                                                                        onChange={e => setEditTaskDeadline(e.target.value)}
                                                                        className="h-8 text-xs font-mono"
                                                                        placeholder="30th Jan 2026"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button size="sm" variant="ghost" onClick={() => {
                                                                            handleUpdateTask(task.id, { task_text: editTaskText, deadline: editTaskDeadline });
                                                                            setEditingTaskId(null);
                                                                        }} className="h-7 px-2 text-green-600 border border-green-100"><CheckCircle2 className="w-4 h-4" /></Button>
                                                                        <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)} className="h-7 px-2 text-slate-400 border border-slate-100"><Trash2 className="w-3 h-3 rotate-45" /></Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1">
                                                                    <label
                                                                        htmlFor={task.id}
                                                                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.is_completed ? 'line-through text-slate-400' : ''}`}
                                                                    >
                                                                        {task.task_text}
                                                                    </label>
                                                                    {task.deadline && (
                                                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-600 font-bold uppercase tracking-tight">
                                                                            <Calendar className="w-3 h-3" />
                                                                            {task.deadline}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isUnitsEditMode && editingTaskId !== task.id && (
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-slate-400"
                                                                    onClick={() => {
                                                                        setEditingTaskId(task.id);
                                                                        setEditTaskText(task.task_text);
                                                                        setEditTaskDeadline(task.deadline || "");
                                                                    }}
                                                                >
                                                                    <Edit className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-400"
                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {isUnitsEditMode && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full mt-2 h-8 text-[10px] border-dashed text-slate-500 hover:text-purple-600 hover:border-purple-200"
                                                        onClick={() => handleAddTask(unit.name, true)}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add Action
                                                    </Button>
                                                )}
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
                                            <div className="space-y-3">
                                                {unit.tasks.map(task => (
                                                    <div key={task.id} className="group flex items-start justify-between space-x-2 select-none" onTouchStart={() => handleTaskLongPressStart(task)} onTouchEnd={handleTaskLongPressEnd} onMouseDown={() => handleTaskLongPressStart(task)} onMouseUp={handleTaskLongPressEnd} onMouseLeave={handleTaskLongPressEnd}>
                                                        <div className="flex items-start space-x-2 flex-1">
                                                            <Checkbox
                                                                id={task.id}
                                                                checked={task.is_completed}
                                                                onCheckedChange={() => toggleTask(unit.name, task.id, false)}
                                                            />
                                                            {editingTaskId === task.id ? (
                                                                <div className="flex-1 space-y-2">
                                                                    <Input
                                                                        value={editTaskText}
                                                                        onChange={e => setEditTaskText(e.target.value)}
                                                                        className="h-8 text-sm"
                                                                    />
                                                                    <Input
                                                                        value={editTaskDeadline}
                                                                        onChange={e => setEditTaskDeadline(e.target.value)}
                                                                        className="h-8 text-xs font-mono"
                                                                        placeholder="30 Jan 2026"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button size="sm" variant="ghost" onClick={() => {
                                                                            handleUpdateTask(task.id, { task_text: editTaskText, deadline: editTaskDeadline });
                                                                            setEditingTaskId(null);
                                                                        }} className="h-7 px-2 text-green-600 border border-green-100"><CheckCircle2 className="w-4 h-4" /></Button>
                                                                        <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)} className="h-7 px-2 text-slate-400 border border-slate-100"><Trash2 className="w-3 h-3 rotate-45" /></Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1">
                                                                    <label
                                                                        htmlFor={task.id}
                                                                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.is_completed ? 'line-through text-slate-400' : ''}`}
                                                                    >
                                                                        {task.task_text}
                                                                    </label>
                                                                    {task.deadline && (
                                                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 font-bold uppercase tracking-tight">
                                                                            <Calendar className="w-3 h-3" />
                                                                            {task.deadline}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isUnitsEditMode && editingTaskId !== task.id && (
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-slate-400"
                                                                    onClick={() => {
                                                                        setEditingTaskId(task.id);
                                                                        setEditTaskText(task.task_text);
                                                                        setEditTaskDeadline(task.deadline || "");
                                                                    }}
                                                                >
                                                                    <Edit className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-400"
                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {isUnitsEditMode && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full mt-2 h-8 text-[10px] border-dashed text-slate-500 hover:text-purple-600 hover:border-purple-200"
                                                        onClick={() => handleAddTask(unit.name, false)}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add Action
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

            </Tabs>

            {/* Task Delete Confirmation */}
            <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            Delete Task?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-base py-4">
                            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{taskToDelete?.text}"</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 font-bold hover:bg-slate-50">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (taskToDelete) handleDeleteTask(taskToDelete.id);
                                setTaskToDelete(null);
                            }}
                            className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold px-8 shadow-lg shadow-red-500/20"
                        >
                            Delete Task
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Unit Deletion Confirmation */}
            <AlertDialog open={isRemoveUnitConfirmOpen} onOpenChange={setIsRemoveUnitConfirmOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            Delete Unit?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-base py-4">
                            Are you sure you want to delete the unit <span className="font-bold text-slate-900 dark:text-white">"{unitToRemove?.name}"</span>?
                            This action will permanently remove the unit and all its associated descriptions and data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 font-bold hover:bg-slate-50">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (unitToRemove) handleDeleteUnitInfo(unitToRemove.id);
                                setIsRemoveUnitConfirmOpen(false);
                            }}
                            className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold px-8 shadow-lg shadow-red-500/20"
                        >
                            Delete Unit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ManagementTeamPage;
