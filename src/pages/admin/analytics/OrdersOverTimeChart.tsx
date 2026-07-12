import Layout from '@/components/layout/Layout'
import OrdersOverTimeChart from '@/components/analytics/OrdersOverTimeChart'

export default function OrdersOverTimePage() {
  return (
    <Layout title="Orders Over Time">
      <div className="p-4">
        <OrdersOverTimeChart />
      </div>
    </Layout>
  )
}
