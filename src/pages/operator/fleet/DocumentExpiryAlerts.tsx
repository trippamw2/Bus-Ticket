import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, AlertTriangle, Calendar, Bus, CheckCircle, Clock, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Bus {
  id: string;
  plate_number: string;
}

interface BusDocument {
  id: string;
  bus_id: string;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'road_permit', label: 'Road Permit' },
  { value: 'fitness_certificate', label: 'Fitness Certificate' },
  { value: 'registration', label: 'Registration' },
  { value: 'other', label: 'Other' },
];

const DocumentExpiryAlerts = () => {
  const { operator } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [documents, setDocuments] = useState<BusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [docForm, setDocForm] = useState({
    document_type: "",
    document_number: "",
    issue_date: "",
    expiry_date: "",
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
      // Get buses for this operator
      const { data: busesData } = await supabase
        .from("buses")
        .select("id, plate_number")
        .eq("operator_id", operator?.id);
      setBuses(busesData || []);

      const busIds = busesData?.map(b => b.id) || [];
      
      if (busIds.length > 0) {
        // Get all documents for operator's buses
        const { data: docsData } = await supabase
          .from("bus_documents")
          .select("*")
          .in("bus_id", busIds)
          .order("expiry_date", { ascending: true });
        setDocuments(docsData || []);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expDate = new Date(expiryDate);
    const today = new Date();
    const days = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "unknown", label: "No Date", variant: "secondary" as const, color: "" };
    
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return { status: "unknown", label: "Unknown", variant: "secondary" as const, color: "" };
    
    if (days < 0) return { status: "expired", label: "Expired", variant: "destructive" as const, color: "bg-red-100" };
    if (days <= 7) return { status: "critical", label: `${days} days - Critical`, variant: "destructive" as const, color: "bg-red-50" };
    if (days <= 30) return { status: "warning", label: `${days} days - Warning`, variant: "outline" as const, color: "bg-amber-50" };
    if (days <= 60) return { status: "notice", label: `${days} days - Notice`, variant: "secondary" as const, color: "bg-yellow-50" };
    return { status: "valid", label: `${days} days`, variant: "default" as const, color: "" };
  };

  const getBusPlate = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus?.plate_number || "Unknown";
  };

  const handleSaveDocument = async () => {
    if (!selectedBusId || !docForm.document_type || !docForm.expiry_date) {
      toast.error("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("bus_documents").insert({
        bus_id: selectedBusId,
        document_type: docForm.document_type,
        document_number: docForm.document_number || null,
        issue_date: docForm.issue_date || null,
        expiry_date: docForm.expiry_date,
      });

      toast.success("Document added");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to add document");
    }
    setSaving(false);
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    
    try {
      await supabase.from("bus_documents").delete().eq("id", docId);
      toast.success("Document deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const resetForm = () => {
    setSelectedBusId("");
    setDocForm({ document_type: "", document_number: "", issue_date: "", expiry_date: "" });
  };

  const expiredDocs = documents.filter(d => getDaysUntilExpiry(d.expiry_date) !== null && getDaysUntilExpiry(d.expiry_date)! < 0);
  const criticalDocs = documents.filter(d => {
    const days = getDaysUntilExpiry(d.expiry_date);
    return days !== null && days >= 0 && days <= 30;
  });
  const validDocs = documents.filter(d => {
    const days = getDaysUntilExpiry(d.expiry_date);
    return days === null || days > 30;
  });

  const getFilteredDocuments = () => {
    switch (activeTab) {
      case "expired": return expiredDocs;
      case "critical": return criticalDocs;
      case "valid": return validDocs;
      default: return documents;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Document Expiry Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor bus document expiry dates and renewals
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{expiredDocs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{criticalDocs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Valid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{validDocs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expiredDocs.length})</TabsTrigger>
          <TabsTrigger value="critical">Expiring Soon ({criticalDocs.length})</TabsTrigger>
          <TabsTrigger value="valid">Valid ({validDocs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all" && "All Documents"}
                {activeTab === "expired" && "Expired Documents"}
                {activeTab === "critical" && "Documents Expiring Soon"}
                {activeTab === "valid" && "Valid Documents"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : getFilteredDocuments().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No documents found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bus</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Document Number</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredDocuments().map((doc) => {
                      const statusInfo = getExpiryStatus(doc.expiry_date);
                      return (
                        <TableRow key={doc.id} className={statusInfo.color}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Bus className="h-4 w-4 text-muted-foreground" />
                              {getBusPlate(doc.bus_id)}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {DOCUMENT_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type}
                          </TableCell>
                          <TableCell className="font-mono">{doc.document_number || "-"}</TableCell>
                          <TableCell>{doc.issue_date || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {doc.expiry_date || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Add Document Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bus Document</DialogTitle>
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
                      {bus.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docForm.document_type} onValueChange={(v) => setDocForm({ ...docForm, document_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input
                placeholder="Document number"
                value={docForm.document_number}
                onChange={(e) => setDocForm({ ...docForm, document_number: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={docForm.issue_date}
                  onChange={(e) => setDocForm({ ...docForm, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={docForm.expiry_date}
                  onChange={(e) => setDocForm({ ...docForm, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleSaveDocument}
              className="w-full"
              disabled={saving || !selectedBusId || !docForm.document_type || !docForm.expiry_date}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentExpiryAlerts;
