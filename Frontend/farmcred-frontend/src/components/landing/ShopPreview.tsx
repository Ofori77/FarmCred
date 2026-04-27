import Link from "next/link";
import { Button } from "../ui/button";

const products = [
  {
    name: "Tomatoes",
    image: "/images/freshtomatoes.jpg",
    price: "₵150 / crate",
  },
  {
    name: "Palmnut",
    image: "/images/freshpalmnut.jpg",
    price: "₵90 / bag",
    link: "/marketplace",
  },
  {
    name: "Cassavas",
    image: "/images/freshcassavas.jpg",
    price: "₵120 / bag",
    link: "/marketplace",
  },
  {
    name: "Cocoa",
    image: "/images/freshcocoaseeds.jpg",
    price: "₵100 / bunch",
    link: "/marketplace",
  },
  {
    name: "Pineapple",
    image: "/images/freshpineapples.jpg",
    price: "₵50 /collection ",
    link: "/marketplace",
  },
  {
    name: "Plantain",
    image: "/images/freshplantain.jpg",
    price: "₵180 / cluster",
    link: "/marketplace",
  },
];

export function MarketplacePreview() {
  return (
    <section
      className="relative py-4 px-4 md:px-4 lg:px-96 bg-cover bg-center"
    >
      <div className="relative">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-semibold text-[#05402E]">
            Discover Fresh,{" "}
            <span className="bg-gradient-to-br from-[#128f20] to-[#72BF01] bg-clip-text text-transparent font-semibold">
              Local Produce
            </span>{" "}
          </h2>
          <div className="w-16 h-1.5 bg-[#158f20] mx-auto my-4 rounded" />
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-8 mb-8">
          {products.map((product, index) => {
            const ProductCard = (
            <div
              key={index}
              className="relative group w-full max-w-[300px] mx-auto cursor-pointer overflow-hidden rounded-full"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-3xl font-bold bg-gradient-to-br from-[#128f20] to-[#72BF01] bg-clip-text text-transparent">
                  {product.name}
                </h3>
                <p className="text-lg font-medium text-muted-foreground">
                  {product.price}
                </p>
              </div>
            </div>
            );
            return product.link? (
              <Link key={index} href={product.link}>
                {ProductCard}
              </Link>
            ) : (
              ProductCard
            );
          })}
        </div>

        <div className="text-center">
          <Button
            asChild
            variant="default"
            className="text-white bg-gradient-to-br from-[#128f20] to-[#72BF01] transform transition-transform duration-300 hover:scale-105 shadow-lg"
          >
            <Link href="/marketplace">Explore all Produce</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
