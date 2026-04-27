import { useState, useEffect } from 'react';
import { useFarmerTransactions, useFarmerTransactionsChart } from '@/hooks/useFarmerData';
import { useFarmerListings } from '@/hooks/useMarketPlace';

// Enhanced Analytics Hook for Farmers
export function useFarmerAnalytics() {
  const { data: transactions } = useFarmerTransactions();
  const { data: chartData } = useFarmerTransactionsChart();
  const { data: listings } = useFarmerListings();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (transactions && listings) {
      // Calculate comprehensive analytics
      const totalRevenue = transactions
        ?.filter(t => t.category === 'produce_sale' && t.status === 'income')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const activeListings = listings?.filter(l => l.status === 'active').length || 0;
      const totalListings = listings?.length || 0;

      // Seasonal patterns analysis
      const monthlyData = transactions?.reduce((acc, transaction) => {
        const month = new Date(transaction.date).getMonth();
        const monthName = new Date(0, month).toLocaleString('default', { month: 'long' });
        
        if (!acc[monthName]) {
          acc[monthName] = { income: 0, sales: 0 };
        }
        
        if (transaction.category === 'produce_sale' && transaction.status === 'income') {
          acc[monthName].income += transaction.amount;
          acc[monthName].sales += 1;
        }
        
        return acc;
      }, {});

      // Best performing products
      const productPerformance = transactions
        ?.filter(t => t.category === 'produce_sale')
        .reduce((acc, transaction) => {
          // Extract product from description or use listing data
          const product = 'Unknown'; // You'll need to enhance this based on your data structure
          
          if (!acc[product]) {
            acc[product] = { revenue: 0, sales: 0 };
          }
          
          acc[product].revenue += transaction.amount;
          acc[product].sales += 1;
          
          return acc;
        }, {});

      setAnalytics({
        totalRevenue,
        activeListings,
        totalListings,
        listingUtilization: totalListings > 0 ? (activeListings / totalListings) * 100 : 0,
        monthlyData,
        productPerformance,
        averageOrderValue: totalRevenue / (Object.values(productPerformance).reduce((sum: number, p: any) => sum + p.sales, 0) || 1)
      });
    }
  }, [transactions, listings]);

  return { analytics };
}

// Trust Score Improvement Suggestions Hook
export function useTrustScoreImprovement() {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // This would connect to your trust breakdown endpoint
  useEffect(() => {
    // Based on trust metrics, generate suggestions
    const improvementTips = [
      "Complete all orders on time to improve delivery reliability",
      "Maintain accurate product descriptions and quantities",
      "Respond promptly to buyer messages",
      "Keep your profile information up to date",
      "Upload high-quality photos of your produce",
      "Set competitive but fair pricing for your region"
    ];
    
    setSuggestions(improvementTips);
  }, []);

  return { suggestions };
}
