import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Route as RouteIcon, Ban, CheckCircle, Calendar, DollarSign, History } from "lucide-react";

interface RouteRow {
  id: string;
  origin: string;
  destination: string;
  one_way_price: number;
  return_price: number;
  status: string;
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
}

interface PriceHistory {
  id: string;
  route_id: string;
  old_price: number | null;
  new_price: number | null;
  price_type: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

const MALAWI_CITIES = ["Blantyre", "Lilongwe", "Mzuzu", "Karonga", "Zomba", "Mangochi", "Salima", "Nkhotakota", "Dedza", "Kasungu"];

const RouteManagement = () => {
  const { operator } = useAuth();
  const [activeTab, setActiveTab] = useState('routes');
  
  // Routes state
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<RouteRow | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [oneWay, setOneWay] = useState("");
  const [returnPrice, setReturnPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Seasonal pricing state
  const [seasonalPricing, setSeasonalPricing] = useState<SeasonalPricing[]>([]);
  const [seasonalDialogOpen, setSeasonalDialogOpen] = useState(false);
  const [selectedRouteForSeason, setSelectedRouteForSeason] = useState("");
  const [seasonForm, setSeasonForm] = useState({ season_name: '', start_date: '', end_date: '', price_modifier: '', is_percentage: true });

  // Price history state
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [selectedRouteForHistory, setSelectedRouteForHistory] = useState("");

  useEffect(() => {
    if (operator) {
      fetchRoutes();
      fetchSeasonalPricing();
    }
  }, [operator, operator?.id]);

  useEffect(() => {
    if (selectedRouteForHistory) {
      fetchPriceHistory(selectedRouteForHistory);
    }
  }, [selectedRouteForHistory]);

  const fetchRoutes = async () => {
    if (!operator) return;
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });
    if (!error) setRoutes(data || []);
    setLoading(false);
  };

  const fetchSeasonalPricing = async () => {
    if (!operator) return;
    // Get route IDs for this operator first
    const { data: operatorRoutes } = await supabase.from('routes').select('id').eq('operator_id', operator.id);
    const routeIds = operatorRoutes?.map(r => r.id) || [];
    if (routeIds.length === 0) {
      setSeasonalPricing([]);
      return;
    }
    const { data } = await supabase
      .from('seasonal_pricing')
      .select('*')
      .in('route_id', routeIds)
      .order('created_at', { ascending: false });
    setSeasonalPricing(data || []);
  };

  const fetchPriceHistory = async (routeId: string) => {
    const { data } = await supabase
      .from("route_price_history")
      .select("*")
      .eq("route_id", routeId)
      .order("created_at", { ascending: false })
      .limit(20);
    setPriceHistory(data || []);
  };

  // Route operations
  const openAdd = () => { setEditRoute(null); setOrigin(""); setDestination(""); setOneWay(""); setReturnPrice(""); setDialogOpen(true); };
  const openEdit = (r: RouteRow) => { setEditRoute(r); setOrigin(r.origin); setDestination(r.destination); setOneWay(String(r.one_way_price)); setReturnPrice(String(r.return_price)); setDialogOpen(true); };
  
  const handleSave = async () => {
    if (!operator || !origin || !destination || !oneWay || !returnPrice) return;
    if (origin === destination) { toast.error("Origin and destination must be different"); return; }
    
    const oldPrice = editRoute ? editRoute.one_way_price : null;
    const newPrice = Number(oneWay);
    
    setSaving(true);
    try {
      const payload = { origin, destination, one_way_price: newPrice, return_price: Number(returnPrice) };
      
      if (editRoute) {
        await supabase.from("routes").update(payload).eq("id", editRoute.id);
        
        // Log price change
        if (oldPrice !== newPrice) {
          await supabase.from("route_price_history").insert({
            route_id: editRoute.id,
            old_price: oldPrice,
            new_price: newPrice,
            price_type: 'one_way',
            reason: 'Price update',
          });
        }
        toast.success("Route updated");
      } else {
        const { data: newRoute } = await supabase.from("routes").insert({ ...payload, operator_id: operator.id }).select().single();
        if (newRoute) {
          await supabase.from("route_price_history").insert({
            route_id: newRoute.id,
            old_price: null,
            new_price: newPrice,
            price_type: 'one_way',
            reason: 'Route created',
          });
        }
        toast.success("Route added");
      }
    } catch (e) { toast.error("Failed to save"); }
    setSaving(false); setDialogOpen(false); fetchRoutes();
  };

  const toggleStatus = async (r: RouteRow) => {
    const newStatus = r.status === "active" ? "disabled" : "active";
    await supabase.from("routes").update({ status: newStatus }).eq("id", r.id);
    toast.success(`Route ${newStatus === "active" ? "activated" : "disabled"}`);
    fetchRoutes();
  };

  // Seasonal pricing operations
  const openAddSeasonal = (routeId?: string) => { setSelectedRouteForSeason(routeId || ''); setSeasonForm({ season_name: '', start_date: '', end_date: '', price_modifier: '', is_percentage: true }); setSeasonalDialogOpen(true); };
  
  const handleSaveSeasonal = async () => {
    if (!selectedRouteForSeason || !seasonForm.season_name || !seasonForm.start_date || !seasonForm.end_date || !seasonForm.price_modifier) return;
    try {
      await supabase.from("seasonal_pricing").insert({
        route_id: selectedRouteForSeason,
        season_name: seasonForm.season_name,
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date,
        price_modifier: Number(seasonForm.price_modifier),
        is_percentage: seasonForm.is_percentage,
      });
      toast.success("Seasonal pricing added");
    } catch (e) { toast.error("Failed to save"); }
    setSeasonalDialogOpen(false); fetchSeasonalPricing();
  };

