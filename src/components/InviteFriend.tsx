import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Share2, Copy, Mail, MessageSquare, Facebook, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface InviteFriendProps {
  onBack: () => void;
}

export const InviteFriend = ({ onBack }: InviteFriendProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");

  // Generate referral link with user ID
  const referralLink = `https://biblereader.app/join?ref=${user?.id || 'guest'}`;
  
  const inviteMessage = `Hey! I've been using this amazing Bible reading app and thought you'd love it too. It has audio Bible, notes, highlights, and so much more. Join me here: ${referralLink}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const shareViaEmail = () => {
    const subject = "Join me on this amazing Bible reading app!";
    const body = encodeURIComponent(inviteMessage);
    window.open(`mailto:${emailInput}?subject=${subject}&body=${body}`);
  };

  const shareViaSMS = () => {
    const body = encodeURIComponent(inviteMessage);
    window.open(`sms:?body=${body}`);
  };

  const shareViaFacebook = () => {
    const url = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent("Check out this amazing Bible reading app!");
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
  };

  const shareViaWebAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bible Reading App',
          text: 'Check out this amazing Bible reading app!',
          url: referralLink,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Invite Friends</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Invitation Message */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Share2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Share the Word</h2>
            <p className="text-muted-foreground">
              Invite your friends and family to join you in studying God's Word together.
            </p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Your Referral Link</h3>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(referralLink)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Share Options */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Quick Share</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={shareViaWebAPI} className="h-16 flex flex-col gap-2">
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </Button>
            <Button variant="outline" onClick={shareViaSMS} className="h-16 flex flex-col gap-2">
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">Text Message</span>
            </Button>
            <Button variant="outline" onClick={shareViaFacebook} className="h-16 flex flex-col gap-2">
              <Facebook className="w-5 h-5" />
              <span className="text-sm">Facebook</span>
            </Button>
            <Button variant="outline" onClick={shareViaTwitter} className="h-16 flex flex-col gap-2">
              <Twitter className="w-5 h-5" />
              <span className="text-sm">Twitter</span>
            </Button>
          </div>
        </div>

        {/* Email Invitation */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Send Email Invitation</h3>
          <div className="space-y-3">
            <Input
              placeholder="Enter friend's email address"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <Button onClick={shareViaEmail} disabled={!emailInput} className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Send Email Invitation
            </Button>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Why They'll Love It</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-foreground">Audio Bible</p>
                <p className="text-sm text-muted-foreground">Listen to any chapter with customizable settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-foreground">Notes & Highlights</p>
                <p className="text-sm text-muted-foreground">Take notes and highlight verses for personal study</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-foreground">Multiple Translations</p>
                <p className="text-sm text-muted-foreground">Access various Bible translations in one app</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-foreground">Community Features</p>
                <p className="text-sm text-muted-foreground">Join groups and share insights with others</p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Message */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Your Invitation Message:</h4>
          <p className="text-sm text-muted-foreground italic">"{inviteMessage}"</p>
        </div>
      </div>
    </div>
  );
};