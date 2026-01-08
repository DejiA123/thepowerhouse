import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Target, Users, Heart, TrendingUp, Gift, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const BuildingCampaignPage = () => {
    const navigate = useNavigate();

    // Campaign progress (these can be updated dynamically in the future)
    const goal = 1000000; // $1,000,000
    const raised = 450000; // $450,000
    const progress = (raised / goal) * 100;

    const vision = [
        {
            icon: Building2,
            title: "Expanded Worship Space",
            description: "A larger sanctuary to accommodate our growing congregation and create an inspiring worship environment.",
            color: "from-blue-500 to-blue-600"
        },
        {
            icon: Users,
            title: "Community Rooms",
            description: "Dedicated spaces for small groups, youth ministry, and children's programs to flourish.",
            color: "from-purple-500 to-purple-600"
        },
        {
            icon: Heart,
            title: "Outreach Center",
            description: "A hub to serve our community through food banks, counseling services, and support programs.",
            color: "from-pink-500 to-pink-600"
        },
        {
            icon: Sparkles,
            title: "Modern Facilities",
            description: "State-of-the-art audio/visual equipment and accessible facilities for everyone.",
            color: "from-green-500 to-green-600"
        }
    ];

    const milestones = [
        { amount: 250000, label: "Land Secured", achieved: true },
        { amount: 500000, label: "Permits Approved", achieved: false },
        { amount: 750000, label: "Construction Begins", achieved: false },
        { amount: 1000000, label: "Building Complete", achieved: false }
    ];

    const givingWays = [
        {
            title: "One-Time Gift",
            description: "Make a single donation of any amount to support the campaign.",
            icon: Gift,
            action: "Give Once"
        },
        {
            title: "Monthly Pledge",
            description: "Commit to a recurring monthly gift to help us reach our goal steadily.",
            icon: TrendingUp,
            action: "Set Up Pledge"
        },
        {
            title: "Special Event",
            description: "Participate in fundraising events and activities throughout the year.",
            icon: Sparkles,
            action: "View Events"
        }
    ];

    const faqs = [
        {
            question: "Why do we need a new building?",
            answer: "Our current facility can no longer accommodate our growing congregation and expanding ministries. A new building will allow us to better serve our community and fulfill God's vision for our church."
        },
        {
            question: "How will the funds be used?",
            answer: "All donations go directly toward construction costs, including land acquisition, permits, materials, labor, and equipment. We maintain full transparency with regular financial updates."
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-20 lg:pb-4">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 text-white px-4 py-16 md:py-24">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                    <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
                        Building for the Future
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                        Together We Build God's House 🏛️
                    </h1>

                    <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
                        Join us in creating a space where lives are transformed, communities are strengthened, and God's love is shared.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-in fade-in slide-in-from-top-10 duration-700 delay-300">
                        <Button
                            size="lg"
                            className="bg-white text-purple-600 hover:bg-white/90 font-bold px-8 py-6 text-lg rounded-full shadow-xl transition-transform hover:scale-105"
                            onClick={() => navigate("/give")}
                        >
                            Give Now
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 font-bold px-8 py-6 text-lg rounded-full transition-all hover:scale-105"
                        >
                            Learn More
                        </Button>
                    </div>
                </div>
            </div>



            {/* Vision Section */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            The Vision
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            More than just walls and rooms—we're building a place where lives are changed and communities are transformed.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {vision.map((item, index) => (
                            <Card
                                key={index}
                                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50"
                            >
                                <CardContent className="p-6">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                        <item.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ways to Give Section */}
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                        Ways to Give
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Every contribution, big or small, brings us closer to our goal.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {givingWays.map((way, index) => (
                        <Card
                            key={index}
                            className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 cursor-pointer"
                            onClick={() => navigate("/give")}
                        >
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <way.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{way.title}</h3>
                                <p className="text-muted-foreground mb-4">{way.description}</p>
                                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-full">
                                    {way.action}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 py-16">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Get answers to common questions about the campaign.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <Card key={index} className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-bold mb-2 text-primary">{faq.question}</h3>
                                    <p className="text-muted-foreground">{faq.answer}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 text-white px-4 py-16">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h2 className="text-3xl md:text-4xl font-bold">
                        Be Part of Something Bigger
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Your generosity today will impact generations to come. Join us in building a house for God's glory!
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button
                            size="lg"
                            className="bg-white text-purple-600 hover:bg-white/90 font-bold px-10 py-6 text-lg rounded-full shadow-xl transition-transform hover:scale-105"
                            onClick={() => navigate("/give")}
                        >
                            Give Now
                            <Heart className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 font-bold px-10 py-6 text-lg rounded-full transition-all hover:scale-105"
                            onClick={() => navigate("/")}
                        >
                            Back to Home
                        </Button>
                    </div>

                    <div className="pt-8 border-t border-white/20 mt-8">
                        <p className="text-sm text-white/70">
                            For questions about the building campaign, please contact us at{" "}
                            <a href="mailto:contact.thepowerhouse@gmail.com" className="underline hover:text-white">
                                contact.thepowerhouse@gmail.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildingCampaignPage;
