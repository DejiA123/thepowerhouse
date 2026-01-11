
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
    Users,
    Calendar,
    MapPin,
    ClipboardCheck,
    AlertCircle,
    Armchair,
    UserPlus,
    Clock,
    CheckCircle2,
    Settings,
    Plus
} from 'lucide-react';

const UsheringPage = () => {
    // Mock Data for Rotas
    const [upcomingServices, setUpcomingServices] = useState([
        { id: 1, date: "Sun, Aug 16", event: "Consecration Service", team_lead: "Head Usher A", status: "Ready", volunteers: 12, required: 15 },
        { id: 2, date: "Sun, Aug 23", event: "Sunday Service", team_lead: "Usher B", status: "Filling", volunteers: 8, required: 10 },
    ]);

    // Mock Data for Seating Sections
    const [seatingSections, setSeatingSections] = useState([
        { id: "main", name: "Main Sanctuary", capacity: 500, filled: 342, status: "Open" },
        { id: "overflow", name: "Overflow Room", capacity: 200, filled: 0, status: "Standby" },
        { id: "vip", name: "VIP / Dignitaries", capacity: 50, filled: 12, status: "Reserved" },
    ]);

    // Headcount State
    const [currentHeadcount, setCurrentHeadcount] = useState(354);

    return (
        <div className="container mx-auto pb-24 md:pb-12 px-4 pt-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-600 hover:bg-purple-700">Ushering Department</Badge>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active Service</Badge>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Excellence in <span className="text-purple-600">Service</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                        "I would rather be a doorkeeper in the house of my God..." - Psalm 84:10
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                        <Calendar className="w-4 h-4" /> View Rota
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                        <ClipboardCheck className="w-4 h-4" /> Service Check-in
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50">
                    <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 mb-3">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{currentHeadcount}</div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Headcount</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/50">
                    <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 mb-3">
                            <Armchair className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">68%</div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Capacity Full</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/50">
                    <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 mb-3">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">12 / 15</div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Volunteers On Duty</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/50">
                    <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 mb-3">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">Good</div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Flow Status</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="seating">Seating & Control</TabsTrigger>
                    <TabsTrigger value="rota">Rota & Team</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Next Service Summary</CardTitle>
                                    <CardDescription>Sunday, Aug 16 • Consecration Service</CardDescription>
                                </div>
                                <Badge variant="outline" className="text-purple-600 border-purple-200">Major Event</Badge>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Call Time</p>
                                            <p className="text-xs text-slate-500">For briefing and prayer</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-lg">08:30 AM</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Expected Attendance</p>
                                            <p className="text-xs text-slate-500">Based on RSVP</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-lg">~650</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-orange-400" />
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Special Protocols</p>
                                            <p className="text-xs text-slate-500">VIP seating in Front Row</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-blue-600">View Brief</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Team Announcements</CardTitle>
                                <CardDescription>Latest updates for the Ushering unit</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border-l-4 border-purple-500 pl-4 py-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Uniform Update</p>
                                    <p className="text-xs text-slate-500 mt-1">For the Consecration service, all ushers are required to wear the new ceremonial sashes. Please collect yours from the vestry by Wednesday.</p>
                                    <p className="text-[10px] text-slate-400 mt-2">Posted 2 days ago by Head Usher</p>
                                </div>
                                <div className="border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Training Session</p>
                                    <p className="text-xs text-slate-500 mt-1">Refresher course on evacuation protocols scheduled for next Saturday at 10 AM. Mandatory for all team leads.</p>
                                    <p className="text-[10px] text-slate-400 mt-2">Posted 5 days ago</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* SEATING & CONTROL TAB */}
                <TabsContent value="seating" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="md:col-span-2">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Live Seating Dashboard</CardTitle>
                                        <CardDescription>Monitor section capacity and flow</CardDescription>
                                    </div>
                                    <Button size="sm" onClick={() => setCurrentHeadcount(c => c + 1)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                        <Plus className="w-4 h-4" /> Add Count
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-3">
                                    {seatingSections.map(section => (
                                        <div key={section.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-200">{section.name}</h3>
                                                <Badge variant={section.status === 'Open' ? 'default' : section.status === 'Reserved' ? 'secondary' : 'outline'} className={section.status === 'Open' ? 'bg-green-500' : ''}>
                                                    {section.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-end gap-2 mb-3 relative z-10">
                                                <span className="text-4xl font-black text-slate-900 dark:text-white">{section.filled}</span>
                                                <span className="text-sm text-slate-500 font-medium mb-1">/ {section.capacity}</span>
                                            </div>
                                            <Progress value={(section.filled / section.capacity) * 100} className="h-2 mb-2" />
                                            <p className="text-xs text-slate-400 text-right">
                                                {Math.round((section.filled / section.capacity) * 100)}% Full
                                            </p>

                                            {/* Action Overlay */}
                                            <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 gap-2">
                                                <Button size="sm" variant="outline" className="w-32">Close Section</Button>
                                                <Button size="sm" variant="outline" className="w-32">Update Count</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Incident Log</CardTitle>
                                <CardDescription>Report incidents or special requirements</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Input placeholder="Subject (e.g., Medical Assist, Lost Item)" />
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Describe the incident..."
                                    />
                                    <Button className="w-full">Log Ticket</Button>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="text-sm font-bold mb-2">Recent Logs</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 text-sm">
                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
                                            <div>
                                                <p className="font-medium">Medical Assistance Required</p>
                                                <p className="text-slate-500 text-xs">Main Sanctuary, Row F. Handled by First Aid.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Task Assignment</CardTitle>
                                <CardDescription>Key duties for today's service</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {[
                                        { task: "Main Entrance Greeters", assignees: ["Sarah", "Mike"], done: true },
                                        { task: "Sanctuary Seating", assignees: ["David", "Jessica", "Tom"], done: false },
                                        { task: "Offering Bags Prep", assignees: ["Admin"], done: true },
                                        { task: "Overflow Setup", assignees: ["Team B"], done: false },
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${item.done ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'}`}>
                                                    {item.done && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <span className={item.done ? "line-through text-slate-400" : "font-medium"}>{item.task}</span>
                                            </div>
                                            <div className="flex -space-x-2">
                                                {item.assignees.map((person, idx) => (
                                                    <div key={idx} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-bold">
                                                        {person[0]}
                                                    </div>
                                                ))}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ROTA TAB */}
                <TabsContent value="rota">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Rotas</CardTitle>
                            <CardDescription>Schedule and volunteer requirements</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
                                        <tr>
                                            <th className="p-4 font-bold text-slate-500">Date/Event</th>
                                            <th className="p-4 font-bold text-slate-500">Team Lead</th>
                                            <th className="p-4 font-bold text-slate-500">Staffing</th>
                                            <th className="p-4 font-bold text-slate-500">Status</th>
                                            <th className="p-4 font-bold text-slate-500">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {upcomingServices.map(service => (
                                            <tr key={service.id}>
                                                <td className="p-4">
                                                    <div className="font-bold">{service.date}</div>
                                                    <div className="text-xs text-slate-500">{service.event}</div>
                                                </td>
                                                <td className="p-4">{service.team_lead}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={(service.volunteers / service.required) * 100} className="w-20 h-2" />
                                                        <span className="text-xs font-mono">{service.volunteers}/{service.required}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant={service.status === "Ready" ? "default" : "secondary"}>
                                                        {service.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <Button size="sm" variant="ghost">Manage</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default UsheringPage;
