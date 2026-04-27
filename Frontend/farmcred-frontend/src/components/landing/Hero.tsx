"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: 1,
    image: "/images/hero1.jpg",
    title: "Empowering Farmers, Fueling Growth",
    description:
      "Connecting farmers with buyers and investors for a stronger, more sustainable future.",
    cta1: { label: "Get Started as a Farmer", link: "/signup?type=farmer" },
    cta2: { label: "Explore Produce", link: "/marketplace" },
    position: "left",
  },
  {
    id: 2,
    image: "/images/hero7.jpg",
    title: "Invest in the Future of Agriculture",
    description:
      "Support real farmers. Track growth. Earn returns while making a difference.",
    cta1: { label: "Start Investing", link: "/signup?type=investor" },
    cta2: { label: "View Opportunities", link: "/about" },
    position: "right",
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-[84vh] w-full overflow-hidden pb-24">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out
            ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}
          `}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            layout="fill"
            objectFit="cover"
            objectPosition="top"
            className="opacity-100"
            priority={index === currentSlide}
          />

          {/* Animated Content */}
          <div
            className={`absolute bottom-24 left-8 right-8 flex ${
              slide.position === "left" ? "justify-start" : "justify-end"
            }`}
          >
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 max-w-2xl text-left shadow-xl">
              <div className="space-y-4 text-white drop-shadow">
                <h1 className="text-3xl md:text-5xl font-bold drop-shadow-lg font-[Plus Jakarta Sans]">
                  {slide.title}
                </h1>
                <p className="text-white/90 font-[Inter] text-base leading-relaxed">
                  {slide.description}
                </p>

                <div className="flex flex-col md:flex-row gap-4 mt-2">
                  <Link href={slide.cta1.link}>
                    <Button
                      size="lg"
                      className="bg-gradient-to-br from-[#128f20] to-[#72BF01] hover:opacity-90 shadow-lg hover:bg-green-700 text-white"
                    > 
                      {slide.cta1.label}
                    </Button>
                  </Link>
                  <Link href={slide.cta2.link}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-[#158f20] hover:bg-white hover:opacity-90 shadow-lg hover:text-[#05402E]"
                    >
                      {slide.cta2.label}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
