import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Social Media Icons as SVG components
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.244c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.781c-.49 0-.928-.175-1.297-.49-.368-.315-.49-.753-.49-1.243 0-.49.122-.928.49-1.243.369-.315.807-.49 1.297-.49s.928.175 1.297.49c.368.315.49.753.49 1.243 0 .49-.122.928-.49 1.243-.369.315-.807.49-1.297.49zm-7.83 12.447c2.026 0 3.744-.753 5.153-2.026 1.409-1.273 2.162-3.038 2.162-5.153 0-2.115-.753-3.88-2.162-5.153-1.409-1.273-3.127-2.026-5.153-2.026s-3.744.753-5.153 2.026C1.409 9.107.656 10.872.656 13.047c0 2.115.753 3.88 2.162 5.153 1.409 1.273 3.127 2.026 5.153 2.026z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const SocialMediaPage = () => {
  const navigate = useNavigate();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const socialMediaHandles = [
    {
      name: "TikTok",
      handle: "@thepowerhouseintl",
      url: "https://www.tiktok.com/@thepowerhouseintl",
      icon: <TikTokIcon />,
      color: "bg-black text-white",
      description: "Follow us for short-form videos, worship moments, and daily inspiration"
    },
    {
      name: "Facebook",
      handle: "@ThePowerHouseWorldWide",
      url: "https://www.facebook.com/ThePowerHouseWorldWide",
      icon: <FacebookIcon />,
      color: "bg-blue-600 text-white",
      description: "Connect with our community, see event updates, and share in fellowship"
    },
    {
      name: "Instagram",
      handle: "@thepowerhouseintl",
      url: "https://www.instagram.com/thepowerhouseintl",
      icon: <InstagramIcon />,
      color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
      description: "Visual stories of our ministry, worship moments, and community life"
    },
    {
      name: "YouTube",
      handle: "@thepowerhouseintl",
      url: "https://www.youtube.com/@thepowerhouseintl",
      icon: null,
      color: "bg-red-600 text-white",
      description: "Watch full sermons, worship sessions, and ministry updates"
    },
    {
      name: "X (Twitter)",
      handle: "@ThePowerHIntl",
      url: "https://twitter.com/ThePowerHIntl",
      icon: <TwitterIcon />,
      color: "bg-black text-white",
      description: "Quick updates, scripture quotes, and ministry highlights"
    }
  ];

  const handleSocialMediaClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Connect With Us</h1>
          <p className="text-white/90">
            Follow The Power House International on social media for daily inspiration, 
            ministry updates, and to stay connected with our community.
          </p>
        </div>
      </div>

      {/* Social Media Cards */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {socialMediaHandles.map((platform, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/50"
              onClick={() => handleSocialMediaClick(platform.url)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${platform.color}`}>
                      {platform.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{platform.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {platform.handle}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {platform.description}
                </p>
                <Button 
                  className={`w-full ${platform.color} hover:opacity-90 transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSocialMediaClick(platform.url);
                  }}
                >
                  Follow on {platform.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <Card className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-primary/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-3">
              Stay Connected With Our Community
            </h3>
            <p className="text-muted-foreground mb-4">
              Follow us on all platforms to never miss an update, sermon, or moment of worship. 
              Join thousands of believers who are part of The Power House family online.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {socialMediaHandles.map((platform, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSocialMediaClick(platform.url)}
                  className="text-xs"
                >
                  <span className="mr-1">{platform.icon}</span>
                  {platform.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              What You'll Find On Our Social Media
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-2">📖 Daily Content</h4>
                <ul className="space-y-1">
                  <li>• Scripture verses and devotionals</li>
                  <li>• Prayer prompts and spiritual guidance</li>
                  <li>• Ministry highlights and testimonies</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">🎵 Worship & Events</h4>
                <ul className="space-y-1">
                  <li>• Live worship sessions and clips</li>
                  <li>• Event announcements and updates</li>
                  <li>• Behind-the-scenes ministry moments</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialMediaPage; 