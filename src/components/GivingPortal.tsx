
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, CreditCard, Smartphone, DollarSign, FileText } from "lucide-react";

const GivingPortal = () => {
  const [selectedType, setSelectedType] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [testimony, setTestimony] = useState("");
  const [showTestimony, setShowTestimony] = useState(false);

  const givingTypes = [
    { id: "tithe", name: "Tithe", description: "10% of income given to God", icon: "💰" },
    { id: "offering", name: "Offering", description: "Free will offering", icon: "🎁" },
    { id: "firstfruits", name: "First Fruits", description: "First portion of income", icon: "🌾" },
    { id: "building", name: "Building Fund", description: "Church building projects", icon: "🏗️" },
    { id: "missions", name: "Missions", description: "Supporting missionary work", icon: "🌍" }
  ];

  const yearlyGoal = 12000; // €12,000
  const currentGiving = 7800; // €7,800
  const progressPercentage = (currentGiving / yearlyGoal) * 100;

  const paymentMethods = [
    { id: "stripe", name: "Credit/Debit Card", icon: <CreditCard className="w-4 h-4" /> },
    { id: "paypal", name: "PayPal", icon: <Smartphone className="w-4 h-4" /> },
    { id: "applepay", name: "Apple Pay", icon: <Smartphone className="w-4 h-4" /> }
  ];

  const handleGiving = () => {
    if (!selectedType || !amount || !paymentMethod) {
      alert("Please fill in all required fields");
      return;
    }
    
    // In real implementation, this would integrate with Stripe/PayPal
    alert(`Processing €${amount} ${selectedType} payment via ${paymentMethod}`);
  };

  const generateStatement = () => {
    // In real implementation, this would generate a PDF statement
    alert("Generating your annual giving statement...");
  };

  return (
    <div className="space-y-6">
      {/* Giving Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span>Your Giving Journey</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Annual Giving Progress</span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={generateStatement}>
                  <FileText className="w-4 h-4 mr-2" />
                  Statement
                </Button>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-sm">
              <span>€{currentGiving.toLocaleString()}</span>
              <span>€{yearlyGoal.toLocaleString()} goal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round(progressPercentage)}% of your annual giving goal achieved
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Giving Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span>Make a Contribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Giving Types */}
          <div>
            <Label className="text-base font-medium">Type of Giving</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {givingTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <h3 className="font-medium">{type.name}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount (€)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map((quickAmount) => (
              <Button
                key={quickAmount}
                variant="outline"
                onClick={() => setAmount(quickAmount.toString())}
                className="h-12"
              >
                €{quickAmount}
              </Button>
            ))}
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center space-x-3 ${
                    paymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  {method.icon}
                  <span className="font-medium">{method.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Testimony */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="add-testimony"
                checked={showTestimony}
                onChange={(e) => setShowTestimony(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="add-testimony">Add a testimony (optional)</Label>
            </div>
            {showTestimony && (
              <Textarea
                placeholder="Share how God has blessed you or why you're giving..."
                value={testimony}
                onChange={(e) => setTestimony(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleGiving}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
            disabled={!selectedType || !amount || !paymentMethod}
          >
            <Heart className="w-4 h-4 mr-2" />
            Give €{amount || "0"} {selectedType ? `(${givingTypes.find(t => t.id === selectedType)?.name})` : ''}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your donation is secure and encrypted. You'll receive a receipt via email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GivingPortal;
