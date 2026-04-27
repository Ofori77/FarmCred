"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";

import { TrendingUp, UserCheck, Target, Star, ThumbsUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const insights = [
  {
    icon: TrendingUp,
    title: "Funding is up 28%",
    message: "More investors are supporting farmers recently.",
  },
  {
    icon: UserCheck,
    title: "Reviewed farmers get 2x funding",
    message: "Your reviews help build trust and increase investments.",
  },
  {
    icon: Target,
    title: "60% goal completed",
    message: "You have funded 6 of your 10 farmer goal this quarter.",
  },
  {
    icon: Star,
    title: "Top 5% reviewer",
    message: "You are among the top reviewers this month — keep going!",
  },
  {
    icon: ThumbsUp,
    title: "Try funding John Aboagye",
    message: "High ratings, low support — great opportunity.",
  },
];

export function InvestorInsightCard() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <Card className="p-4 flex flex-col h-full min-h-[335px] max-h-[460px] justify-between">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-6">
        <CardTitle className="text-xl font-medium text-[#157148]">
          Insight
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col px-0 relative">
        <Carousel
          plugins={[
            Autoplay({
              delay: 8000,
            }),
          ]}
          setApi={setApi}
          className="w-full h-full"
        >
          <CarouselContent>
            {insights.map((insight, index) => (
              <CarouselItem key={index} className="h-full">
                <div className="flex flex-col h-full justify-center items-center gap-4 text-center px-4">
                  <insight.icon className="w-12 h-12 text-[#158f20]" />
                  <p className="text-xl font-semibold text-[#157148]">
                    {insight.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {insight.message}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </Carousel>

        <div className="text-muted-foreground pt-4 text-center text-sm">
          Slide {current} of {count}
        </div>
      </CardContent>
    </Card>
  );
}
