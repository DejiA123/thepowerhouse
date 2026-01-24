import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Phone, Calendar, User, ClipboardList, Search, MessageCircle, MoreVertical, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { followUpService, FollowUpAssignment } from "@/services/followUpService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function TeamFollowUpPage() {
    const topRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState<string[]>([]);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<FollowUpAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit Note State
    const [isEditNoteOpen, setIsEditNoteOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<FollowUpAssignment | null>(null);
    const [newNote, setNewNote] = useState("");

    // Create/Edit Assignment State
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    const [assignmentForm, setAssignmentForm] = useState<Partial<FollowUpAssignment>>({
        visitor_name: "",
        visit_date: "",
        phone_number: "",
        invited_by: "",
        assigned_to: "",
        notes: ""
    });
    const [isEditing, setIsEditing] = useState(false);

    const teamList = [
        "Reverend David",
        "Reverend Mirella",
        "RP Zainab",
        "Pastor Deji",
        "Golden",
        "Min. Mercy",
        "YP Sodiq",
        "Min. Merit",
        "Ibukun",
        "Joel"
    ];

    useEffect(() => {
        // We use the static list now, but assignments will still load dynamically
        setTeamMembers(teamList);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (selectedMember) {
            // Instant scroll to top BEFORE loading data
            window.scrollTo(0, 0);
            loadAssignments(selectedMember);
        }
    }, [selectedMember]);

    const loadAssignments = async (name: string) => {
        setIsLoading(true);
        try {
            const data = await followUpService.getAssignmentsFor(name);
            setAssignments(data);
            // Double check scroll position after render
            requestAnimationFrame(() => {
                window.scrollTo(0, 0);
            });
        } catch (error) {
            toast.error("Failed to load assignments");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!editingAssignment) return;
        try {
            await followUpService.updateNote(editingAssignment.id, newNote);
            toast.success("Note updated");
            setIsEditOpen(false);
            loadAssignments(selectedMember!); // Refresh list
        } catch (error) {
            toast.error("Failed to update note");
        }
    };

    const openEditNote = (assignment: FollowUpAssignment) => {
        setEditingAssignment(assignment);
        setNewNote(assignment.notes || "");
        setIsEditNoteOpen(true);
    };

    const openCreateAssignment = () => {
        setIsEditing(false);
        setAssignmentForm({
            visitor_name: "",
            visit_date: "",
            phone_number: "",
            invited_by: "",
            assigned_to: selectedMember || "",
            notes: ""
        });
        setIsAssignmentDialogOpen(true);
    };

    const openEditAssignment = (assignment: FollowUpAssignment) => {
        setIsEditing(true);
        setAssignmentForm(assignment);
        setIsAssignmentDialogOpen(true);
    };

    const handleSaveAssignment = async () => {
        try {
            if (isEditing && assignmentForm.id) {
                await followUpService.updateAssignment(assignmentForm.id, assignmentForm);
                toast.success("Assignment updated");
            } else {
                await followUpService.createAssignment(assignmentForm);
                toast.success("Assignment created");
            }
            setIsAssignmentDialogOpen(false);
            loadAssignments(selectedMember!);
            // Scroll to top of page
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast.error("Failed to save assignment");
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await followUpService.deleteAssignment(id);
            toast.success("Assignment deleted");
            loadAssignments(selectedMember!);
        } catch (error) {
            toast.error("Failed to delete assignment");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => selectedMember ? setSelectedMember(null) : navigate(-1)}>
                            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                                Follow Up Team
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">

                {/* VIEW 1: SELECT MEMBER */}
                {!selectedMember ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-4 py-8">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Users className="w-10 h-10 text-blue-600" />
                            </div>

                            <p className="text-slate-500 text-lg">Select your name to view your follow-up assignments.</p>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12 text-slate-400">Loading team...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teamMembers.map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            window.scrollTo(0, 0);
                                            setSelectedMember(name);
                                        }}
                                        className="group relative bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all active:scale-[0.98] md:hover:border-blue-500/50 md:hover:shadow-md text-left overflow-hidden"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl group-active:bg-blue-600 group-active:text-white md:group-hover:bg-blue-600 md:group-hover:text-white transition-colors">
                                                {name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg">{name}</h3>
                                            </div>
                                            <div className="text-slate-300 dark:text-slate-700 md:group-hover:text-blue-500 transition-colors">
                                                <ArrowLeft className="w-5 h-5 rotate-180" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {teamMembers.length === 0 && (
                                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-400">No team members found.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* VIEW 2: ASSIGNMENT LIST */
                    <div ref={topRef} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                Hello, <span className="text-blue-600">{selectedMember}</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {assignments.length} People
                                </Badge>
                                <Button onClick={openCreateAssignment} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    Add Person
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="py-20 text-center text-slate-400">Loading your list...</div>
                        ) : (
                            <div className="space-y-4">
                                {assignments.map((person) => (
                                    <Card key={person.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                                        {person.visitor_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                        <Calendar className="w-4 h-4" />
                                                        Visited: {new Date(person.visit_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                                    Invited by {person.invited_by || 'Unknown'}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                <a
                                                    href={`tel:${person.phone_number}`}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors border border-green-100 dark:border-green-800"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                                                        <Phone className="w-5 h-5 text-green-700 dark:text-green-200" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase opacity-70">Phone Number</p>
                                                        <p className="font-bold">{person.phone_number}</p>
                                                    </div>
                                                </a>

                                                <button
                                                    onClick={() => openEditNote(person)}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors border border-slate-100 dark:border-slate-800 text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                        <MessageCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold uppercase opacity-70">Notes</p>
                                                        <p className="font-medium truncate">{person.notes || "Add a note..."}</p>
                                                    </div>
                                                </button>
                                            </div>

                                            {person.notes && (
                                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30 text-sm text-slate-700 dark:text-slate-300">
                                                    <span className="font-bold text-yellow-700 block mb-1">Latest Note:</span>
                                                    {person.notes}
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <Button onClick={() => openEditAssignment(person)} variant="outline" size="sm" className="flex-1">
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit Details
                                                </Button>
                                                <Button onClick={() => handleDeleteAssignment(person.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Note Editor */}
            <Dialog open={isEditNoteOpen} onOpenChange={setIsEditNoteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Notes</DialogTitle>
                        <DialogDescription>
                            Add details about your interaction with {editingAssignment?.visitor_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Called them today. They are doing well..."
                            className="min-h-[150px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditNoteOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveNote}>Save Note</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Assignment Dialog */}
            <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Edit Assignment" : "Add New Person"}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? "Update the details below" : "Add someone new to your follow-up list"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium">Name *</label>
                            <Input
                                value={assignmentForm.visitor_name}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, visitor_name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                value={assignmentForm.phone_number}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, phone_number: e.target.value })}
                                placeholder="089 123 4567"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Visit Date</label>
                            <Input
                                type="date"
                                value={assignmentForm.visit_date}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, visit_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Invited By</label>
                            <Input
                                value={assignmentForm.invited_by}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, invited_by: e.target.value })}
                                placeholder="Social Media"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea
                                value={assignmentForm.notes}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                                placeholder="Add any notes..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAssignment} disabled={!assignmentForm.visitor_name}>
                            {isEditing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
