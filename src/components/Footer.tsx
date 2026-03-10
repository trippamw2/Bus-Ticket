import { Bus } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Bus className="h-5 w-5 text-primary" />
        BusLink
      </div>
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} BusLink. Travel made simple.
      </p>
    </div>
  </footer>
);

export default Footer;
