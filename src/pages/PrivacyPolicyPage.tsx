import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-sm">
            <section>
              <p className="text-muted-foreground mb-4">
                Last Updated: {new Date().toLocaleDateString()}
              </p>
              <p>
                The Power House International ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. YouTube API Services</h2>
              <p className="mb-2">
                <strong>Our App uses YouTube API Services</strong> to display video content from our church's YouTube channel. By using our App, you acknowledge and agree to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>
                  The <a 
                    href="https://www.youtube.com/t/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    YouTube Terms of Service
                  </a>
                </li>
                <li>
                  The <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Privacy Policy
                  </a>
                </li>
              </ul>
              <p className="mt-2">
                When you view YouTube videos through our App, YouTube may collect certain information about your usage, including but not limited to viewing history and device information, in accordance with Google's privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Personal Information</h3>
              <p>We may collect the following personal information:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Name and contact information (email address, phone number)</li>
                <li>Profile information (profile picture, bio)</li>
                <li>Account credentials (encrypted password)</li>
                <li>Church membership details</li>
                <li>Prayer requests and testimonies you submit</li>
                <li>Giving and donation records</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.2 YouTube API Data</h3>
              <p>When you use our App's video features, we access the following data through YouTube API Services:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Public video information (titles, descriptions, thumbnails)</li>
                <li>Channel information from The Power House International</li>
                <li>Video metadata for displaying content in the App</li>
              </ul>
              <p className="mt-2">
                <strong>We do not store, collect, or access your personal YouTube viewing history or account data.</strong> The YouTube API is used solely to display our church's public video content.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.3 Usage Information</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Bible reading progress and preferences</li>
                <li>App usage statistics and interactions</li>
                <li>Device information (type, operating system)</li>
                <li>Log data (IP address, browser type, pages visited)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p>We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>To provide and maintain our services:</strong> Creating and managing your account, processing donations, enabling community features</li>
                <li><strong>To personalize your experience:</strong> Saving Bible reading preferences, tracking reading plans, customizing notifications</li>
                <li><strong>To communicate with you:</strong> Sending announcements, event updates, prayer request responses, and newsletters</li>
                <li><strong>To display YouTube content:</strong> Fetching and showing our church's video sermons and content through YouTube API Services</li>
                <li><strong>To improve our App:</strong> Analyzing usage patterns, fixing bugs, and developing new features</li>
                <li><strong>To ensure security:</strong> Detecting and preventing fraud, unauthorized access, and other illegal activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. How We Share Your Information</h2>
              <p className="mb-2">We may share your information in the following circumstances:</p>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">4.1 Internal Sharing</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>With church staff for pastoral care and ministry purposes</li>
                <li>With department leaders for event coordination and communication</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">4.2 External Sharing</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Service Providers:</strong> We use third-party services including Supabase (database and authentication), YouTube API Services (video content), and payment processors (for donations)</li>
                <li><strong>YouTube/Google:</strong> When you interact with YouTube videos in our App, certain data is shared with Google as per their privacy policies</li>
                <li><strong>Legal Requirements:</strong> If required by law or to protect our rights and safety</li>
              </ul>

              <p className="mt-2">
                <strong>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Cookies and Tracking Technologies</h2>
              <p className="mb-2">
                We and our third-party partners store, access, and collect information on or from your devices using cookies and similar technologies:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for authentication and app functionality</li>
                <li><strong>Preference Cookies:</strong> Store your settings, Bible version preferences, theme choices</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use the App</li>
                <li><strong>YouTube Cookies:</strong> Placed by YouTube when you view embedded videos</li>
              </ul>
              <p className="mt-2">
                You can control cookies through your device settings, but disabling certain cookies may limit App functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Encrypted data transmission (SSL/TLS)</li>
                <li>Secure password storage (hashing and salting)</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>
              <p className="mt-2">
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You can request deletion of your account and personal data at any time through the App settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Privacy Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access and review your personal information</li>
                <li>Correct or update your information</li>
                <li>Delete your account and personal data</li>
                <li>Export your data</li>
                <li>Opt-out of certain data collection and communications</li>
                <li>Revoke access to YouTube API data (by disconnecting your account)</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, please contact us using the information provided below or use the privacy settings within the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
              <p>
                Our App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Information</h2>
              <p className="mb-2">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-2 space-y-1 bg-muted p-4 rounded-lg">
                <p><strong>The Power House International</strong></p>
                <p><strong>Email:</strong> privacy@thepowerhouseintl.org</p>
                <p><strong>Alternative Email:</strong> info@thepowerhouseintl.org</p>
                <p><strong>Phone:</strong> +1 (XXX) XXX-XXXX</p>
                <p><strong>Address:</strong> [Church Physical Address]</p>
              </div>
            </section>

            <section className="border-t pt-6 mt-8">
              <h2 className="text-xl font-semibold mb-3">Specific Disclosures for YouTube API Services</h2>
              <p className="mb-2">
                In compliance with YouTube API Services Terms and Google's requirements:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We use YouTube API Services solely to display our church's public video content</li>
                <li>We do not store, cache, or access any private YouTube user data</li>
                <li>You can revoke our App's access to YouTube data by visiting the <a 
                  href="https://security.google.com/settings/security/permissions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >Google security settings page</a></li>
                <li>Our use of information received from YouTube APIs will adhere to the <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >Google API Services User Data Policy</a>, including the Limited Use requirements</li>
              </ul>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
