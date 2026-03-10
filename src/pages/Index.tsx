import { Bus, BarChart3, Shield, Wallet, Users, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Phone,
    title: "USSD Ticket Sales",
    description: "Passengers book via USSD (*123#) — no internet required. Reach every traveler in Malawi.",
  },
  {
    icon: Wallet,
    title: "Automated Settlements",
    description: "Revenue collected and settled to your wallet automatically after each trip completes.",
  },
  {
    icon: BarChart3,
    title: "Route Analytics",
    description: "Track demand, load factors, and revenue per route to optimize your schedules.",
  },
  {
    icon: Users,
    title: "Fleet & Driver Management",
    description: "Manage your buses, drivers, documents, and maintenance all in one dashboard.",
  },
  {
    icon: Shield,
    title: "Fraud Protection",
    description: "Built-in security alerts, seat locking, and payment validation to protect your business.",
  },
  {
    icon: BarChart3,
    title: "Commission Transparency",
    description: "Clear commission rates, detailed settlement reports, and full financial ledger access.",
  },
];

const Index = () => (
  <div className="min-h-screen flex flex-col bg-background">
    {/* Nav */}
    <nav className="border-b border-border bg-card px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Bus className="h-6 w-6 text-primary" />
          BusLink
        </div>
        <Link to="/login">
          <Button variant="default" size="sm" className="gap-1">
            Operator Login <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </nav>

    {/* Hero */}
    <section className="relative overflow-hidden bg-primary px-4 py-20 sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm">
          <Bus className="h-4 w-4" />
          For Bus Operators
        </div>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
          Grow Your Bus Business
          <br />
          <span className="text-white/80">with BusLink</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70">
          The all-in-one platform to sell tickets via USSD, manage your fleet, 
          track revenue, and get automated settlements — all without passengers needing the internet.
        </p>
        <Link to="/login">
          <Button size="lg" variant="secondary" className="gap-2 px-8 py-6 text-base font-semibold">
            Get Started <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>

    {/* How it works */}
    <section className="bg-muted px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-2 text-3xl font-bold text-foreground">How It Works</h2>
        <p className="mb-12 text-muted-foreground">Simple for you, simple for your passengers</p>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { step: "1", title: "Register & Setup", desc: "Add your routes, buses, and trips to the platform." },
            { step: "2", title: "Passengers Book via USSD", desc: "Travelers dial *123# to search, book, and pay with Airtel Money." },
            { step: "3", title: "Get Paid Automatically", desc: "Revenue settles to your wallet after each trip. Track everything in your dashboard." },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {s.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Benefits */}
    <section className="bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 text-center text-3xl font-bold text-foreground">
          Platform Benefits
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
          Everything you need to run a modern bus operation
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{b.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
          Ready to digitize your bus operations?
        </h2>
        <p className="mb-8 text-white/70">
          Join operators across Malawi who are growing their business with BusLink.
        </p>
        <Link to="/login">
          <Button size="lg" variant="secondary" className="gap-2 px-8 py-6 text-base font-semibold">
            Create Operator Account <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border bg-card px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Bus className="h-5 w-5 text-primary" />
          BusLink
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} BusLink. Passengers book via USSD *123#
        </p>
      </div>
    </footer>
  </div>
);

export default Index;
