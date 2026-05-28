import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";


/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <main>
        {/* Example: lucide-react for icons */}
        <Loader2 className="animate-spin" />
        Example Page
        
        <p>Any <strong>markdown</strong> content</p>
        <Button variant="default">Example Button</Button>
      </main>
    </div>
  );
}