  const toggleSeasonalActive = async (sp: SeasonalPricing) => {
    await supabase.from("seasonal_pricing").update({ is_active: !sp.is_active }).eq("id", sp.id);
    fetchSeasonalPricing();
  };

  const formatCurrency = (amount: number) => `MWK ${Number(amount).toLocaleString()}`;

  const getStatusBadge = (status: string) => (
    <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Route Management</h1>
          <p className="text-sm text-muted-foreground">Configure routes, pricing, and seasonal adjustments</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Route</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="routes">Routes ({routes.length})</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Pricing</TabsTrigger>
          <TabsTrigger value="history">Price History</TabsTrigger>
        </TabsList>

        {/* Routes Tab */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><RouteIcon className="h-5 w-5" /> Your Routes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
              routes.length === 0 ? <div className="text-center py-8 text-muted-foreground">No routes configured</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Origin</TableHead><TableHead>Destination</TableHead><TableHead>One-Way</TableHead><TableHead>Return</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {routes.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.origin}</TableCell>
                      <TableCell>{r.destination}</TableCell>
                      <TableCell>{formatCurrency(r.one_way_price)}</TableCell>
                      <TableCell>{formatCurrency(r.return_price)}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openAddSeasonal(r.id)}><Calendar className="h-4 w-4" title="Add seasonal pricing" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedRouteForHistory(r.id); setActiveTab('history'); }}><History className="h-4 w-4" title="View price history" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus(r)}>{r.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Pricing Tab */}
        <TabsContent value="seasonal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Seasonal Pricing</CardTitle>
              <Button onClick={() => openAddSeasonal()}><Plus className="mr-2 h-4 w-4" />Add Season</Button>
            </CardHeader>
            <CardContent>
              {seasonalPricing.length === 0 ? <div className="text-center py-8 text-muted-foreground">No seasonal pricing configured</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Route</TableHead><TableHead>Season</TableHead><TableHead>Period</TableHead><TableHead>Modifier</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {seasonalPricing.map(sp => {
                    const route = routes.find(r => r.id === sp.route_id);
                    return (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium">{route ? `${route.origin} → ${route.destination}` : 'Unknown'}</TableCell>
                      <TableCell>{sp.season_name}</TableCell>
                      <TableCell>{sp.start_date} to {sp.end_date}</TableCell>
                      <TableCell>{sp.is_percentage ? `${sp.price_modifier}%` : `MWK ${sp.price_modifier}`}</TableCell>
                      <TableCell>{getStatusBadge(sp.is_active ? 'active' : 'inactive')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => toggleSeasonalActive(sp)}>{sp.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</Button>
                      </TableCell>
                    </TableRow>);
                  })}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Price History</CardTitle>
              <Select value={selectedRouteForHistory} onValueChange={setSelectedRouteForHistory}>
                <SelectTrigger className="w-[300px] mt-4"><SelectValue placeholder="Select a route" /></SelectTrigger>
                <SelectContent>{routes.map(r => <SelectItem key={r.id} value={r.id}>{r.origin} → {r.destination}</SelectItem>)}</SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!selectedRouteForHistory ? <div className="text-center py-8 text-muted-foreground">Select a route to view price history</div> :
              priceHistory.length === 0 ? <div className="text-center py-8 text-muted-foreground">No price history for this route</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Old Price</TableHead><TableHead>New Price</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {priceHistory.map(ph => (
                    <TableRow key={ph.id}>
                      <TableCell>{new Date(ph.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{ph.price_type.replace('_', ' ')}</TableCell>
                      <TableCell>{ph.old_price ? formatCurrency(ph.old_price) : '-'}</TableCell>
                      <TableCell className="font-medium">{ph.new_price ? formatCurrency(ph.new_price) : '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{ph.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Route Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRoute ? "Edit Route" : "Add New Route"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Origin</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger>
                <SelectContent>{MALAWI_CITIES.filter(c => c !== destination).map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>{MALAWI_CITIES.filter(c => c !== origin).map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>One-Way Price (MWK)</Label><Input type="number" value={oneWay} onChange={e => setOneWay(e.target.value)} placeholder="15000" /></div>
              <div className="space-y-2"><Label>Return Price (MWK)</Label><Input type="number" value={returnPrice} onChange={e => setReturnPrice(e.target.value)} placeholder="25000" /></div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving || !origin || !destination}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editRoute ? "Update" : "Add"} Route</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seasonal Pricing Dialog */}
      <Dialog open={seasonalDialogOpen} onOpenChange={setSeasonalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Seasonal Pricing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedRouteForSeason} onValueChange={setSelectedRouteForSeason}>
              <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
              <SelectContent>{routes.map(r => <SelectItem key={r.id} value={r.id}>{r.origin} → {r.destination}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Season name (e.g., Holiday Season)" value={seasonForm.season_name} onChange={e => setSeasonForm({...seasonForm, season_name: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={seasonForm.start_date} onChange={e => setSeasonForm({...seasonForm, start_date: e.target.value})} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={seasonForm.end_date} onChange={e => setSeasonForm({...seasonForm, end_date: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Price Modifier</Label><Input type="number" value={seasonForm.price_modifier} onChange={e => setSeasonForm({...seasonForm, price_modifier: e.target.value})} placeholder="10" /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={seasonForm.is_percentage ? 'percentage' : 'fixed'} onValueChange={v => setSeasonForm({...seasonForm, is_percentage: v === 'percentage'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveSeasonal} className="w-full" disabled={!selectedRouteForSeason || !seasonForm.season_name}>Add Seasonal Pricing</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteManagement;
