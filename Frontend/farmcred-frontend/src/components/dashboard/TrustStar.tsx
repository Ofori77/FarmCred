import { GoStarFill } from "react-icons/go";

interface TrustStarProps {
  income: number;
  size?: string;
}

const TrustStar = ({ income = 0, size= "text-3xl" }: TrustStarProps) => {


return (
  <div className={`flex space-x-1 text-3xl font-bold ${size}`}>
    {[...Array(Number(income))].map((_, i) => (
      <GoStarFill key={i} className="text-yellow-500" />
    ))}
  </div>
)

};

export default TrustStar;
