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
import { Loader2, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus, DollarSign, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";

interface LedgerEntry {
  id: string;
  account_type: string;
  reference_type: string | null;
  reference_id: string | null;
  debit: number;
  credit: number;
  balance_after: number | null;
  description: string | null;
  created_at: string;
  operator_id?: string;
}

interface LedgerSummary {
  total_debits: number;
  total_credits: number;
  net_balance: number;
}

const FinancialLedger = () => {
  const { operator } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LedgerSummary>({
    total_debits: 0,
    total_credits: 0,
    net_balance: 0,
  });
  const [filterType, setFilterType] = useState("all");
  const [searchDesc, setSearchDesc] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    account_type: "expense",
    debit: "",
    credit: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      fetchLedger();
    }
  }, [operator, operator?.id]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("financial_ledger")
        .select("*")
        .eq("operator_id", operator?.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!error && data) {
        setLedgerEntries(data);
        
        // Calculate summary
        const totalDebits = data.reduce((sum, entry) => sum + (entry.debit || 0), 0);
        const totalCredits = data.reduce((sum, entry) => sum + (entry.credit || 0), 0);
        setSummary({
          total_debits: totalDebits,
          total_credits: totalCredits,
          net_balance: totalCredits - totalDebits,
        });
      }
    } catch (error) {
      console.error("Error fetching ledger:", error);
    }
    setLoading(false);
  };

  const handleAddEntry = async () => {
    if (!entryForm.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("financial_ledger").insert({
        operator_id: operator?.id,
        account_type: entryForm.account_type,
        debit: entryForm.debit ? parseFloat(entryForm.debit) : 0,
        credit: entryForm.credit ? parseFloat(entryForm.credit) : 0,
        description: entryForm.description.trim(),
      });
      
      toast.success("Ledger entry added");
      setDialogOpen(false);
      setEntryForm({ account_type: "expense", debit: "", credit: "", description: "" });
      fetchLedger();
    } catch (error) {
      toast.error("Failed to add entry");
    }
    setSaving(false);
  };

  const getFilteredEntries = () => {
    let filtered = ledgerEntries;
    
    if (filterType !== "all") {
      filtered = filtered.filter(entry => entry.account_type === filterType);
    }
    
    if (searchDesc) {
      filtered = filtered.filter(entry => 
        entry.description?.toLowerCase().includes(searchDesc.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredEntries = getFilteredEntries();

  const accountTypes = [
    { value: "revenue", label: "Revenue", icon: ArrowUpRight, color: "text-green-500" },
    { value: "expense", label: "Expense", icon: ArrowDownRight, color: "text-red-500" },
    { value: "commission", label: "Commission", icon: DollarSign, color: "text-blue-500" },
    { value: "settlement", label: "Settlement", icon: Wallet, color: "text-purple-500" },
    { value: "withdrawal", label: "Withdrawal", icon: TrendingDown, color: "text-orange-500" },
    { value: "refund", label: "Refund", icon: TrendingUp, color: "text-amber-500" },
  ];

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find(at => at.value === type);
    const Icon = accountType?.icon || DollarSign;
    return <Icon className={`h-4 w-4 ${accountType?.color || ""}`} />;
  };

  const getAccountBadge = (type: string) => {
    const colors: Record<string, string> = {
      revenue: "bg-green-500",
      expense: "bg-red-500",
      commission: "bg-blue-500",
      settlement: "bg-purple-500",
      withdrawal: "bg-orange-500",
      refund: "bg-amber-500",
    };
    return (
      <Badge className={colors[type] || "bg-gray-500"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Financial Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Track all financial transactions and account movements
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              MWK {summary.total_credits.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              Total Debits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              MWK {summary.total_debits.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${summary.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              MWK {summary.net_balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {accountTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Search by description..."
          value={searchDesc}
          onChange={(e) => setSearchDesc(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {filteredEntries.length} transaction{filteredEntries.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ledger entries yet. Add entries to track your finances.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{getAccountBadge(entry.account_type)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {entry.description || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.reference_type ? (
                        <span className="text-xs">
                          {entry.reference_type}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.debit > 0 ? (
                        <span className="text-red-500">MWK {entry.debit.toLocaleString()}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit > 0 ? (
                        <span className="text-green-500">MWK {entry.credit.toLocaleString()}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      MWK {(entry.credit - entry.debit).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ledger Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={entryForm.account_type}
                onValueChange={(v) => setEntryForm({ ...entryForm, account_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {getAccountIcon(type.value)}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Debit Amount (MWK)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={entryForm.debit}
                  onChange={(e) => setEntryForm({ ...entryForm, debit: e.target.value, credit: "" })}
                />
              </div>
              <div className="space-y-2">
                <Label>Credit Amount (MWK)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={entryForm.credit}
                  onChange={(e) => setEntryForm({ ...entryForm, credit: e.target.value, debit: "" })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Bus fuel, Commission from booking"
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
              />
            </div>

            <Button
              onClick={handleAddEntry}
              className="w-full"
              disabled={saving || (!entryForm.debit && !entryForm.credit)}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialLedger;
