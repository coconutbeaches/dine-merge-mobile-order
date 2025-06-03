import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adminUpdateProfile } from '@/services/profileService';

const EditCustomerForm = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // Email is read-only
  const [originalName, setOriginalName] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customerId) {
      const fetchCustomer = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, phone')
            .eq('id', customerId)
            .single();

          if (error) throw error;
          if (data) {
            setName(data.name || '');
            setPhone(data.phone || '');
            setEmail(data.email || 'N/A');
            setOriginalName(data.name || '');
            setOriginalPhone(data.phone || '');
          } else {
            toast.error('Customer not found.');
            navigate(-1); // Go back if customer not found
          }
        } catch (error: any) {
          toast.error(`Failed to fetch customer: ${error.message}`);
          navigate(-1); // Go back on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [customerId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    const updates: { name?: string; phone?: string } = {};
    if (name !== originalName) updates.name = name;
    if (phone !== originalPhone) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      await adminUpdateProfile(customerId, updates);
      // Optionally re-fetch or update state if adminUpdateProfile doesn't return new data
      setOriginalName(name);
      setOriginalPhone(phone);
    } catch (error) {
      // Error is handled by toast in adminUpdateProfile
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Layout title="Edit Customer"><div className="p-4">Loading customer details...</div></Layout>;
  }

  return (
    <Layout title="Edit Customer Information" showBackButton={true}>
      <div className="page-container max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Customer: {originalName || email}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || (name === originalName && phone === originalPhone)}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default EditCustomerForm;
