import React from "react";
import { Card, CardContent } from "../ui/card";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const testimonials = [
  {
    name: "Adwoa Mensah",
    role: "Rice Farmer, Northern Region",
    message:
      "Before joining this platform, getting financial support felt impossible. Now, not only have I secured two successful loans, but I also sell directly to reliable buyers. It has truly transformed how I farm.",
    image: "/images/testimonial1.jpg",
  },
  {
    name: "Kwame Okoro",
    role: "Maize Farmer, Bono Region",
    message:
      "I used to rely on middlemen who paid unfair prices. This app connects me directly to markets and tracks my credibility. It’s empowering to finally feel in control of my work.",
    image: "/images/testimonial2.jpg",
  },
  {
    name: "David Attah",
    role: "Agritech Angel Investor, Accra",
    message:
      "Investing in farmers through this platform is seamless and transparent. I can track repayments, view trust scores, and feel confident my support makes a real impact.",
    image: "/images/testimonial3.jpg",
  },
];

export default function TestimonialSection() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section className="py-20 px-6 md:px-12 lg:px-20 bg-[#eff3e4]">
      <div className="text-center mb-16">
        <p className="text-sm font-light text-gray-500">
          Happy Farmers and Partners
        </p>
        <h2 className="text-4xl font-semibold text-[#05402E]">
          Our{" "}
          <span className="bg-gradient-to-br from-[#128f20] to-[#72BF01] bg-clip-text text-transparent font-semibold">
            Customers
          </span>{" "}
          and Partners
        </h2>
        <div className="w-16 h-1.5 bg-[#158f20] mx-auto my-4 rounded" />
      </div>

      <Carousel
        plugins={[Autoplay({ delay: 8000 })]}
        setApi={setApi}
        className="w-full max-w-4xl mx-auto"
      >
        <CarouselContent>
          {testimonials.map((testimonial, index) => (
            <CarouselItem key={index}>
              <Card className="py-0 flex flex-col h-[540px] md:flex-row overflow-hidden shadow-md border-none rounded-none">
                {/* Left: Image */}
                <div className="w-full md:w-2/3 h-full">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="object-cover h-full w-full"
                  />
                </div>

                {/* Right: Content */}
                <CardContent className="p-6 flex flex-col justify-center md:w-2/3">
                  <p className="text-lg font-semibold text-[#158f20]">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-500 font-light mb-4">
                    {testimonial.role}
                  </p>
                  <p className="text-sm italic text-gray-700 leading-relaxed">
                    "{testimonial.message}"
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
