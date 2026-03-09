import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOperatorUsers } from '@/contexts/OperatorUserContext';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type OperatorRole } from '@/lib/rbac';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Edit, Trash2, Shield } from 'lucide-react';
import PasswordChangeForm from './PasswordChangeForm';

export default function OrganizationSettings() {
  const { operator } = useAuth();
  const { users, loading, fetchUsers, addUser, updateUser, deleteUser } = useOperatorUsers();
  
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'agent' as string,
  });

  useEffect(() => {
    if (operator) {
      setCompanyName(operator.company_name || '');
      setCompanyAddress(operator.company_address || '');
      setCompanyRegNumber(operator.company_reg_number || '');
      setContactPerson(operator.contact_person || '');
      setContactEmail(operator.contact_email || '');
      fetchUsers(operator.id);
    }
  }, [operator, operator?.id, fetchUsers]);

  const handleSaveProfile = async () => {
    if (!operator) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('operators')
        .update({
          company_name: companyName,
          company_address: companyAddress,
          company_reg_number: companyRegNumber,
          contact_person: contactPerson,
          contact_email: contactEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', operator.id);

      if (error) {
        console.error('Error saving profile:', error);
        throw error;
      }
      toast.success('Company profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!operator) return;
    const { error } = await addUser(newUser, operator.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('User added successfully');
      setIsAddUserOpen(false);
      setNewUser({ email: '', full_name: '', phone: '', role: 'agent' });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await updateUser(userId, { role: newRole });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('User role updated');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await updateUser(userId, { is_active: isActive });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isActive ? 'User activated' : 'User deactivated');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    const { error } = await deleteUser(userId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('User removed');
    }
  };

  const roles = Object.keys(ROLE_LABELS) as OperatorRole[];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your company profile and team access</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Company Profile</TabsTrigger>
          <TabsTrigger value="users">Team Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNumber">Registration Number</Label>
                  <Input
                    id="regNumber"
                    value={companyRegNumber}
                    onChange={(e) => setCompanyRegNumber(e.target.value)}
                    placeholder="e.g., 2023/001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Input
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Full address"
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

        {/* Password Change Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to your operator account</CardDescription>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Invite a new user to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="user@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        placeholder="+260 XXX XXX XXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUser}>Add User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No team members yet. Add your first user.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleUpdateRole(user.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(user.id, !user.is_active)}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {ROLE_LABELS[role]}
                  </CardTitle>
                  <CardDescription>{ROLE_DESCRIPTIONS[role]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {Object.entries({
                      canManageUsers: 'Manage users',
                      canManageFleet: 'Manage fleet',
                      canManageRoutes: 'Manage routes',
                      canManageTrips: 'Manage trips',
                      canViewFinancials: 'View financials',
                      canManageFinancials: 'Manage financials',
                      canViewAnalytics: 'View analytics',
                      canManageSettings: 'Manage settings',
                      canViewAuditLogs: 'View audit logs',
                    }).filter(([key]) => {
                      const permissionsMap: Record<string, Record<string, boolean>> = {
                        owner: { canManageUsers: true, canManageFleet: true, canManageRoutes: true, canManageTrips: true, canViewFinancials: true, canManageFinancials: true, canViewAnalytics: true, canManageSettings: true, canViewAuditLogs: true },
                        manager: { canManageUsers: true, canManageFleet: true, canManageRoutes: true, canManageTrips: true, canViewFinancials: true, canManageFinancials: false, canViewAnalytics: true, canManageSettings: true, canViewAuditLogs: true },
                        operations: { canManageUsers: false, canManageFleet: true, canManageRoutes: true, canManageTrips: true, canViewFinancials: false, canManageFinancials: false, canViewAnalytics: true, canManageSettings: false, canViewAuditLogs: false },
                        finance: { canManageUsers: false, canManageFleet: false, canManageRoutes: false, canManageTrips: false, canViewFinancials: true, canManageFinancials: true, canViewAnalytics: true, canManageSettings: false, canViewAuditLogs: true },
                        agent: { canManageUsers: false, canManageFleet: false, canManageRoutes: false, canManageTrips: true, canViewFinancials: false, canManageFinancials: false, canViewAnalytics: false, canManageSettings: false, canViewAuditLogs: false },
                      };
                      return permissionsMap[role]?.[key];
                    }).map(([key, label]) => (
                      <li key={key} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {label as string}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
