import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Phone, MapPin, Clock, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GivePage = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Please copy the details manually",
        variant: "destructive"
      });
    });
  };

  const bankDetails = {
    bankName: "Allied Irish Banks",
    accountName: "The Power House International",
    iban: "IE85 AIBK 93745222068064",
    bic: "AIBKIE2D"
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Give</h1>
        <p className="text-muted-foreground">To give your tithes/offerings:</p>
      </div>

      {/* Bank Transfer Details */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-center">
            <Building className="w-6 h-6 text-primary" />
            <span>Bank Transfer Details</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Use these details to give via bank transfer
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account Name</label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{bankDetails.accountName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.accountName, "Account name")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">IBAN</label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-mono font-bold text-lg">{bankDetails.iban}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.iban, "IBAN")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">BIC</label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-mono font-bold">{bankDetails.bic}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bankDetails.bic, "BIC")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-accent">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Transfer Instructions
              </h4>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li>1. Use the account details above for your bank transfer</li>
                <li>2. Include your name in the transfer reference</li>
                <li>3. Specify donation type (Tithe, Offering, Missions, etc.)</li>
                <li>4. Keep your transfer receipt for your records</li>
                <li>5. Contact us if you need a donation receipt</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Biblical Giving Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Biblical Giving</h3>
          <p className="mb-4 opacity-90">
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
          </p>
          <p className="text-sm opacity-75">- 2 Corinthians 9:7</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GivePage;