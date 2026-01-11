
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Heart,
    Map,
    Users,
    Trophy,
    Target,
    BookOpen,
    MessageCircle,
    Share2,
    Plus,
    Flame
} from 'lucide-react';
import { toast } from 'sonner';

const EvangelismPage = () => {
    const [soulsSaved, setSoulsSaved] = useState(124);
    const [targetSouls, setTargetSouls] = useState(200);

    const handleAddSoul = () => {
        setSoulsSaved(prev => prev + 1);
        toast.success("Hallelujah! Another soul added to the Kingdom!");
    };

    return (
        <div className="container mx-auto pb-24 md:pb-12 px-4 pt-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-red-600 hover:bg-red-700">Evangelism Department</Badge>
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Operation Andrew</Badge>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Go Ye Into <span className="text-red-600">The World</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                        "He that winneth souls is wise." - Proverbs 11:30
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleAddSoul} className="bg-red-600 hover:bg-red-700 gap-2 shadow-lg shadow-red-600/20">
                        <Plus className="w-5 h-5" /> Log New Convert
                    </Button>
                </div>
            </div>

            {/* Impact Dashboard */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-red-600 to-rose-700 text-white border-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Heart className="w-24 h-24" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium opacity-90">Souls Won (YTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-black mb-2 tracking-tight">{soulsSaved}</div>
                        <Progress value={(soulsSaved / targetSouls) * 100} className="h-2 bg-black/20" indicatorClassName="bg-white" />
                        <p className="text-xs mt-2 opacity-80 font-medium">Target: {targetSouls} Souls</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500">Outreaches</CardTitle>
                        <Map className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-slate-500">+2 this month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Soul Winners</CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">45</div>
                        <p className="text-xs text-slate-500">Active this week</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500">Retention Rate</CardTitle>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">76%</div>
                        <p className="text-xs text-slate-500">Converted to members</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="outreach" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-8">
                    <TabsTrigger value="outreach">Outreach Plans</TabsTrigger>
                    <TabsTrigger value="followup">Calculators</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                </TabsList>

                {/* OUTREACH PLANS TAB */}
                <TabsContent value="outreach" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Upcoming Outreaches</CardTitle>
                                <CardDescription>Strategic locations and dates</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        { place: "City Centre Mall", date: "Sat, Jul 12", type: "Street Evangelism", status: "Confirmed" },
                                        { place: "University Campus", date: "Fri, Jul 18", type: "Student Outreach", status: "Planning" },
                                        { place: "Local Park", date: "Sun, Jul 20", type: "Picnic Evangelism", status: "Tentative" },
                                    ].map((event, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full text-red-600 mt-1">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{event.place}</h4>
                                                    <p className="text-xs text-slate-500">{event.date} • {event.type}</p>
                                                </div>
                                            </div>
                                            <Badge variant={event.status === "Confirmed" ? "default" : "secondary"}>
                                                {event.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full border-dashed gap-2">
                                        <Plus className="w-4 h-4" /> Propose New Location
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Target Areas Map</CardTitle>
                                <CardDescription>Areas of focus for this quarter</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                                {/* Placeholder for Map */}
                                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Dublin_OpenStreetMap.png/640px-Dublin_OpenStreetMap.png')] bg-cover bg-center grayscale" />
                                <div className="relative text-center p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl shadow-lg max-w-xs">
                                    <Map className="w-8 h-8 mx-auto text-red-600 mb-2" />
                                    <h4 className="font-bold">Zone A: City Centre</h4>
                                    <p className="text-xs text-slate-500 mb-4">High priority zone due to foot traffic.</p>
                                    <Button size="sm">View Detailed Map</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* FOLLOW UP / CALCULATORS TAB - Simplified for now */}
                <TabsContent value="followup">
                    <Card>
                        <CardHeader>
                            <CardTitle>Follow-Up Manager</CardTitle>
                            <CardDescription>Track new converts journey</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="font-medium text-slate-600">Convert Tracker Module</h3>
                                <p className="text-sm text-slate-400 mb-4">This module will track the "First Timer" to "Member" pipeline.</p>
                                <Button>Launch Tracker</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* RESOURCES TAB */}
                <TabsContent value="resources" className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { title: "The Roman Road", type: "Script", desc: "Classic scripture path for salvation." },
                            { title: "Bridge to Life", type: "Illustration", desc: "Visual diagram for explaining the gospel." },
                            { title: "3-Minute Testimony", type: "Guide", desc: "How to share your story effectively." },
                            { title: "Apologetics 101", type: "Course", desc: "Answering tough questions." },
                        ].map((resource, i) => (
                            <Card key={i} className="cursor-pointer hover:border-red-200 hover:shadow-md transition-all">
                                <CardContent className="p-6">
                                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center mb-4">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold mb-1">{resource.title}</h3>
                                    <Badge variant="secondary" className="mb-2 text-[10px]">{resource.type}</Badge>
                                    <p className="text-sm text-slate-500">{resource.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default EvangelismPage;
