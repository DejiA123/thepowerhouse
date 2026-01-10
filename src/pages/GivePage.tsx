import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Copy, CheckCircle, Heart, Wallet, Shield, Globe, Landmark, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

const GivePage = () => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
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

  const givingTypes = [
    { icon: <Heart className="w-5 h-5" />, title: "Tithes", desc: "10% of our increase" },
    { icon: <Wallet className="w-5 h-5" />, title: "Offerings", desc: "Voluntary giving" },
    { icon: <Globe className="w-5 h-5" />, title: "Missions", desc: "Global impact" },
    { icon: <Shield className="w-5 h-5" />, title: "Seeds", desc: "Investing in faith" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-32">
      {/* Hero Section */}
      <div className="relative h-[300px] md:h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
          style={{ backgroundImage: 'url("/give_hero_bg.png")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
        <div className="relative z-10 text-center px-4 space-y-4 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase drop-shadow-2xl font-outfit">
            Giving <span className="text-blue-400">Generously</span>
          </h1>
          <p className="text-blue-100/90 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
            Your support enables us to build God's kingdom and impact lives globally.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-20 space-y-12">
        {/* Ways to Give Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {givingTypes.map((type, idx) => (
            <div
              key={idx}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-800/50 p-6 rounded-3xl shadow-xl shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {type.icon}
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{type.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{type.desc}</p>
            </div>
          ))}
        </div>

        {/* Bank Details & Instructions */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main Giving Card */}
          <div className="lg:col-span-3">
            <Card className="border-none bg-white dark:bg-slate-900 shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden">
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                    <Landmark className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Bank Details</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Official Church Account for Transfer</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Account Name */}
                  <div className="group">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Name</label>
                      {copiedField === "Account Name" && (
                        <span className="text-[10px] font-bold text-green-500 animate-in fade-in slide-in-from-right-2">Copied!</span>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(bankDetails.accountName, "Account Name")}
                      className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 rounded-2xl transition-all group-hover:shadow-lg group-hover:shadow-blue-500/5"
                    >
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-left">{bankDetails.accountName}</span>
                      <Copy className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    </button>
                  </div>

                  {/* IBAN */}
                  <div className="group">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">IBAN</label>
                      {copiedField === "IBAN" && (
                        <span className="text-[10px] font-bold text-green-500 animate-in fade-in slide-in-from-right-2">Copied!</span>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(bankDetails.iban, "IBAN")}
                      className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 rounded-2xl transition-all group-hover:shadow-lg group-hover:shadow-blue-500/5"
                    >
                      <span className="font-mono font-bold text-lg text-slate-700 dark:text-slate-200 break-all text-left truncate">{bankDetails.iban}</span>
                      <Copy className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* BIC */}
                    <div className="group">
                      <div className="flex justify-between items-center mb-2 px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">BIC</label>
                        {copiedField === "BIC" && (
                          <span className="text-[10px] font-bold text-green-500 animate-in fade-in slide-in-from-right-2">Copied!</span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(bankDetails.bic, "BIC")}
                        className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 rounded-2xl transition-all group-hover:shadow-lg group-hover:shadow-blue-500/5"
                      >
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{bankDetails.bic}</span>
                        <Copy className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                      </button>
                    </div>

                    {/* Bank Name */}
                    <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank</span>
                        <span className="font-bold text-xs text-slate-600 dark:text-slate-300">{bankDetails.bankName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 space-y-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">Transfer Instructions</h3>
              <ul className="space-y-4">
                {[
                  { icon: <CheckCircle className="w-4 h-4" />, text: "Use official details above" },
                  { icon: <Users className="w-4 h-4" />, text: "Include name in reference" },
                  { icon: <div className="w-4 h-4 flex items-center justify-center text-[10px] font-bold border border-white/50 rounded-full italic">i</div>, text: "Specify giving type (Tithe, etc.)" },
                ].map((item, id) => (
                  <li key={id} className="flex items-start gap-3 text-blue-50/80 text-sm font-medium">
                    <span className="mt-0.5 text-blue-200">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-white/10" />
            </div>

            {/* Biblical Inspiration */}
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none text-center space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Heart className="w-24 h-24 text-blue-600" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed relative z-10">
                "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 inline-block px-4">
                <p className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tighter uppercase font-outfit">- 2 Corinthians 9:7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GivePage;
