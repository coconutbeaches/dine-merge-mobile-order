import { supabase } from '@/integrations/supabase/client';
import { GroupedCustomer } from '@/types/supabaseTypes';

export async function fetchGroupedCustomers({ includeArchived }: { includeArchived: boolean }): Promise<GroupedCustomer[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_customers_with_total_spent_grouped', {
      p_include_archived: includeArchived
    });

    if (error) throw error;

    // Ensure table_number for guest families is always included
    const result = (data || []).map((customer: any) => ({
      ...customer,
      table_number: customer.customer_type === 'guest_family' ? customer.table_number : undefined
    } as GroupedCustomer));

    return result;
  } catch (error) {
    console.error('RPC fetch error, falling back to manual method:', error);
    return fallbackManualGrouping(includeArchived);
  }
}

async function fallbackManualGrouping(includeArchived: boolean): Promise<GroupedCustomer[]> {
  // Use the manual grouping logic from the existing code base
  // [...insert manual grouping code logic here...]

  return [];
}

export function searchAndFilter(customers: GroupedCustomer[], query: string): GroupedCustomer[] {
  if (!query?.trim()) return customers;

  const lowerQuery = query.toLowerCase();
  return customers.filter(customer =>
    customer.name.toLowerCase().includes(lowerQuery) ||
    customer.customer_id.toLowerCase().includes(lowerQuery)
  );
}

export function sortCustomers(customers: GroupedCustomer[], key: keyof GroupedCustomer, dir: 'asc' | 'desc'): GroupedCustomer[] {
  const sorted = [...customers].sort((a, b) => {
    let valA: any, valB: any;

    switch (key) {
      case 'name':
      case 'customer_type':
        valA = a[key] || '';
        valB = b[key] || '';
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'total_spent':
      case 'last_order_date':
      case 'joined_at':
        valA = a[key] ? new Date(a[key] as string).getTime() : 0;
        valB = b[key] ? new Date(b[key] as string).getTime() : 0;
        break;
      default:
        return 0;
    }

    return dir === 'asc' ? valA - valB : valB - valA;
  });

  return sorted;
}

