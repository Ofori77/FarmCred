import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import { usePathname } from "next/navigation";
import { useLenderProfile } from "@/hooks/useLenderData";

interface AdminHeaderProps {
  text: string;
}

// Utility function to format path segment
function formatPathSegment(segment: string) {
  return segment
    .replace(/-/g, " ") // replace hyphens with space
    .replace(/\b\w/g, (char) => char.toUpperCase()); // capitalize first letter of each word
}

export function AdminHeader({ text }: AdminHeaderProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean); // remove empty strings
  const currentSegment = pathSegments[pathSegments.length - 1]; // get the last part
  const formattedPath = formatPathSegment(currentSegment || "");
  const isAdmin = pathname === "/admin-dashboard";

  const { data: profile } = useLenderProfile();
  const userName = profile?.full_name || "User";

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
            {isAdmin ? `Welcome, ${userName}` : formattedPath || text}
          </h1>
        </div>
      </div>
    </header>
  );
}
