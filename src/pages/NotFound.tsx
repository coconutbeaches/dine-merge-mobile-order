
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const pathname = usePathname();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname
    );
  }, [pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 max-w-md bg-white rounded-xl shadow-lg">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-2xl text-gray-600 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 mb-8">
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </p>
        <Link href="/">
          <Button className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
