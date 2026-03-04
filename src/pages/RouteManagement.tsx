import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Loader2 } from "lucide-react";

interface RouteRow {
  id: string;
  origin: string;
  destination: string;
  one_way_price: number;
  return_price: number;
  status: string | null;
}

const RouteManagement = () => {
  const { operator } = useAuth();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<RouteRow | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [oneWay, setOneWay] = useState("");
  const [returnPrice, setReturnPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async () => {
    if (!operator) return;
    const { data } = await supabase
      .from("routes")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });
    setRoutes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRoutes(); }, [operator]);

  const openAdd = () => {
    setEditRoute(null); setOrigin(""); setDestination(""); setOneWay(""); setReturnPrice("");
    setDialogOpen(true);
  };
  const openEdit = (r: RouteRow) => {
    setEditRoute(r); setOrigin(r.origin); setDestination(r.destination);
    setOneWay(String(r.one_way_price)); setReturnPrice(String(r.return_price));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!operator) return;
    setSaving(true);
    const payload = { origin, destination, one_way_price: Number(oneWay), return_price: Number(returnPrice) };
    if (editRoute) {
      await supabase.from("routes").update(payload).eq("id", editRoute.id);
      toast({ title: "Route updated" });
    } else {
      await supabase.from("routes").insert({ ...payload, operator_id: operator.id });
      toast({ title: "Route added" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchRoutes();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Route Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Route</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editRoute ? "Edit Route" : "Add Route"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Kampala" />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Jinja" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>One-Way Price</Label>
                  <Input type="number" value={oneWay} onChange={(e) => setOneWay(e.target.value)} placeholder="15000" />
                </div>
                <div className="space-y-2">
                  <Label>Return Price</Label>
                  <Input type="number" value={returnPrice} onChange={(e) => setReturnPrice(e.target.value)} placeholder="25000" />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving || !origin || !destination || !oneWay || !returnPrice}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editRoute ? "Update" : "Add"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Routes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : routes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No routes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>One-Way</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.origin}</TableCell>
                    <TableCell>{r.destination}</TableCell>
                    <TableCell>{Number(r.one_way_price).toLocaleString()}</TableCell>
                    <TableCell>{Number(r.return_price).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteManagement;
