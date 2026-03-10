import { Shield, Zap, Smartphone, Clock } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Booking",
    description: "Book your seat in seconds with our streamlined booking process.",
  },
  {
    icon: Smartphone,
    title: "USSD & Mobile",
    description: "Book via USSD (*123#) or mobile — no internet needed.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Pay safely with Airtel Money and receive instant SMS confirmation.",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description: "Get live trip updates, delays, and seat availability.",
  },
];

const FeaturesSection = () => (
  <section className="bg-background px-4 py-16 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-foreground">
        Why Choose BusLink?
      </h2>
      <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
        The smarter way to travel across Malawi
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
