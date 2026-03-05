import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Gift, Star, TrendingUp, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";

interface LoyaltyPoint {
  id: string;
  passenger_phone: string;
  points: number;
  created_at: string;
}

interface LoyaltySummary {
  total_passengers: number;
  total_points: number;
  average_points: number;
}

const LoyaltyPoints = () => {
  const { operator } = useAuth();
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [summary, setSummary] = useState<LoyaltySummary>({
    total_passengers: 0,
    total_points: 0,
    average_points: 0,
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addPoints, setAddPoints] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      fetchLoyaltyPoints();
    }
  }, [operator, operator?.id]);

  const fetchLoyaltyPoints = async () => {
    setLoading(true);
    try {
      // First get passenger phones from bookings for this operator
      const { data: bookings } = await supabase
        .from("bookings")
        .select("passenger_phone")
        .eq("operator_id", operator?.id);

      const phoneMap = new Map<string, number>();
      
      if (bookings && bookings.length > 0) {
        // Get unique phones and sum their bookings as "points"
        bookings.forEach((b) => {
          const phone = b.passenger_phone;
          if (phone) {
            phoneMap.set(phone, (phoneMap.get(phone) || 0) + 1);
          }
        });

        // Also check loyalty_points table for any manually assigned points
        const { data: loyaltyData } = await supabase
          .from("loyalty_points")
          .select("*");

        if (loyaltyData && loyaltyData.length > 0) {
          loyaltyData.forEach((lp) => {
            phoneMap.set(lp.passenger_phone, (phoneMap.get(lp.passenger_phone) || 0) + lp.points);
          });
        }

        // Convert to array
        const pointsArray: LoyaltyPoint[] = Array.from(phoneMap.entries()).map(
          ([passenger_phone, points], index) => ({
            id: `temp-${index}`,
            passenger_phone,
            points,
            created_at: new Date().toISOString(),
          })
        );

        // Sort by points descending
        pointsArray.sort((a, b) => b.points - a.points);
        setLoyaltyPoints(pointsArray);

        // Calculate summary
        const totalPoints = pointsArray.reduce((sum, p) => sum + p.points, 0);
        setSummary({
          total_passengers: pointsArray.length,
          total_points: totalPoints,
          average_points: pointsArray.length > 0 ? Math.round(totalPoints / pointsArray.length) : 0,
        });
      } else {
        setLoyaltyPoints([]);
        setSummary({ total_passengers: 0, total_points: 0, average_points: 0 });
      }
    } catch (error) {
      console.error("Error fetching loyalty points:", error);
    }
    setLoading(false);
  };

  const handleAddPoints = async () => {
    if (!addPhone.trim() || !addPoints.trim()) {
      toast.error("Please enter phone number and points");
      return;
    }

    setSaving(true);
    try {
      // Check if passenger already exists
      const { data: existing } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("passenger_phone", addPhone.trim())
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from("loyalty_points")
          .update({ points: existing.points + parseInt(addPoints) })
          .eq("passenger_phone", addPhone.trim());
        toast.success(`Added ${addPoints} points to ${addPhone}`);
      } else {
        // Insert new
        await supabase
          .from("loyalty_points")
          .insert({ passenger_phone: addPhone.trim(), points: parseInt(addPoints) });
        toast.success(`Added ${addPoints} points to new passenger`);
      }

      setDialogOpen(false);
      setAddPhone("");
      setAddPoints("");
      fetchLoyaltyPoints();
    } catch (error) {
      toast.error("Failed to add points");
    }
    setSaving(false);
  };

  const filteredPoints = searchPhone
    ? loyaltyPoints.filter((p) =>
        p.passenger_phone.toLowerCase().includes(searchPhone.toLowerCase())
      )
    : loyaltyPoints;

  const getTierBadge = (points: number) => {
    if (points >= 50) return <Badge className="bg-amber-500">VIP</Badge>;
    if (points >= 25) return <Badge className="bg-blue-500">Gold</Badge>;
    if (points >= 10) return <Badge className="bg-gray-500">Silver</Badge>;
    return <Badge variant="outline">Bronze</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Loyalty Points
          </h1>
          <p className="text-sm text-muted-foreground">
            Track passenger loyalty and reward frequent travelers
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Points
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Total Passengers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total_passengers}</div>
            <p className="text-xs text-muted-foreground">Enrolled in loyalty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total_points.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Points distributed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-blue-500" />
              Average Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.average_points}</div>
            <p className="text-xs text-muted-foreground">Per passenger</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone number..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Passenger Loyalty</CardTitle>
          <CardDescription>
            {filteredPoints.length} passenger{filteredPoints.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredPoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No loyalty points data yet. Passengers earn points when they book trips.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>First Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoints.map((passenger) => (
                  <TableRow key={passenger.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {passenger.passenger_phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-lg">{passenger.points}</span>
                    </TableCell>
                    <TableCell>{getTierBadge(passenger.points)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(passenger.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Points Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Loyalty Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Passenger Phone</label>
              <Input
                placeholder="e.g. +265888123456"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Points to Add</label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={addPoints}
                onChange={(e) => setAddPoints(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddPoints}
              className="w-full"
              disabled={saving || !addPhone.trim() || !addPoints.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Points
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Dialog components (inline to avoid import issues)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default LoyaltyPoints;
