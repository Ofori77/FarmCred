import {
  Banknote,
  CheckCircle,
  TrendingUp,
  Users,
  Wallet,

} from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInvestorProfile } from "@/hooks/useInvestorData";

export function SectionCards() {
  const{data:overview, loading:overviewLoading, error:overviewError,} = useInvestorProfile();
  if (overviewError){
    console.error("Failed to fetch dashboard:", overviewError);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full ">
      <Card className="dark:bg-card h-[220px] flex flex-col justify-between shadow-md">

        <CardHeader>
          <CardTitle className="text-sm font-medium ">
            Total Investments
          </CardTitle>
          <CardAction>
            <Banknote size="38" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-3xl font-semibold">
          GH₵ {overview?.total_investments || overview?.total_principal_lent || 0}
        </CardFooter>
      </Card>
      <Card className="dark:bg-card h-[220px] flex flex-col justify-between shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-medium  ">
            Farmers Funded
          </CardTitle>
          <CardAction>
            <Wallet size="38" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-3xl font-semibold">
          {overview?.farmers_funded || overview?.num_farmers_funded || 0 }
        </CardFooter>    
      </Card>
      <Card className="dark:bg-card h-[220px] flex flex-col justify-between shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-medium  ">
            Farmers Reviewed
          </CardTitle>
          <CardAction>
            <CheckCircle size="38" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-3xl font-semibold">
          {overview?.farmers_reviewed || 0}
        </CardFooter>
      </Card>
      <Card className="dark:bg-card h-[220px] flex flex-col justify-between shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-medium  ">
            Return On Investments
          </CardTitle>
          <CardAction >
            <TrendingUp size="38" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-3xl font-semibold">
          {overview?.investor_profit_loss ? 
            `${overview.investor_profit_loss > 0 ? '+' : ''}${overview.investor_profit_loss.toFixed(1)}%` 
            : '0.0%'}
        </CardFooter>
      </Card>
    </div>
  );
}
