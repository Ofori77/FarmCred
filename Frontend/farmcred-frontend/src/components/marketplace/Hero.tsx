"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    id: 1,
    image: "/images/hero3.jpg",
    title: "Fresh From the Farm to Your Table",
    description:
      "Shop quality produce directly from trusted farmers across the country. No middlemen, just real freshness.",
    position: "left",
  },
  {
    id: 2,
    image: "/images/hero10.jpg",
    title: "Support Local. Shop Smart.",
    description:
      "Discover affordable, farm-fresh goods while empowering local communities and sustainable agriculture.",
    position: "right",
  },
];

export default function MarketHeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full overflow-hidden h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh] xl:h-[80vh]">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Background Image */}
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover object-center"
            priority={index === currentSlide}
          />

          {/* Content Overlay */}
          <div
            className={`absolute inset-0 flex items-end sm:items-center px-4 sm:px-6 md:px-10 lg:px-16 py-6 transition-all duration-1000 ${
              slide.position === "left" ? "justify-start" : "justify-end"
            }`}
          >
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-6 md:p-8 max-w-xl sm:max-w-2xl text-left shadow-xl">
              <div className="space-y-3 text-white drop-shadow">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold drop-shadow-lg font-[Plus Jakarta Sans] leading-tight">
                  {slide.title}
                </h1>
                <p className="text-white/90 font-[Inter] text-sm sm:text-base leading-relaxed">
                  {slide.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
