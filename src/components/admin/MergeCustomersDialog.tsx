'use client';
import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Profile } from '@/types/supabaseTypes';
import { Button } from '@/components/ui/button';

interface MergeCustomersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (targetId: string, sourceId: string) => Promise<void>;
  customers: Profile[];
}

const MergeCustomersDialog: React.FC<MergeCustomersDialogProps> = ({ isOpen, onClose, onMerge, customers }) => {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    if (customers.length > 0 && !targetId) {
      setTargetId(customers[0].id);
    } else if (customers.length === 0) {
      setTargetId(null);
    }
  }, [customers, targetId]);

  if (customers.length !== 2) {
    return null;
  }

  const handleMerge = async () => {
    if (!targetId) return;
    const sourceCustomer = customers.find(c => c.id !== targetId);
    if (!sourceCustomer) return;

    setIsMerging(true);
    await onMerge(targetId, sourceCustomer.id);
    setIsMerging(false);
    onClose();
  };

  const [customer1, customer2] = customers;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Merge Customers</AlertDialogTitle>
          <AlertDialogDescription>
            Select which customer profile to keep. The other customer's orders will be moved to the selected profile, and the unselected profile will be deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <p className="mb-2 text-sm font-medium text-foreground">Select the primary profile to keep:</p>
          <RadioGroup value={targetId || ''} onValueChange={setTargetId} className="space-y-2">
            <Label htmlFor={`r1-${customer1.id}`} className="flex items-center space-x-3 p-3 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all cursor-pointer">
              <RadioGroupItem value={customer1.id} id={`r1-${customer1.id}`} />
              <div className="flex-1">
                <div className="font-semibold">{customer1.name || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">{customer1.email}</div>
                <div className="text-sm text-muted-foreground">{customer1.phone || 'No phone'}</div>
              </div>
            </Label>
            <Label htmlFor={`r2-${customer2.id}`} className="flex items-center space-x-3 p-3 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all cursor-pointer">
              <RadioGroupItem value={customer2.id} id={`r2-${customer2.id}`} />
              <div className="flex-1">
                <div className="font-semibold">{customer2.name || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">{customer2.email}</div>
                <div className="text-sm text-muted-foreground">{customer2.phone || 'No phone'}</div>
              </div>
            </Label>
          </RadioGroup>
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={isMerging || !targetId} variant="destructive">
            {isMerging ? 'Merging...' : 'Confirm Merge'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MergeCustomersDialog;
