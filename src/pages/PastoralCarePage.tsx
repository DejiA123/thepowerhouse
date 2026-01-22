
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    MessageCircle,
    Phone,
    UserCheck,
    Handshake,
    ArrowLeft,
    ChevronRight,
    Shield,
    Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const PastoralCarePage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');

    const services = [
        {
            title: "Spiritual Counseling",
            description: "One-on-one sessions for spiritual guidance, personal growth, and biblical wisdom.",
            icon: <MessageCircle className="w-6 h-6" />,
            color: "from-blue-500 to-indigo-600",
            category: "counseling"
        },
        {
            title: "Prayer Support",
            description: "Need prayer? Our pastoral care team is dedicated to standing in the gap for you.",
            icon: <Handshake className="w-6 h-6" />,
            color: "from-rose-500 to-pink-600",
            category: "prayer"
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 pb-20">
            {/* Premium Hero Section */}
            <div className="relative h-[28rem] md:h-[32rem] overflow-hidden flex items-center justify-center text-center px-4">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 -right-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F8FAFC] dark:to-gray-950"></div>
                </div>

                <div className="relative z-10 max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/groups")}
                        className="mb-8 rounded-full bg-white/50 backdrop-blur-md dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 transition-all border border-white/20"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Ministry Hub
                    </Button>

                    <Badge className="mb-4 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none font-bold text-xs uppercase tracking-widest">
                        Ministry of Love
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gray-900 dark:text-white mb-6 font-outfit leading-[1.1]">
                        Pastoral <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Care</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium leading-relaxed">
                        "Bearing one another's burdens, and so fulfill the law of Christ."
                        <br />
                        <span className="text-sm font-bold opacity-60">— Galatians 6:2</span>
                    </p>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 -mt-16 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map((service, i) => (
                        <Card
                            key={i}
                            className="group border-none shadow-xl shadow-blue-900/5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <CardContent className="p-8">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform`}>
                                    {service.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{service.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {service.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Message from Pastor Section */}
                <div className="mt-16 bg-white dark:bg-gray-900 rounded-[3rem] p-1 shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in duration-1000">
                    <div className="flex flex-col lg:flex-row items-center">
                        <div className="lg:w-1/3 h-80 lg:h-[450px] w-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 z-10"></div>
                            <img
                                src="/pastor-david.jpg"
                                alt="Pastor David Richman"
                                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
                            />
                        </div>
                        <div className="lg:w-2/3 p-10 lg:p-16 space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">Our heart is for your well-being.</h2>
                                <div className="w-16 h-1.5 bg-blue-600 rounded-full"></div>
                            </div>

                            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed italic">
                                "Our Pastoral Care team is committed to walking with you through every season of life—the joyful heights and the difficult valleys. You don't have to carry your burdens alone. We are here to listen, pray, and support you."
                            </p>

                            <div className="flex flex-col sm:flex-row gap-6 pt-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                        <UserCheck className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-black text-gray-400 tracking-widest">Care Director</p>
                                        <p className="font-bold">Pastor David Richman</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-black text-gray-400 tracking-widest">Confidentiality</p>
                                        <p className="font-bold">Safe & Private Sessions</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Calendar className="w-32 h-32" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">Book a Session</h3>
                        <p className="text-blue-100 mb-8 max-w-xs">Schedule a private counseling or prayer session with our pastoral team.</p>
                        <Button size="lg" className="rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 h-12 w-full sm:w-auto">
                            Request Appointment <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <Phone className="w-32 h-32 text-gray-900 dark:text-white" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white uppercase tracking-tight">Need Urgent Care?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs font-semibold">Our emergency prayer list and visit team are available for urgent situations.</p>
                        <Button variant="outline" size="lg" className="rounded-xl border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 font-black px-8 h-12 w-full sm:w-auto transition-all">
                            Contact 24/7 Helpline
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PastoralCarePage;
