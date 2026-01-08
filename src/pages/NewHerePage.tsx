import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Users, Heart, MessageCircle, Calendar, ArrowRight, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NewHerePage = () => {
    const navigate = useNavigate();

    const whatToExpect = [
        {
            icon: Clock,
            title: "Service Times",
            description: "Join us Sundays at 10:30 AM for an inspiring worship experience that typically lasts 2 hours.",
            color: "from-blue-500 to-blue-600"
        },
        {
            icon: Users,
            title: "Welcoming Environment",
            description: "Come as you are! We're a friendly community that celebrates diversity and makes everyone feel at home.",
            color: "from-purple-500 to-purple-600"
        },
        {
            icon: Heart,
            title: "What Happens",
            description: "Expect powerful worship, inspiring messages, and genuine connections with people who care.",
            color: "from-pink-500 to-pink-600"
        },
        {
            icon: MessageCircle,
            title: "Get Help Anytime",
            description: "Our welcome team and ushers are here to help. Don't hesitate to ask questions or request assistance.",
            color: "from-green-500 to-green-600"
        }
    ];

    const nextSteps = [
        {
            title: "Fill Out a Connect Card",
            description: "Let us know you're here! We'd love to get to know you better.",
            action: "Get Started",
            onClick: () => navigate("/follow-up")
        },
        {
            title: "Meet Our Team",
            description: "Connect with our pastors and ministry leaders who are excited to meet you.",
            action: "Learn More",
            onClick: () => navigate("/")
        },
        {
            title: "Join a Small Group",
            description: "Find community and grow in faith with others in a life group.",
            action: "Find a Group",
            onClick: () => navigate("/groups")
        },
        {
            title: "Follow Us Online",
            description: "Stay connected through social media and never miss an update.",
            action: "Connect",
            onClick: () => navigate("/social-media")
        }
    ];

    const faqs = [
        {
            question: "Where do I park?",
            answer: "We have ample parking available at the church. Our parking team will be happy to direct you to available spots."
        },
        {
            question: "What about my kids?",
            answer: "We have engaging programs for children of all ages during service. Our children's ministry team provides a safe, fun environment."
        },
        {
            question: "How long is the service?",
            answer: "Services typically last about 2 hours, including worship, message, and community time. You're welcome to stay as long as you'd like!"
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-20 lg:pb-4">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white px-4 py-16 md:py-24">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                    <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
                        Welcome to The PowerHouse International
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                        We're So Glad You're Here! 🎉
                    </h1>

                    <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
                        Whether this is your first time or you're just exploring, we want you to feel right at home.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-in fade-in slide-in-from-top-10 duration-700 delay-300">
                        <Button
                            size="lg"
                            className="bg-white text-purple-600 hover:bg-white/90 font-bold px-8 py-6 text-lg rounded-full shadow-xl transition-transform hover:scale-105"
                            onClick={() => navigate("/follow-up")}
                        >
                            Connect With Us
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 font-bold px-8 py-6 text-lg rounded-full transition-all hover:scale-105"
                            onClick={() => navigate("/services")}
                        >
                            View Service Times
                        </Button>
                    </div>
                </div>
            </div>

            {/* What to Expect Section */}
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        What to Expect
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Your first visit should be exciting, not stressful. Here's what you can look forward to.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {whatToExpect.map((item, index) => (
                        <Card
                            key={index}
                            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 overflow-hidden"
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

            {/* Next Steps Section */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Your Next Steps
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Ready to dive in? Here are some great ways to get connected and involved.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {nextSteps.map((step, index) => (
                            <Card
                                key={index}
                                className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-purple-500/50 cursor-pointer overflow-hidden"
                                onClick={step.onClick}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-xl font-bold group-hover:text-purple-600 transition-colors">{step.title}</h3>
                                        <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <p className="text-muted-foreground mb-4">{step.description}</p>
                                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-full">
                                        {step.action}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-4xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Got questions? We've got answers!
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

            {/* Contact Section */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white px-4 py-16">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h2 className="text-3xl md:text-4xl font-bold">
                        Still Have Questions?
                    </h2>
                    <p className="text-xl text-white/90">
                        We'd love to hear from you! Reach out anytime.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
                        <a href="mailto:info@thepowerhouseinternational.org" className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl hover:bg-white/30 transition-all">
                            <Mail className="w-5 h-5" />
                            <span className="font-semibold">Email Us</span>
                        </a>
                        <a href="tel:+1234567890" className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl hover:bg-white/30 transition-all">
                            <Phone className="w-5 h-5" />
                            <span className="font-semibold">Call Us</span>
                        </a>
                    </div>

                    <div className="pt-8">
                        <Button
                            size="lg"
                            className="bg-white text-purple-600 hover:bg-white/90 font-bold px-10 py-6 text-lg rounded-full shadow-xl transition-transform hover:scale-105"
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

export default NewHerePage;
