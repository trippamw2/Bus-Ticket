import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Bus, Users, Settings, Save } from "lucide-react";
import { toast } from "sonner";

interface Bus {
  id: string;
  plate_number: string;
  capacity: number;
}

interface BusCapacityConfig {
  id: string;
  bus_id: string;
  total_seats: number;
  standing_allowed: boolean;
  updated_at: string;
}

const BusCapacityConfig = () => {
  const { operator } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [configs, setConfigs] = useState<BusCapacityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [configForm, setConfigForm] = useState({
    total_seats: "",
    standing_allowed: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      fetchData();
    }
  }, [operator, operator?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch buses
      const { data: busesData } = await supabase
        .from("buses")
        .select("id, plate_number, capacity")
        .eq("operator_id", operator?.id)
        .order("plate_number");
      setBuses(busesData || []);

      // Fetch capacity configs
      const { data: configsData } = await supabase
        .from("bus_capacity_config")
        .select("*")
        .order("updated_at", { ascending: false });
      setConfigs(configsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const getBusConfig = (busId: string) => {
    return configs.find(c => c.bus_id === busId);
  };

  const handleSaveConfig = async () => {
    if (!selectedBusId || !configForm.total_seats) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const existingConfig = getBusConfig(selectedBusId);

      if (existingConfig) {
        // Update existing config
        await supabase
          .from("bus_capacity_config")
          .update({
            total_seats: parseInt(configForm.total_seats),
            standing_allowed: configForm.standing_allowed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id);
        toast.success("Capacity configuration updated");
      } else {
        // Create new config
        await supabase
          .from("bus_capacity_config")
          .insert({
            bus_id: selectedBusId,
            total_seats: parseInt(configForm.total_seats),
            standing_allowed: configForm.standing_allowed,
          });
        toast.success("Capacity configuration created");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to save configuration");
    }
    setSaving(false);
  };

  const resetForm = () => {
    setSelectedBusId("");
    setConfigForm({ total_seats: "", standing_allowed: false });
  };

  const openEditConfig = (busId: string) => {
    const config = getBusConfig(busId);
    const bus = buses.find(b => b.id === busId);
    setSelectedBusId(busId);
    setConfigForm({
      total_seats: config ? String(config.total_seats) : String(bus?.capacity || ""),
      standing_allowed: config?.standing_allowed || false,
    });
    setDialogOpen(true);
  };

  const getSeatUsage = (busId: string) => {
    const config = getBusConfig(busId);
    const bus = buses.find(b => b.id === busId);
    const total = config?.total_seats || bus?.capacity || 0;
    const booked = Math.floor(Math.random() * total); // This would come from actual bookings
    return { booked: "-", total, available: "-" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Bus Capacity Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure seat capacity and standing capacity for each bus
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Fleet Capacity Settings
          </CardTitle>
          <CardDescription>
            Configure how many seats are available for booking on each bus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : buses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No buses registered. Add buses in Fleet Management first.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bus</TableHead>
                  <TableHead>Base Capacity</TableHead>
                  <TableHead>Configured Seats</TableHead>
                  <TableHead>Standing</TableHead>
                  <TableHead>Effective Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((bus) => {
                  const config = getBusConfig(bus.id);
                  const effectiveCapacity = config?.total_seats || bus.capacity;
                  
                  return (
                    <TableRow key={bus.id}>
                      <TableCell className="font-medium font-mono">
                        {bus.plate_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {bus.capacity} seats
                        </div>
                      </TableCell>
                      <TableCell>
                        {config?.total_seats ? (
                          <Badge variant="outline">{config.total_seats} seats</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {config?.standing_allowed ? (
                          <Badge className="bg-green-500">Allowed</Badge>
                        ) : (
                          <Badge variant="secondary">Not Allowed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="font-bold">{effectiveCapacity}</span>
                          {config?.standing_allowed && (
                            <span className="text-muted-foreground">+ standing</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {config ? (
                          <Badge className="bg-blue-500">Configured</Badge>
                        ) : (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditConfig(bus.id)}>
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Bus Capacity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bus</Label>
              <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.plate_number} (Base: {bus.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBusId && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Base capacity from registration</div>
                <div className="text-lg font-bold">
                  {buses.find(b => b.id === selectedBusId)?.capacity} seats
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Available Seats for Booking</Label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={configForm.total_seats}
                onChange={(e) => setConfigForm({ ...configForm, total_seats: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Number of seats available for passenger booking
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="standing"
                checked={configForm.standing_allowed}
                onCheckedChange={(checked) => 
                  setConfigForm({ ...configForm, standing_allowed: checked as boolean })
                }
              />
              <label
                htmlFor="standing"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Allow standing passengers
              </label>
            </div>

            <Button
              onClick={handleSaveConfig}
              className="w-full"
              disabled={saving || !selectedBusId || !configForm.total_seats}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusCapacityConfig;
