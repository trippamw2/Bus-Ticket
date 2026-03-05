import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Calendar, TrendingUp, TrendingDown, Plus, History, Clock } from "lucide-react";
import { toast } from "sonner";

interface Route {
  id: string;
  origin: string;
  destination: string;
  one_way_price: number;
  return_price: number;
}

interface PriceHistoryRecord {
  id: string;
  route_id: string;
  old_price: number | null;
  new_price: number | null;
  price_type: string | null;
  changed_by: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

interface SeasonalPricing {
  id: string;
  route_id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  price_modifier: number;
  is_percentage: boolean;
  is_active: boolean;
  apply_to: string;
  notes: string | null;
}

const PriceHistory = () => {
  const { operator } = useAuth();
  const [activeTab, setActiveTab] = useState("history");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [seasonalPricing, setSeasonalPricing] = useState<SeasonalPricing[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [priceChangeDialogOpen, setPriceChangeDialogOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [saving, setSaving] = useState(false);

  // Seasonal pricing form
  const [seasonForm, setSeasonForm] = useState({
    season_name: "",
    start_date: "",
    end_date: "",
    price_modifier: "",
    is_percentage: true,
    apply_to: "both",
    notes: "",
  });

  // Price change form
  const [priceForm, setPriceForm] = useState({
    price_type: "one_way",
    new_price: "",
    reason: "",
  });

  useEffect(() => {
    if (operator) {
      fetchData();
    }
  }, [operator, operator?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch routes
      const { data: routesData } = await supabase
        .from("routes")
        .select("id, origin, destination, one_way_price, return_price")
        .eq("operator_id", operator?.id)
        .order("origin");
      setRoutes(routesData || []);

      // Fetch price history
      const { data: historyData } = await supabase
        .from("route_price_history")
        .select("*")
        .eq("operator_id", operator?.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setPriceHistory(historyData || []);

      // Fetch seasonal pricing
      const { data: seasonalData } = await supabase
        .from("seasonal_pricing")
        .select("*")
        .eq("operator_id", operator?.id)
        .order("start_date", { ascending: false });
      setSeasonalPricing(seasonalData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleAddSeasonalPricing = async () => {
    if (!selectedRouteId || !seasonForm.season_name || !seasonForm.start_date || !seasonForm.end_date || !seasonForm.price_modifier) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("seasonal_pricing").insert({
        route_id: selectedRouteId,
        operator_id: operator?.id,
        season_name: seasonForm.season_name,
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date,
        price_modifier: parseFloat(seasonForm.price_modifier),
        is_percentage: seasonForm.is_percentage,
        apply_to: seasonForm.apply_to,
        notes: seasonForm.notes || null,
        is_active: true,
      });
      toast.success("Seasonal pricing added");
      setSeasonDialogOpen(false);
      setSeasonForm({ season_name: "", start_date: "", end_date: "", price_modifier: "", is_percentage: true, apply_to: "both", notes: "" });
      setSelectedRouteId("");
      fetchData();
    } catch (error) {
      toast.error("Failed to add seasonal pricing");
    }
    setSaving(false);
  };

  const handleRecordPriceChange = async () => {
    if (!selectedRouteId || !priceForm.new_price) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const route = routes.find(r => r.id === selectedRouteId);
      const oldPrice = priceForm.price_type === "one_way" ? route?.one_way_price : route?.return_price;
      const newPrice = parseFloat(priceForm.new_price);

      // Update the route price
      await supabase
        .from("routes")
        .update(priceForm.price_type === "one_way" ? { one_way_price: newPrice } : { return_price: newPrice })
        .eq("id", selectedRouteId);

      // Record in price history
      await supabase.from("route_price_history").insert({
        route_id: selectedRouteId,
        operator_id: operator?.id,
        old_price: oldPrice,
        new_price: newPrice,
        price_type: priceForm.price_type,
        changed_by: "operator",
        reason: priceForm.reason || null,
      });

      toast.success(`Price updated from MWK ${oldPrice} to MWK ${newPrice}`);
      setPriceChangeDialogOpen(false);
      setPriceForm({ price_type: "one_way", new_price: "", reason: "" });
      setSelectedRouteId("");
      fetchData();
    } catch (error) {
      toast.error("Failed to update price");
    }
    setSaving(false);
  };

  const toggleSeasonActive = async (season: SeasonalPricing) => {
    await supabase
      .from("seasonal_pricing")
      .update({ is_active: !season.is_active })
      .eq("id", season.id);
    toast.success(season.is_active ? "Season deactivated" : "Season activated");
    fetchData();
  };

  const deleteSeason = async (seasonId: string) => {
    if (!confirm("Delete this seasonal pricing?")) return;
    await supabase.from("seasonal_pricing").delete().eq("id", seasonId);
    toast.success("Seasonal pricing deleted");
    fetchData();
  };

  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? `${route.origin} → ${route.destination}` : "Unknown Route";
  };

  const isSeasonActive = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    return now >= startDate && now <= endDate;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Price Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track price history and manage seasonal pricing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPriceChangeDialogOpen(true)}>
            <TrendingDown className="mr-2 h-4 w-4" />
            Change Price
          </Button>
          <Button onClick={() => setSeasonDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Season
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Price History
          </TabsTrigger>
          <TabsTrigger value="seasons">
            <Calendar className="mr-2 h-4 w-4" />
            Seasonal Pricing
          </TabsTrigger>
        </TabsList>

        {/* Price History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Price Change History</CardTitle>
              <CardDescription>Record of all price changes for your routes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : priceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No price history yet. Use "Change Price" to update route prices.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Old Price</TableHead>
                      <TableHead>New Price</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((record) => {
                      const change = record.old_price && record.new_price ? record.new_price - record.old_price : 0;
                      const percentChange = record.old_price && record.old_price > 0 ? ((change / record.old_price) * 100).toFixed(1) : "0";
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{getRouteName(record.route_id)}</TableCell>
                          <TableCell className="capitalize">{record.price_type || "-"}</TableCell>
                          <TableCell>MWK {record.old_price || "-"}</TableCell>
                          <TableCell>MWK {record.new_price || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {change >= 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
                              <span className={change >= 0 ? "text-red-500" : "text-green-500"}>
                                {change >= 0 ? "+" : ""}{change} ({percentChange}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{record.reason || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {new Date(record.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Pricing Tab */}
        <TabsContent value="seasons">
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Pricing</CardTitle>
              <CardDescription>Set special prices for holidays, peak seasons, or special events</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : seasonalPricing.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No seasonal pricing configured. Use "Add Season" to create one.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Modifier</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonalPricing.map((season) => {
                      const isCurrentlyActive = isSeasonActive(season.start_date, season.end_date);
                      return (
                        <TableRow key={season.id}>
                          <TableCell className="font-medium">{season.season_name}</TableCell>
                          <TableCell>{getRouteName(season.route_id)}</TableCell>
                          <TableCell><div className="text-sm">{season.start_date} to {season.end_date}</div></TableCell>
                          <TableCell>
                            <Badge variant={season.is_percentage ? "default" : "secondary"}>
                              {season.is_percentage ? `${season.price_modifier}%` : `MWK ${season.price_modifier}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{season.apply_to}</TableCell>
                          <TableCell>
                            {isCurrentlyActive ? <Badge className="bg-green-500">Active</Badge> : season.is_active ? <Badge variant="outline">Scheduled</Badge> : <Badge variant="secondary">Inactive</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => toggleSeasonActive(season)}>{season.is_active ? "Disable" : "Enable"}</Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSeason(season.id)}>Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Seasonal Pricing Dialog */}
      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Seasonal Pricing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>{route.origin} → {route.destination} (MWK {route.one_way_price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Season Name</Label>
              <Input placeholder="e.g. Christmas Peak" value={seasonForm.season_name} onChange={(e) => setSeasonForm({ ...seasonForm, season_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={seasonForm.start_date} onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={seasonForm.end_date} onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price Modifier</Label><Input type="number" placeholder="e.g. 20" value={seasonForm.price_modifier} onChange={(e) => setSeasonForm({ ...seasonForm, price_modifier: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={seasonForm.is_percentage ? "percentage" : "fixed"} onValueChange={(v) => setSeasonForm({ ...seasonForm, is_percentage: v === "percentage" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (MWK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Apply To</Label>
              <Select value={seasonForm.apply_to} onValueChange={(v) => setSeasonForm({ ...seasonForm, apply_to: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="one_way">One Way</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSeasonalPricing} className="w-full" disabled={saving || !selectedRouteId || !seasonForm.season_name}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Seasonal Pricing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Change Dialog */}
      <Dialog open={priceChangeDialogOpen} onOpenChange={setPriceChangeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Price Change</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>{route.origin} → {route.destination} (MWK {route.one_way_price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRouteId && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Current Prices</div>
                <div className="flex gap-4 mt-1">
                  <span>One Way: <strong>MWK {routes.find(r => r.id === selectedRouteId)?.one_way_price}</strong></span>
                  <span>Return: <strong>MWK {routes.find(r => r.id === selectedRouteId)?.return_price}</strong></span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Price Type</Label>
              <Select value={priceForm.price_type} onValueChange={(v) => setPriceForm({ ...priceForm, price_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>New Price (MWK)</Label><Input type="number" placeholder="Enter new price" value={priceForm.new_price} onChange={(e) => setPriceForm({ ...priceForm, new_price: e.target.value })} /></div>
            <div className="space-y-2"><Label>Reason (optional)</Label><Input placeholder="e.g. Fuel price increase" value={priceForm.reason} onChange={(e) => setPriceForm({ ...priceForm, reason: e.target.value })} /></div>
            <Button onClick={handleRecordPriceChange} className="w-full" disabled={saving || !selectedRouteId || !priceForm.new_price}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Price
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceHistory;
