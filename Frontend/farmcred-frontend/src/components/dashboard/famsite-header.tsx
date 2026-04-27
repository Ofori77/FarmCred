import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { useFarmerProfile } from "@/hooks/useFarmerData";
import { toast } from "sonner";

interface SiteHeaderProps {
  name?: string;
  text: string;
}

// Utility function to format path segment
function formatPathSegment(segment: string) {
  return segment
    .replace(/-/g, " ") // replace hyphens with space
    .replace(/\b\w/g, (char) => char.toUpperCase()); // capitalize first letter of each word
}

export function SiteHeader({ name, text }: SiteHeaderProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean); // remove empty strings
  const currentSegment = pathSegments[pathSegments.length - 1]; // get the last part
  const formattedPath = formatPathSegment(currentSegment || "");
  const isFarmer = pathname === "/dashboard";

  const { data: profile } = useFarmerProfile();

  const handleTrophyClick = () => {
    if (profile?.trust_level_stars !== undefined) {
      toast.success(`You are on Trust Level ${profile.trust_level_stars}`, {
        description: "🎉 Great job! Keep maintaining your performance.",
        duration: 4000,
      });
    } else {
      toast("Trust level data not available.");
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-[#158f20]" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-8"
          />
          <h1 className="text-[#158f20] font-[Plus Jakarta Sans] text-2xl font-semibold tracking-tighter">
            {isFarmer ? `Welcome, ${name}` : formattedPath || text}
          </h1>
        </div>

        {/* Trophy Icon as Clickable Toast Trigger */}
        <button
          onClick={handleTrophyClick}
          className="hover:scale-105 transition-transform"
          title="View Trust Level"
        >
          <Trophy className="text-[#158f20] w-6 h-6 cursor-pointer" />
        </button>
      </div>
    </header>
  );
}
