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
import { Plus, Pencil, Ban, CheckCircle, Loader2 } from "lucide-react";

interface BusRow {
  id: string;
  plate_number: string;
  capacity: number;
  status: string | null;
}

const FleetManagement = () => {
  const { operator } = useAuth();
  const { toast } = useToast();
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBus, setEditBus] = useState<BusRow | null>(null);
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchBuses = async () => {
    if (!operator) return;
    const { data } = await supabase
      .from("buses")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });
    setBuses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBuses(); }, [operator]);

  const openAdd = () => { setEditBus(null); setPlate(""); setCapacity(""); setDialogOpen(true); };
  const openEdit = (bus: BusRow) => { setEditBus(bus); setPlate(bus.plate_number); setCapacity(String(bus.capacity)); setDialogOpen(true); };

  const handleSave = async () => {
    if (!operator) return;
    setSaving(true);
    if (editBus) {
      await supabase.from("buses").update({ plate_number: plate, capacity: Number(capacity) }).eq("id", editBus.id);
      toast({ title: "Bus updated" });
    } else {
      await supabase.from("buses").insert({ plate_number: plate, capacity: Number(capacity), operator_id: operator.id });
      toast({ title: "Bus added" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchBuses();
  };

  const toggleStatus = async (bus: BusRow) => {
    const newStatus = bus.status === "active" ? "disabled" : "active";
    await supabase.from("buses").update({ status: newStatus }).eq("id", bus.id);
    toast({ title: `Bus ${newStatus}` });
    fetchBuses();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Bus</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editBus ? "Edit Bus" : "Add Bus"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="UAX 123A" />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="50" />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving || !plate || !capacity}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editBus ? "Update" : "Add"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Buses</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : buses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No buses yet. Add your first bus above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((bus) => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-medium">{bus.plate_number}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={bus.status === "active" ? "default" : "secondary"}>
                        {bus.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(bus)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(bus)}>
                        {bus.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
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

export default FleetManagement;
