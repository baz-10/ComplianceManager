import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, BookOpen, Layers, BarChart3, CheckCircle, AlertCircle, ArrowRight, 
  Users, ClipboardCheck, Shield, Database, Compass, Navigation, MapPin,
  Zap, Star, Rocket, Globe, Target, Award, Camera, Play, ExternalLink,
  Sparkles, TrendingUp, Activity, Lock, Cloud, Clock
} from "lucide-react";
import { useLocation } from "wouter";

export function LandingPage() {
  const [_, navigate] = useLocation();

  const features = [
    {
      icon: Shield,
      title: "Compliance Management",
      description: "Stay compliant with industry regulations and maintain current certifications with automated tracking.",
      color: "from-violet-500 to-purple-600",
      image: "/api/placeholder/400/240"
    },
    {
      icon: Database,
      title: "Document Organization",
      description: "Centralized document management with version control and automated policy distribution.",
      color: "from-blue-500 to-cyan-500",
      image: "/api/placeholder/400/240"
    },
    {
      icon: Cloud,
      title: "Digital Operations",
      description: "Comprehensive digital workflows, user certifications, and organizational management.",
      color: "from-pink-500 to-rose-500",
      image: "/api/placeholder/400/240"
    }
  ];

  const stats = [
    { 
      label: "Compliance Platform", 
      value: "100%", 
      icon: Award,
      description: "Fully compliant with industry standards"
    },
    { 
      label: "Active Organizations", 
      value: "500+", 
      icon: Users,
      description: "Organizations using our platform"
    },
    { 
      label: "Document Success Rate", 
      value: "99.9%", 
      icon: Target,
      description: "Perfect audit track record"
    },
    { 
      label: "Time Saved Weekly", 
      value: "15hrs", 
      icon: Clock,
      description: "Average per organization"
    }
  ];

  const testimonials = [
    {
      quote: "ComplianceManager transformed our document workflow. What used to take days now takes hours.",
      author: "Sarah Chen",
      role: "Operations Manager",
      company: "TechCorp Industries",
      avatar: "/api/placeholder/64/64"
    },
    {
      quote: "The automated compliance tracking is a game-changer for our multi-site operations.",
      author: "Michael Torres",
      role: "Safety Director", 
      company: "Global Solutions Ltd",
      avatar: "/api/placeholder/64/64"
    }
  ];

  const integrations = [
    { name: "Microsoft 365" },
    { name: "Google Workspace" },
    { name: "Slack" },
    { name: "DocuSign" }
  ];

  return (
    <div className="min-h-screen">
      {/* 🚀 SPECTACULAR HERO SECTION */}
      <section className="relative overflow-hidden mesh-gradient-2 py-24 lg:py-32">
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-gradient-to-br from-blue-600/25 to-teal-400/25 rounded-full blur-2xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="animate-fade-in-up">
              <Badge className="mb-8 px-6 py-2 text-sm font-semibold glass-card border-blue-200/30">
                <Sparkles className="mr-2 h-4 w-4" />
                Professional Document Compliance Platform
              </Badge>
            </div>

            {/* Hero Title */}
            <h1 className="hero-title flightdocs-text-gradient mb-8 animate-fade-in-up text-shadow-lg" style={{animationDelay: '0.2s'}}>
              Master Document Compliance
              <br />
              <span className="relative">
                Like Never Before
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"></div>
              </span>
            </h1>

            {/* Hero Subtitle */}
            <p className="hero-subtitle text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in-up" style={{animationDelay: '0.4s'}}>
              The most advanced document compliance platform trusted by organizations worldwide. 
              Streamline compliance management, organize policies, and automate document workflows with precision.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
              {stats.map((stat, index) => (
                <div key={index} className="stats-card group hover:flightdocs-glow transition-all duration-500">
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 group-hover:scale-110 transition-transform duration-300">
                      <stat.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-black flightdocs-text-gradient mb-2">{stat.value}</div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
              <Button 
                className="btn-primary group"
                onClick={() => navigate("/auth")}
              >
                <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce" />
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <button className="btn-secondary group">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
                <ExternalLink className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 pt-8 border-t border-gray-200/50 animate-fade-in-up" style={{animationDelay: '1s'}}>
              <p className="text-sm text-muted-foreground mb-6">Integrates with your favorite tools</p>
              <div className="flex justify-center items-center space-x-8 opacity-60">
                {integrations.map((integration, index) => (
                  <div key={index} className="px-4 py-2 glass-card rounded-lg hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">{integration.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 SPECTACULAR FEATURES SECTION */}
      <section className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <Badge className="mb-6 px-4 py-2 glass-card border-blue-200/30">
                <Star className="mr-2 h-4 w-4" />
                Powerful Features
              </Badge>
              <h2 className="section-title flightdocs-text-gradient mb-6">
                Everything You Need for
                <br />
                Perfect Compliance
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Built for modern organizations, with comprehensive compliance management 
                and industry-leading automation capabilities.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="feature-card group hover:-translate-y-2 transition-all duration-500">
                  {/* Feature Image */}
                  <div className="relative mb-6 rounded-xl overflow-hidden">
                    <div className={`h-48 bg-gradient-to-br ${feature.color} opacity-10`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-4 rounded-2xl glass-card group-hover:scale-110 transition-transform duration-300">
                        <feature.icon className="h-12 w-12 text-blue-600" />
                      </div>
                    </div>
                    {/* Floating Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge className="px-3 py-1 text-xs glass-card border-white/30">
                        <Zap className="mr-1 h-3 w-3" />
                        Automated
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-4">
                    <CardTitle className="card-title mb-3">{feature.title}</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <CardDescription className="text-base leading-relaxed mb-6">
                      {feature.description}
                    </CardDescription>
                    
                    <Button 
                      variant="outline" 
                      className="w-full group border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                    >
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 💬 SOCIAL PROOF SECTION */}
      <section className="py-24 mesh-gradient-1">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-8 px-4 py-2 glass-card border-green-200/30">
              <TrendingUp className="mr-2 h-4 w-4" />
              Customer Success
            </Badge>
            
            <h2 className="section-title flightdocs-text-gradient mb-16">
              Trusted by Organizations Worldwide
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="hero-card p-8 text-left">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {testimonial.author[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg mb-4 italic">"{testimonial.quote}"</p>
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 FINAL CTA SECTION */}
      <section className="py-24 flightdocs-hero-gradient text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        
        <div className="relative container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black mb-8 text-shadow-lg">
              Ready to Transform Your
              <br />
              Compliance Operations?
            </h2>
            
            <p className="text-xl md:text-2xl mb-12 opacity-90">
              Join hundreds of organizations who trust ComplianceManager for their document compliance needs.
              Get started today.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg"
                className="px-12 py-6 text-xl bg-white text-blue-600 hover:bg-gray-100 rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/auth")}
              >
                <Rocket className="mr-3 h-6 w-6" />
                Get Started Now
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                className="px-12 py-6 text-xl border-white/30 text-white hover:bg-white/10 rounded-2xl font-bold backdrop-blur-sm"
              >
                <Play className="mr-3 h-6 w-6" />
                Schedule Demo
              </Button>
            </div>

            <div className="mt-12 text-center opacity-75">
              <p className="text-sm">✓ No credit card required • ✓ 14-day free trial • ✓ Setup in minutes</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}