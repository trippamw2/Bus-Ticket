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
}

const FinancialLedger = () => {
  const { operator } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_debits: 0, total_credits: 0, net_balance: 0 });
  const [filterType, setFilterType] = useState("all");
  const [searchDesc, setSearchDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ account_type: "expense", debit: "", credit: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (operator) fetchLedger(); }, [operator, operator?.id]);

  const fetchLedger = async () => {
    setLoading(true);
    // financial_ledger doesn't have operator_id, so we fetch all and filter client-side
    // or fetch all entries (for now, fetch all - in production would need operator_id column)
    const { data } = await supabase.from("financial_ledger").select("*").order("created_at", { ascending: false }).limit(500);
    const entries = data || [];
    setLedgerEntries(entries);
    const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    setSummary({ total_debits: totalDebits, total_credits: totalCredits, net_balance: totalCredits - totalDebits });
    setLoading(false);
  };

  const handleAddEntry = async () => {
    if (!entryForm.description.trim()) { toast.error("Enter a description"); return; }
    setSaving(true);
    await supabase.from("financial_ledger").insert({
      account_type: entryForm.account_type,
      debit: entryForm.debit ? parseFloat(entryForm.debit) : 0,
      credit: entryForm.credit ? parseFloat(entryForm.credit) : 0,
      description: entryForm.description.trim(),
    });
    toast.success("Entry added"); setDialogOpen(false);
    setEntryForm({ account_type: "expense", debit: "", credit: "", description: "" });
    fetchLedger();
    setSaving(false);
  };

  const filteredEntries = ledgerEntries.filter(e => {
    if (filterType !== "all" && e.account_type !== filterType) return false;
    if (searchDesc && !e.description?.toLowerCase().includes(searchDesc.toLowerCase())) return false;
    return true;
  });

  const accountTypes = [
    { value: "revenue", label: "Revenue" },
    { value: "expense", label: "Expense" },
    { value: "commission", label: "Commission" },
    { value: "settlement", label: "Settlement" },
    { value: "withdrawal", label: "Withdrawal" },
    { value: "refund", label: "Refund" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" />Financial Ledger</h1><p className="text-sm text-muted-foreground">Track all financial transactions</p></div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Entry</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500" />Total Credits</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">MWK {summary.total_credits.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-red-500" />Total Debits</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">MWK {summary.total_debits.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" />Net Balance</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${summary.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>MWK {summary.net_balance.toLocaleString()}</div></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Search..." value={searchDesc} onChange={e => setSearchDesc(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle><CardDescription>{filteredEntries.length} transactions</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
          filteredEntries.length === 0 ? <div className="text-center py-8 text-muted-foreground">No entries</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredEntries.map(e => (
                <TableRow key={e.id}>
                  <TableCell><div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(e.created_at).toLocaleDateString()}</div></TableCell>
                  <TableCell><Badge variant="outline">{e.account_type}</Badge></TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{e.description || "-"}</TableCell>
                  <TableCell className="text-right">{e.debit > 0 ? <span className="text-red-500">MWK {e.debit.toLocaleString()}</span> : "-"}</TableCell>
                  <TableCell className="text-right">{e.credit > 0 ? <span className="text-green-500">MWK {e.credit.toLocaleString()}</span> : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Type</Label><Select value={entryForm.account_type} onValueChange={v => setEntryForm({...entryForm, account_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Debit (MWK)</Label><Input type="number" placeholder="0" value={entryForm.debit} onChange={e => setEntryForm({...entryForm, debit: e.target.value, credit: ""})} /></div>
              <div><Label>Credit (MWK)</Label><Input type="number" placeholder="0" value={entryForm.credit} onChange={e => setEntryForm({...entryForm, credit: e.target.value, debit: ""})} /></div>
            </div>
            <div><Label>Description</Label><Input placeholder="Description" value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} /></div>
            <Button onClick={handleAddEntry} className="w-full" disabled={saving || (!entryForm.debit && !entryForm.credit)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialLedger;
