import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface OperatorFormData {
  // Contact Person (required)
  name: string;
  phone: string;
  
  // Company Details (B2B)
  company_name: string;
  company_address: string;
  company_reg_number: string;
  contact_email: string;
  contact_person: string;
}

const OperatorRegister = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OperatorFormData>({
    name: '',
    phone: '',
    company_name: '',
    company_address: '',
    company_reg_number: '',
    contact_email: '',
    contact_person: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the vendors-service edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendors-service`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            company_name: formData.company_name || formData.name,
            company_address: formData.company_address,
            company_reg_number: formData.company_reg_number,
            contact_email: formData.contact_email,
            contact_person: formData.contact_person || formData.name,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast.success('Registration successful! Your account is pending approval.');
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        company_name: '',
        company_address: '',
        company_reg_number: '',
        contact_email: '',
        contact_person: '',
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Register Your Transport Company</CardTitle>
          <CardDescription>
            Complete the B2B onboarding form below. Your phone number will receive booking notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Contact Person Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number * (for notifications)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+254700000000"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Booking confirmations, changes, and cancellations will be sent to this number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email Address</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.contact_email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_person">Alternative Contact Person</Label>
                  <Input
                    id="contact_person"
                    name="contact_person"
                    placeholder="Jane Doe"
                    value={formData.contact_person}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Company Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Company Details (B2B)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    placeholder="BusLink Transport Ltd"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_reg_number">Business Registration Number</Label>
                  <Input
                    id="company_reg_number"
                    name="company_reg_number"
                    placeholder="e.g., CPR/2020/12345"
                    value={formData.company_reg_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company_address">Company Address</Label>
                  <Input
                    id="company_address"
                    name="company_address"
                    placeholder="P.O. Box 123, Nairobi, Kenya"
                    value={formData.company_address}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Register Company'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By registering, you agree to our terms and conditions. 
              Your account will be reviewed and approved within 24-48 hours.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperatorRegister;
