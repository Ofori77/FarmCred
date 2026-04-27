import CountUp from "react-countup";
import { Card } from "@/components/ui/card"; 

const impactStats = [
  { value: 100, suffix: "+", label: "Farmers Supported" },
  { value: 25000, prefix: "GHS ", suffix: "+", label: "Invested" },
  { value: 90, suffix: "%", label: "Repayment Rate" },
  { value: 200, suffix: "+", label: "Produce Transactions" },
];

export default function ImpactSection() {
  return (
    <section className="py-36 px-6 md:px-12 lg:px-20 bg-white mx-18">
      <div className="text-center mb-20">
        <p className="text-sm font-light text-gray-500">A Little About Us</p>
        <h2 className="text-2xl text-[#158f20] max-w-xl mx-auto">
          We connect farmers, funders, and buyers with a transparent, secure
          platform — built to deliver real-world impact.
        </h2>
        <div className="w-16 h-1.5 bg-[#72BF01] mx-auto my-4 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
        <Card
          className="w-full h-full lg:col-span-1 border-8 border-transparent bg-transparent text-[#128f20] shadow-none rounded-md flex items-center justify-center py-36"
          style={{
            borderImage: "linear-gradient(to bottom right, #128f20, #72BF01) 1",
          }}
        >
          <div className="text-center">
            <h1 className="text-8xl font-extrabold mb-4 leading-none bg-gradient-to-br from-[#128f20] to-[#72BF01] bg-clip-text text-transparent">
              2
            </h1>
            <p className="mt-2 text-lg font-medium text-gray-900 tracking-wide">
              Years of Experience
            </p>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-2 gap-y-20 lg:col-span-4">
          {impactStats.map((stat, index) => (
            <div key={index} className="text-center">
              <h3 className="text-5xl font-bold text-[#128f20]">
                <CountUp
                  start={0}
                  end={stat.value}
                  duration={2.5}
                  separator=","
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </h3>
              <p className="mt-2 text-lg text-gray-700 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
