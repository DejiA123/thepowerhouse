import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TermsOfServicePage = () => {
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
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          
          <div className="space-y-6 text-sm">
            <section>
              <p className="text-muted-foreground mb-4">
                Last Updated: {new Date().toLocaleDateString()}
              </p>
              <p>
                Welcome to The Power House International mobile application. By using our app, you agree to be bound by these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using The Power House International app ("the App"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. YouTube Terms of Service</h2>
              <p className="mb-2">
                Our App uses YouTube API Services to provide video content. By using our App, you are agreeing to be bound by the YouTube Terms of Service.
              </p>
              <p>
                <strong>You can review the YouTube Terms of Service at:</strong>{" "}
                <a 
                  href="https://www.youtube.com/t/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://www.youtube.com/t/terms
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Use of Services</h2>
              <p>
                You agree to use the App only for lawful purposes and in accordance with these Terms. You agree not to use the App:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>In any way that violates any applicable national or international law or regulation</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
                <li>To impersonate or attempt to impersonate the church, church employees, another user, or any other person or entity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. User Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
              <p>
                The App and its original content, features, and functionality are and will remain the exclusive property of The Power House International and its licensors.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p>
                In no event shall The Power House International, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="mt-2 space-y-1">
                <p><strong>The Power House International</strong></p>
                <p>Email: contact.thepowerhouse@gmail.com</p>
                <p>Phone: 089 953 4714</p>
                <p>Address: The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit Heights, Galway, H91 958A</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of Ireland, without regard to its conflict of law provisions.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
