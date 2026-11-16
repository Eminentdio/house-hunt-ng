import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  Search,
  ShieldCheck,
  Percent,
  MapPin,
  ArrowRight,
  Building2,
  KeyRound,
  Sparkles,
} from "lucide-react";

const categories = [
  { name: "Self Contain", slug: "self-contain", icon: Home },
  { name: "1 Bedroom Flat", slug: "1-bedroom-flat", icon: Building2 },
  { name: "2 Bedroom Flat", slug: "2-bedroom-flat", icon: Building2 },
  { name: "3 Bedroom Flat", slug: "3-bedroom-flat", icon: Building2 },
  { name: "Duplex", slug: "duplex", icon: Home },
  { name: "Shop", slug: "shop", icon: KeyRound },
];

export default function Index() {
  const { user } = useAuth();

  const dashboardPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "landlord"
      ? "/landlord"
      : "/tenant";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">HouseHunt NG</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(18_90%_45%/0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="max-w-3xl">
            <Badge className="mb-5 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              No agents. No hidden fees.
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Your Home at a{" "}
              <span className="text-primary">Pocket Friendly</span> Price
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl text-balance">
              Pay the landlord's real price plus a flat, visible 15% fee. No
              agents, no inflated rents, no surprises. Tour homes in 360° and
              pay securely through escrow.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="text-base">
                <Link to="/signup">
                  Find a Home <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link to="/signup">List Your Property</Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              {[
                { icon: Percent, label: "Flat 15% fee", sub: "Paid by tenant, visible upfront" },
                { icon: ShieldCheck, label: "Escrow protected", sub: "Funds held until move-in" },
                { icon: MapPin, label: "Verified listings", sub: "Admin-approved properties" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <Card className="shadow-lg border-primary/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  placeholder="Where do you want to live? e.g. Lekki, Lagos"
                />
              </div>
              <div className="flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                <Home className="w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent outline-none text-sm"
                  placeholder="House type or budget"
                />
              </div>
              <Button size="lg" className="sm:w-auto">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Browse by category
            </h2>
            <p className="text-muted-foreground mt-1">
              Find the space that fits your life
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to="/signup"
              className="group rounded-xl border bg-card p-5 flex flex-col items-center gap-3 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <cat.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
            How HouseHunt NG works
          </h2>
          <p className="text-muted-foreground mt-2 text-center max-w-xl mx-auto">
            We sit between you and the landlord — no agents, no inflated prices.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Discover & tour",
                desc: "Browse verified listings, take 360° tours and watch landlord videos of the vacant space.",
              },
              {
                step: "02",
                title: "Sign & pay securely",
                desc: "Sign the tenancy agreement online and pay rent + a flat 15% fee into escrow.",
              },
              {
                step: "03",
                title: "Move in",
                desc: "Confirm move-in and we release the landlord's rent. The fee is all you pay us.",
              },
            ].map((item) => (
              <Card key={item.step} className="border-primary/10">
                <CardContent className="p-6">
                  <span className="text-3xl font-bold text-primary/30">
                    {item.step}
                  </span>
                  <h3 className="mt-3 font-semibold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl bg-primary text-primary-foreground p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to find your next home?
          </h2>
          <p className="mt-2 text-primary-foreground/80 max-w-xl mx-auto">
            Join HouseHunt NG today and skip the agents entirely.
          </p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="mt-6 text-base"
          >
            <Link to="/signup">
              Create your free account <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">HouseHunt NG</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HouseHunt NG. Your Home at a Pocket Friendly Price.
          </p>
        </div>
      </footer>
    </div>
  );
}