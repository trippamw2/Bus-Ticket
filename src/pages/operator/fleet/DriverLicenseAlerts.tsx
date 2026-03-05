import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, AlertTriangle, Calendar, Phone, CheckCircle, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
}

const DriverLicenseAlerts = () => {
  const { operator } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (operator) {
      fetchDrivers();
    }
  }, [operator, operator?.id]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("operator_id", operator?.id)
        .order("license_expiry", { ascending: true });
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
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
    if (!expiryDate) return { status: "unknown", label: "No Date", variant: "secondary" as const };
    
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return { status: "unknown", label: "Unknown", variant: "secondary" as const };
    
    if (days < 0) return { status: "expired", label: "Expired", variant: "destructive" as const };
    if (days <= 7) return { status: "critical", label: `${days} days - Critical`, variant: "destructive" as const };
    if (days <= 30) return { status: "warning", label: `${days} days - Warning`, variant: "outline" as const };
    if (days <= 60) return { status: "notice", label: `${days} days - Notice`, variant: "secondary" as const };
    return { status: "ok", label: `${days} days`, variant: "default" as const };
  };

  const expiredDrivers = drivers.filter(d => getDaysUntilExpiry(d.license_expiry) !== null && getDaysUntilExpiry(d.license_expiry)! < 0);
  const criticalDrivers = drivers.filter(d => {
    const days = getDaysUntilExpiry(d.license_expiry);
    return days !== null && days >= 0 && days <= 30;
  });
  const validDrivers = drivers.filter(d => {
    const days = getDaysUntilExpiry(d.license_expiry);
    return days === null || days > 30;
  });

  const stats = {
    total: drivers.length,
    expired: expiredDrivers.length,
    critical: criticalDrivers.length,
    valid: validDrivers.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Driver License Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor driver license expiry dates and renewals
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={stats.expired > 0 ? "border-red-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
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
            <div className="text-3xl font-bold text-red-600">{stats.expired}</div>
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
            <div className="text-3xl font-bold text-amber-600">{stats.critical}</div>
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
            <div className="text-3xl font-bold text-green-600">{stats.valid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Expired Drivers */}
      {expiredDrivers.length > 0 && (
        <Card className="border-red-500">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Expired Licenses - IMMEDIATE ACTION REQUIRED
            </CardTitle>
            <CardDescription className="text-red-600">
              These drivers cannot operate vehicles until licenses are renewed
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiredDrivers.map((driver) => {
                  const daysOverdue = Math.abs(getDaysUntilExpiry(driver.license_expiry)!);
                  return (
                    <TableRow key={driver.id} className="bg-red-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {driver.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {driver.phone}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{driver.license_number || "-"}</TableCell>
                      <TableCell>{driver.license_expiry}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{daysOverdue} days overdue</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-600">EXPIRED</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Critical / Expiring Soon */}
      {criticalDrivers.length > 0 && (
        <Card className="border-amber-500">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Expiring Within 30 Days
            </CardTitle>
            <CardDescription className="text-amber-600">
              Schedule license renewals for these drivers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalDrivers.map((driver) => {
                  const days = getDaysUntilExpiry(driver.license_expiry)!;
                  return (
                    <TableRow key={driver.id} className="bg-amber-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {driver.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {driver.phone}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{driver.license_number || "-"}</TableCell>
                      <TableCell>{driver.license_expiry}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-500 text-amber-700">
                          {days} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-500">{days <= 7 ? "CRITICAL" : "WARNING"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Valid Drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Valid Licenses
          </CardTitle>
          <CardDescription>
            Drivers with valid licenses (more than 30 days until expiry)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : validDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No drivers with valid licenses
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validDrivers.map((driver) => {
                  const days = getDaysUntilExpiry(driver.license_expiry);
                  const statusInfo = getExpiryStatus(driver.license_expiry);
                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {driver.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {driver.phone}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{driver.license_number || "-"}</TableCell>
                      <TableCell>{driver.license_expiry || "-"}</TableCell>
                      <TableCell>
                        {days !== null ? (
                          <Badge variant="outline">{days} days</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">VALID</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverLicenseAlerts;
