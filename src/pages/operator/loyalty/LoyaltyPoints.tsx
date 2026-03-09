import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Plus, Gift, Star, TrendingUp, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";

interface LoyaltyPoint {
  id: string;
  passenger_phone: string;
  points: number;
  created_at: string;
}

const LoyaltyPoints = () => {
  const { operator } = useAuth();
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [summary, setSummary] = useState({ total_passengers: 0, total_points: 0, average_points: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addPoints, setAddPoints] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (operator) fetchLoyaltyPoints(); }, [operator, operator?.id]);

  const fetchLoyaltyPoints = async () => {
    setLoading(true);
    const { data } = await supabase.from("loyalty_points").select("*").order("points", { ascending: false });
    const points = (data || []) as LoyaltyPoint[];
    setLoyaltyPoints(points);
    const totalPoints = points.reduce((sum, p) => sum + (p.points || 0), 0);
    setSummary({
      total_passengers: points.length,
      total_points: totalPoints,
      average_points: points.length > 0 ? Math.round(totalPoints / points.length) : 0,
    });
    setLoading(false);
  };

  const handleAddPoints = async () => {
    if (!addPhone.trim() || !addPoints.trim()) { toast.error("Enter phone and points"); return; }
    setSaving(true);
    const { data: existing } = await supabase.from("loyalty_points").select("*").eq("passenger_phone", addPhone.trim()).maybeSingle();
    if (existing) {
      await supabase.from("loyalty_points").update({ points: (existing.points || 0) + parseInt(addPoints) }).eq("id", existing.id);
    } else {
      await supabase.from("loyalty_points").insert({ passenger_phone: addPhone.trim(), points: parseInt(addPoints) });
    }
    toast.success(`Added ${addPoints} points`);
    setDialogOpen(false); setAddPhone(""); setAddPoints(""); fetchLoyaltyPoints();
    setSaving(false);
  };

  const filteredPoints = searchPhone ? loyaltyPoints.filter(p => p.passenger_phone?.includes(searchPhone)) : loyaltyPoints;

  const getTierBadge = (points: number) => {
    if (points >= 50) return <Badge className="bg-amber-500">VIP</Badge>;
    if (points >= 25) return <Badge className="bg-blue-500">Gold</Badge>;
    if (points >= 10) return <Badge variant="secondary">Silver</Badge>;
    return <Badge variant="outline">Bronze</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="h-6 w-6" />Loyalty Points</h1><p className="text-sm text-muted-foreground">Track passenger loyalty</p></div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Points</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Passengers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{summary.total_passengers}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Total Points</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{summary.total_points.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gift className="h-4 w-4 text-blue-500" />Average</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{summary.average_points}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by phone..." value={searchPhone} onChange={e => setSearchPhone(e.target.value)} className="pl-10" /></div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Passenger Loyalty</CardTitle><CardDescription>{filteredPoints.length} passengers</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
          filteredPoints.length === 0 ? <div className="text-center py-8 text-muted-foreground">No loyalty data</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Phone</TableHead><TableHead>Points</TableHead><TableHead>Tier</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredPoints.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{p.passenger_phone}</div></TableCell>
                  <TableCell><span className="font-bold text-lg">{p.points}</span></TableCell>
                  <TableCell>{getTierBadge(p.points)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Loyalty Points</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Phone</label><Input placeholder="+265888123456" value={addPhone} onChange={e => setAddPhone(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Points</label><Input type="number" placeholder="100" value={addPoints} onChange={e => setAddPoints(e.target.value)} /></div>
            <Button onClick={handleAddPoints} className="w-full" disabled={saving || !addPhone.trim() || !addPoints.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Points</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyaltyPoints;
