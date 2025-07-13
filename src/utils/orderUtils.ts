import { supabase } from '@/integrations/supabase/client';

export async function getSafeOrderId(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('nextval', { sequence_name: 'orders_id_seq' });
    if (error) throw error;

    return data;
  } catch (mainError) {
    console.error('Error fetching next sequence value:', mainError);
    // Fallback: Calculate next safe ID based on current max
    try {
      const { data: maxData, error: maxError } = await supabase
        .from('orders')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      if (maxError) throw maxError;

      const nextId = (maxData[0]?.id || 0) + 1001;
      return nextId;
    } catch (fallbackError) {
      throw new Error('Unable to determine safe order ID:', { cause: fallbackError });
    }
  }
}

