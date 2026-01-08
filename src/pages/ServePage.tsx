import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Users, Camera, Heart, Baby, HandHeart, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ServePage = () => {
    const navigate = useNavigate();

    const ministries = [
        {
            icon: Music,
            title: "Worship Team",
            description: "Use your musical gifts to lead others in worship. We're looking for vocalists, instrumentalists, and tech team members.",
            skills: ["Singing", "Instruments", "Sound/Lights"],
            commitment: "Weekly rehearsals + Sunday service",
            color: "from-purple-500 to-pink-500",
            gradient: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
        },
        {
            icon: Users,
            title: "Welcome Team",
            description: "Be the first smile people see! Serve as a greeter, usher, or parking attendant to make everyone feel at home.",
            skills: ["Friendly personality", "Hospitality", "Organization"],
            commitment: "One Sunday per month",
            color: "from-blue-500 to-cyan-500",
            gradient: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20"
        },
        {
            icon: Camera,
            title: "Media Team",
            description: "Capture moments and create content that inspires. Join our photography, videography, or graphic design team.",
            skills: ["Photography", "Video editing", "Graphics"],
            commitment: "Flexible schedule",
            color: "from-orange-500 to-red-500",
            gradient: "bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20"
        },
        {
            icon: Heart,
            title: "Youth Ministry",
            description: "Impact the next generation! Mentor teenagers, lead small groups, and help them grow in their faith.",
            skills: ["Mentorship", "Teaching", "Patience"],
            commitment: "Weekly meetings",
            color: "from-green-500 to-emerald-500",
            gradient: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
        },
        {
            icon: Baby,
            title: "Children's Ministry",
            description: "Create a fun, safe environment where kids can learn about God's love through engaging activities and lessons.",
            skills: ["Working with kids", "Creativity", "Energy"],
            commitment: "One Sunday per month",
            color: "from-yellow-500 to-orange-500",
            gradient: "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20"
        },
        {
            icon: HandHeart,
            title: "Outreach & Community",
            description: "Make a difference in our community! Participate in serving the homeless, community events, and local partnerships.",
            skills: ["Compassion", "Servant heart", "Teamwork"],
            commitment: "Monthly events",
            color: "from-teal-500 to-blue-500",
            gradient: "bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950/20 dark:to-blue-950/20"
        },
        {
            icon: Lightbulb,
            title: "Prayer Team",
            description: "Stand in the gap for others! Join our intercessory prayer team and pray for church members and community needs.",
            skills: ["Prayer", "Compassion", "Confidentiality"],
            commitment: "Weekly prayer meetings",
            color: "from-indigo-500 to-purple-500",
            gradient: "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20"
        },
        {
            icon: Sparkles,
            title: "Special Events",
            description: "Help plan and execute church events, conferences, and celebrations that bring the community together.",
            skills: ["Planning", "Coordination", "Creativity"],
            commitment: "Event-based",
            color: "from-pink-500 to-rose-500",
            gradient: "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20"
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-20 lg:pb-4">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-teal-600 to-blue-600 text-white px-4 py-16 md:py-24">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                    <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
                        Make a Difference
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                        Discover Your Purpose Through Serving 🌟
                    </h1>

                    <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
                        Everyone has unique gifts and talents. Find where you can make an impact and grow in your faith.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-in fade-in slide-in-from-top-10 duration-700 delay-300">
                        <Button
                            size="lg"
                            className="bg-white text-teal-600 hover:bg-white/90 font-bold px-8 py-6 text-lg rounded-full shadow-xl transition-transform hover:scale-105"
                            onClick={() => navigate("/groups")}
                        >
                            Get Started
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-teal-600 font-bold px-8 py-6 text-lg rounded-full transition-all hover:scale-105"
                            onClick={() => navigate("/groups")}
                        >
                            View All Ministries
                        </Button>
                    </div>
                </div>
            </div>

            {/* Why Serve Section */}
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                        Why Serve?
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        Serving isn't just about giving—it's about growing, connecting, and discovering your God-given purpose.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Heart className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Grow Your Faith</h3>
                                <p className="text-muted-foreground">Serving deepens your relationship with God and strengthens your spiritual walk.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Build Community</h3>
                                <p className="text-muted-foreground">Connect with others and build meaningful relationships that last.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Make an Impact</h3>
                                <p className="text-muted-foreground">Use your gifts to change lives and make a lasting difference.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Ministry Opportunities */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Find Your Ministry
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Explore our ministry opportunities and find where your gifts can shine.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                        {ministries.map((ministry, index) => (
                            <Card
                                key={index}
                                className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 overflow-hidden"
                            >
                                <div className={`h-2 ${ministry.gradient}`}></div>
                                <CardContent className="p-6">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ministry.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                        <ministry.icon className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{ministry.title}</h3>
                                    <p className="text-muted-foreground mb-4">{ministry.description}</p>

                                    <div className="space-y-2 mb-4 text-sm">
                                        <div>
                                            <span className="font-semibold text-primary">Skills:</span>
                                            <span className="ml-2 text-muted-foreground">{ministry.skills.join(", ")}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-primary">Commitment:</span>
                                            <span className="ml-2 text-muted-foreground">{ministry.commitment}</span>
                                        </div>
                                    </div>

                                    <Button
                                        className={`w-full bg-gradient-to-r ${ministry.color} hover:opacity-90 text-white font-semibold rounded-full`}
                                        onClick={() => navigate("/follow-up")}
                                    >
                                        I'm Interested
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-green-600 to-teal-600 text-white px-4 py-16">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h2 className="text-3xl md:text-4xl font-bold">
                        Ready to Make a Difference?
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Don't wait to start using your gifts! Take the first step today and join a ministry team.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button
                            size="lg"
                            className="bg-white text-teal-600 hover:bg-white/90 font-bold px-10 py-6 text-lg rounded-full shadow-xl transition-transform hover:scale-105"
                            onClick={() => navigate("/groups")}
                        >
                            Sign Me Up!
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-teal-600 font-bold px-10 py-6 text-lg rounded-full transition-all hover:scale-105"
                            onClick={() => navigate("/")}
                        >
                            Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServePage;
