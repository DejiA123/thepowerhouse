
import { Badge } from "@/components/ui/badge";

export interface Rota {
  department: string;
  date: string;
  members: string[];
}

const ServiceRotas = () => {
  const rotas: Rota[] = [
    { department: "Ushering", date: "2025-06-08", members: ["John Doe", "Mary Smith", "Peter Jones"] },
    { department: "Media", date: "2025-06-08", members: ["Mike Tech", "Sarah AV"] },
    { department: "Choir", date: "2025-06-08", members: ["Lead: Sarah Johnson", "25 choir members"] }
  ];

  return (
    <div className="space-y-3">
      {rotas.map((rota, index) => (
        <div key={index} className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{rota.department}</h3>
            <Badge variant="outline">{rota.date}</Badge>
          </div>
          <div className="space-y-1">
            {rota.members.map((member, memberIndex) => (
              <p key={memberIndex} className="text-sm text-muted-foreground">• {member}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceRotas;
