import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronLeft, Search, Book, Volume2, Users, Settings, MessageCircle, Mail } from "lucide-react";

interface HelpCenterProps {
  onBack: () => void;
  onChatSupport: () => void;
}

export const HelpCenter = ({ onBack, onChatSupport }: HelpCenterProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const helpSections = [
    {
      id: "bible",
      title: "Bible Reading",
      icon: <Book className="w-5 h-5" />,
      items: [
        {
          question: "How do I change Bible translations?",
          answer: "Tap the translation button (e.g., 'KJV') at the top of the Bible reader to see all available translations. Select your preferred version from the list."
        },
        {
          question: "How do I search for specific verses?",
          answer: "Use the search icon in the Bible reader toolbar. Type keywords, phrases, or specific references like 'John 3:16' to find relevant verses."
        },
        {
          question: "How do I take notes on verses?",
          answer: "Tap the notes icon in the Bible reader, or long-press on any verse to add a note. Your notes are automatically saved and synced."
        },
        {
          question: "How do I highlight verses?",
          answer: "Long-press or click on any verse to bring up the highlight menu. Choose from different colors to organize your highlights."
        }
      ]
    },
    {
      id: "audio",
      title: "Audio Features",
      icon: <Volume2 className="w-5 h-5" />,
      items: [
        {
          question: "How do I play audio for Bible chapters?",
          answer: "Tap the play button in the Bible reader. You can adjust audio speed, pitch, and enable auto-play for continuous listening."
        },
        {
          question: "Can I adjust audio settings?",
          answer: "Yes! Go to Bible Settings to adjust audio pitch, speed, and enable features like auto-play next chapter."
        },
        {
          question: "Why isn't audio working on my phone?",
          answer: "Make sure your device volume is up and try restarting the app. For iPhones, audio settings are optimized automatically."
        }
      ]
    },
    {
      id: "account",
      title: "Account & Settings",
      icon: <Settings className="w-5 h-5" />,
      items: [
        {
          question: "How do I change my profile information?",
          answer: "Go to Account Settings from the user menu. You can update your name, email, and other profile details."
        },
        {
          question: "How do I change the app theme?",
          answer: "Access Theme & Appearance settings to switch between light, dark, or system themes. You can also adjust accessibility settings."
        },
        {
          question: "How do I manage notifications?",
          answer: "Go to Notification Settings to control what notifications you receive and how they're delivered."
        },
        {
          question: "How do I delete my account?",
          answer: "In Account Settings, scroll down to find the 'Delete Account' option. This action cannot be undone."
        }
      ]
    },
    {
      id: "social",
      title: "Community & Sharing",
      icon: <Users className="w-5 h-5" />,
      items: [
        {
          question: "How do I join group chats?",
          answer: "Navigate to the Groups section to see available groups. You may need an invite code for some private groups."
        },
        {
          question: "How do I share verses with friends?",
          answer: "Long-press on any verse and select the share option. You can share via text, email, or social media."
        },
        {
          question: "How do I manage my privacy settings?",
          answer: "Go to Privacy Settings to control who can see your profile, reading activity, and other personal information."
        }
      ]
    }
  ];

  const filteredSections = helpSections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Help Center</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onChatSupport} className="h-20 flex flex-col gap-2">
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm">Chat Support</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col gap-2">
            <Mail className="w-6 h-6" />
            <span className="text-sm">Email Support</span>
          </Button>
        </div>

        {/* Help Topics */}
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4">
            {filteredSections.map((section) => (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  {section.icon}
                  <span>{section.title}</span>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, index) => (
                    <AccordionItem key={index} value={`${section.id}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Contact Information */}
        <div className="space-y-3 pt-6 border-t border-border">
          <h3 className="font-semibold text-foreground">Still need help?</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>📧 Email: support@biblereader.app</p>
            <p>📱 Phone: +1 (555) 123-4567</p>
            <p>🕒 Support Hours: Monday-Friday, 9 AM - 5 PM EST</p>
          </div>
        </div>
      </div>
    </div>
  );
};