import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, DollarSign, Percent, Save } from 'lucide-react';

const PlatformSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    change_fee: '',
    cancellation_fee: '',
    default_commission: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    if (!error && data) {
      setSettings({
        change_fee: data.change_fee?.toString() || '1000',
        cancellation_fee: data.cancellation_fee?.toString() || '2000',
        default_commission: data.default_commission?.toString() || '10'
      });
    } else {
      // Set defaults if no settings exist
      setSettings({
        change_fee: '1000',
        cancellation_fee: '2000',
        default_commission: '10'
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const changeFee = parseFloat(settings.change_fee);
    const cancellationFee = parseFloat(settings.cancellation_fee);
    const defaultCommission = parseFloat(settings.default_commission);

    if (isNaN(changeFee) || isNaN(cancellationFee) || isNaN(defaultCommission)) {
      toast.error('Please enter valid numbers');
      setSaving(false);
      return;
    }

    if (defaultCommission < 0 || defaultCommission > 100) {
      toast.error('Commission must be between 0 and 100');
      setSaving(false);
      return;
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .limit(1)
      .single();

    let error;
    if (existing?.id) {
      // Update existing
      ({ error } = await supabase
        .from('platform_settings')
        .update({
          change_fee: changeFee,
          cancellation_fee: cancellationFee,
          default_commission: defaultCommission
        })
        .eq('id', existing.id));
    } else {
      // Create new
      ({ error } = await supabase
        .from('platform_settings')
        .insert({
          change_fee: changeFee,
          cancellation_fee: cancellationFee,
          default_commission: defaultCommission
        }));
    }

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved successfully');
      // Log to audit
      await logAudit('platform_settings_update', { 
        change_fee: changeFee, 
        cancellation_fee: cancellationFee,
        default_commission: defaultCommission 
      });
    }
    setSaving(false);
  };

  const logAudit = async (action: string, metadata: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        action,
        admin_id: user.id,
        entity_type: 'platform_settings',
        entity_id: 'platform',
        details: metadata
      } as any);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-gray-500">Configure platform-wide fees and commissions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Fee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Change Fee
            </CardTitle>
            <CardDescription>
              Fee charged when a customer changes their booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="change_fee">Amount (MWK)</Label>
              <Input
                id="change_fee"
                type="number"
                min="0"
                value={settings.change_fee}
                onChange={(e) => setSettings({ ...settings, change_fee: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Fee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cancellation Fee
            </CardTitle>
            <CardDescription>
              Fee charged when a customer cancels their booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="cancellation_fee">Amount (MWK)</Label>
              <Input
                id="cancellation_fee"
                type="number"
                min="0"
                value={settings.cancellation_fee}
                onChange={(e) => setSettings({ ...settings, cancellation_fee: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Commission */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Default Commission
            </CardTitle>
            <CardDescription>
              Default commission percentage for new operators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="default_commission">Percentage (%)</Label>
              <Input
                id="default_commission"
                type="number"
                min="0"
                max="100"
                className="max-w-xs"
                value={settings.default_commission}
                onChange={(e) => setSettings({ ...settings, default_commission: e.target.value })}
              />
              <p className="text-sm text-gray-500">
                This will be applied to new operators by default. Individual operators can have custom rates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Settings Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Change Fee</p>
              <p className="text-2xl font-bold">MWK {parseInt(settings.change_fee || '0').toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Cancellation Fee</p>
              <p className="text-2xl font-bold">MWK {parseInt(settings.cancellation_fee || '0').toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Default Commission</p>
              <p className="text-2xl font-bold">{settings.default_commission}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformSettings;
