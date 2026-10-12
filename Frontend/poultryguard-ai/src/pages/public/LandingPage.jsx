import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Droplets,
  Eye,
  FileText,
  HeartPulse,
  Layers,
  Lock,
  Menu,
  Radio,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Syringe,
  Thermometer,
  Truck,
  Users,
  Wifi,
  Wind,
  X,
  Zap,
} from "lucide-react";
import sensorHardwareImg from "../../assets/sensor-hardware.jpeg";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "#" },
    { name: "IoT Hardware", href: "#hardware" },
    { name: "AI Vision", href: "#ai-vision" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "About", href: "#about" },
  ];

  const features = [
    {
      title: "Environmental Microclimate Sensing",
      badge: "Operational",
      badgeType: "operational",
      icon: <Thermometer className="text-emerald-600" size={24} />,
      desc: "Continuous measurement of shed ambient temperature and relative humidity via high-precision DHT22 probes to mitigate heat and cold stress.",
    },
    {
      title: "ResNet-18 Vision Screening",
      badge: "Operational",
      badgeType: "operational",
      icon: <Eye className="text-emerald-600" size={24} />,
      desc: "Deep convolutional neural network evaluating 224x224 RGB flock images to screen for symptoms of Fowlpox, Infectious Coryza, and Healthy status.",
    },
    {
      title: "Ammonia Gas (NH3) Early Warning",
      badge: "Operational",
      badgeType: "operational",
      icon: <Wind className="text-emerald-600" size={24} />,
      desc: "Electrochemical MQ-series sensor detection providing early alerts before toxic ammonia levels exceed 20 ppm and irritate bird respiratory mucosa.",
    },
    {
      title: "Early Biosecurity Risk Alerts",
      badge: "Operational",
      badgeType: "operational",
      icon: <ShieldAlert className="text-emerald-600" size={24} />,
      desc: "Automated thresholds trigger instantaneous dashboard notifications when microclimate swings or gas spikes threaten flock immunity.",
    },
    {
      title: "Mortality & Batch Analytics",
      badge: "Operational",
      badgeType: "operational",
      icon: <Activity className="text-emerald-600" size={24} />,
      desc: "Daily mortality curve tracking, feed conversion ratio logs, and historical flock health records for broiler and layer operations.",
    },
    {
      title: "Acoustic Health Monitoring",
      badge: "Configurable",
      badgeType: "hardware",
      icon: <Radio className="text-emerald-600" size={24} />,
      desc: "Continuous audio monitoring capturing early respiratory distress, rales, and abnormal flock coughing before physical symptoms escalate.",
    },
    {
      title: "Vaccination Regimen Schedules",
      badge: "Operational",
      badgeType: "operational",
      icon: <Syringe className="text-emerald-600" size={24} />,
      desc: "Automated schedules and clinical reminders for ND, IB, and IBD vaccine regimens tailored to flock age, batch size, and bird breed.",
    },
    {
      title: "Private Encrypted Cloud Storage",
      badge: "Operational",
      badgeType: "operational",
      icon: <Lock className="text-emerald-600" size={24} />,
      desc: "Flock photographs secured in private cloud storage buckets, accessible only via time-limited cryptographically signed URLs.",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      tag: "IoT Sensing",
      title: "In-Shed Sensor Capture",
      desc: "Hardware kits wired with temperature, humidity, and ammonia gas sensors continuously stream shed readings every 300 seconds to ThingSpeak.",
    },
    {
      step: "02",
      tag: "Optical Acquisition",
      title: "Flock Image Ingestion",
      desc: "Images captured by stationary ESP32-CAM modules or mobile cameras are securely stored in private cloud storage with cryptographic access control.",
    },
    {
      step: "03",
      tag: "Deep Learning",
      title: "Multi-Modal AI Inference",
      desc: "Our retrained ResNet-18 model processes 224x224 RGB imagery to classify Fowlpox and Infectious Coryza while environmental models assess microclimate risk.",
    },
    {
      step: "04",
      tag: "Early Warning",
      title: "Automated Biosecurity Alerts",
      desc: "Risk scores, pathogen probability distributions, and threshold anomalies are immediately surfaced to the farm operator dashboard.",
    },
    {
      step: "05",
      tag: "Containment Action",
      title: "Biosecurity Remediation",
      desc: "When risk levels elevate, automated biosecurity remediation protocols provide step-by-step guidance for flock isolation and ventilation adjustments.",
    },
  ];

  const diseaseClasses = [
    {
      name: "Healthy Flock",
      badge: "Normal State",
      color: "emerald",
      desc: "Active flock behavior, bright comb coloration, clear respiratory passages, and optimal feeding efficiency.",
      protocol: "Maintain baseline biosecurity, continuous 300s environmental telemetry, and standard vaccination schedules.",
    },
    {
      name: "Infectious Coryza",
      badge: "High Risk • Avibacterium",
      color: "amber",
      desc: "Acute respiratory infection characterized by facial swelling, nasal discharge, foul odor, and rapid drop in egg production.",
      protocol: "Immediate shed isolation, ammonia ventilation purge, and rapid quarantine to prevent flock-wide transmission.",
    },
    {
      name: "Fowlpox",
      badge: "High Risk • Avipoxvirus",
      color: "rose",
      desc: "Slow-spreading viral infection exhibiting nodular cutaneous eruptions ('dry pox') on unfeathered skin and diphtheritic lesions ('wet pox').",
      protocol: "Isolate affected birds, sanitize waterers, implement mosquito vector control, and review flock vaccination status.",
    },
  ];

  const roles = [
    {
      name: "Poultry Farmer",
      tag: "Growers & Producers",
      icon: "🌾",
      desc: "Monitor your shed microclimate in real-time, view AI screening predictions, log daily mortality, and manage flock health.",
      actionText: "Enter Farmer Portal",
      link: "/login",
      features: ["Live ThingSpeak Telemetry", "ResNet-18 Disease Screener", "Daily Mortality Logging"],
    },
    {
      name: "Farm Operations Manager",
      tag: "Shed Supervision",
      icon: "📋",
      desc: "Supervise multiple poultry houses, track batch environmental trends, and ensure strict biosecurity protocol compliance.",
      actionText: "Enter Operations Portal",
      link: "/login",
      features: ["Multi-Shed Overview", "Threshold Alert Management", "Vaccination Compliance"],
    },
    {
      name: "Agricultural Vendor",
      tag: "Feed & Supplies",
      icon: "🚚",
      desc: "Supply certified poultry feed, biosecurity disinfectants, vaccines, and hardware kits with localized farm demand visibility.",
      actionText: "Enter Vendor Portal",
      link: "/login",
      features: ["Supply Catalog", "Order Fulfillment", "Regional Farm Requests"],
    },
    {
      name: "Platform Administrator",
      tag: "System Governance",
      icon: "🛡️",
      desc: "Provision IoT hardware kits, supervise disease containment protocols, manage accounts, and audit telemetry logs.",
      actionText: "Enter Admin Portal",
      link: "/login",
      features: ["Kit Provisioning", "User Management", "System Audit Telemetry"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#0f172a] font-sans selection:bg-[#166534] selection:text-white antialiased">
      {/* ================= TOP ANNOUNCEMENT BAR ================= */}
      <div className="bg-[#052e16] text-emerald-200 text-xs py-2 px-4 border-b border-emerald-900/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-semibold text-emerald-100">Poultry Guard AI v2.4</span>
            <span className="hidden sm:inline text-emerald-400/80">•</span>
            <span className="hidden sm:inline text-emerald-300">
              Live IoT Microclimate Sensing, ResNet-18 Vision Screening & Biosecurity Alerts
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium shrink-0">
            <span className="text-emerald-400 hidden md:inline">Telemetry Freshness: 300s Standard</span>
            <Link to="/login" className="text-emerald-200 hover:text-white underline underline-offset-2">
              Sign In →
            </Link>
          </div>
        </div>
      </div>

      {/* ================= NAVIGATION BAR (CLEAN & NON-OVERLAPPING) ================= */}
      <header className="sticky top-0 z-50 bg-[#062817]/95 backdrop-blur-md border-b border-emerald-900/40 text-white shadow-lg shadow-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-all duration-300 border border-emerald-400/30 shrink-0">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1 leading-tight">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">PoultryGuard</span>
                <span className="font-extrabold text-lg sm:text-xl text-emerald-400">AI</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-300/80 tracking-widest uppercase block">
                Biosecurity Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-emerald-100/90 whitespace-nowrap">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="hover:text-emerald-300 transition-colors py-1 hover:border-b-2 hover:border-emerald-400"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="px-4.5 py-2.5 rounded-xl border border-emerald-700/80 text-emerald-100 hover:text-white hover:bg-emerald-800/40 font-semibold text-sm transition-all whitespace-nowrap"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Create Account
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="xl:hidden p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-900/60 transition-colors shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-emerald-900/80 bg-[#062817] px-6 pt-3 pb-6 space-y-3">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-base font-semibold text-emerald-100 hover:text-emerald-300 border-b border-emerald-900/40"
              >
                {item.name}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-2.5">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-xl border border-emerald-700 text-emerald-100 font-semibold text-sm"
              >
                Sign In to Dashboard
              </Link>
              <Link
                to="/register"
                className="w-full text-center py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#062817] via-[#0b3d24] to-[#041d11] text-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline & Action Buttons */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Agricultural Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Precision Poultry Biosecurity & AI Vision
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
                Protect Your Flock with{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-amber-300 bg-clip-text text-transparent">
                  Smart IoT Sensors
                </span>{" "}
                and Vision AI
              </h1>

              {/* Supporting Subhead */}
              <p className="text-lg sm:text-xl text-emerald-100/85 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Poultry Guard AI combines in-shed microclimate monitoring, continuous ammonia gas alarms, and ResNet-18 deep learning disease screening into a unified biosecurity platform to prevent outbreaks before they spread.
              </p>

              {/* Action Buttons (Carefully Spaced & Non-Overlapping) */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-emerald-950/60 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-emerald-400/30 hover:border-emerald-400/60 text-white font-bold text-sm sm:text-base backdrop-blur-sm transition-all whitespace-nowrap"
                >
                  Sign In to Dashboard
                </Link>
                <a
                  href="#hardware"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-emerald-300 hover:text-white font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  <Cpu size={16} />
                  <span>View Hardware</span>
                </a>
              </div>

              {/* Verified Metrics Counter */}
              <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-emerald-900/80">
                <div className="text-left bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                  <div className="text-2xl font-extrabold text-emerald-400">300s</div>
                  <div className="text-xs text-emerald-200/70 font-medium">Telemetry Freshness</div>
                </div>
                <div className="text-left bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                  <div className="text-2xl font-extrabold text-emerald-400">3-Class</div>
                  <div className="text-xs text-emerald-200/70 font-medium">ResNet-18 Vision Model</div>
                </div>
                <div className="text-left bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                  <div className="text-2xl font-extrabold text-emerald-400">NH3 / Temp</div>
                  <div className="text-xs text-emerald-200/70 font-medium">Continuous Gas Sensors</div>
                </div>
                <div className="text-left bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                  <div className="text-2xl font-extrabold text-emerald-400">0-100 ppm</div>
                  <div className="text-xs text-emerald-200/70 font-medium">Ammonia Range</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Live Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl bg-slate-900/90 border border-emerald-500/30 p-6 shadow-2xl shadow-black/60 backdrop-blur-md">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-emerald-900/60">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                      Live Telemetry Stream
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                    Farm ID #12 • Broiler Shed A
                  </span>
                </div>

                {/* Telemetry Metrics Stream */}
                <div className="space-y-3.5 pt-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-900/60 text-emerald-400">
                        <Thermometer size={18} />
                      </div>
                      <div>
                        <span className="text-xs text-emerald-300/70 block">Ambient Temperature</span>
                        <span className="text-xl font-extrabold text-white">24.6°C</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                      Normal (22-26°C)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-900/60 text-emerald-400">
                        <Droplets size={18} />
                      </div>
                      <div>
                        <span className="text-xs text-emerald-300/70 block">Relative Humidity</span>
                        <span className="text-xl font-extrabold text-white">62.4%</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                      Optimal (50-70%)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-900/40 text-amber-400">
                        <Wind size={18} />
                      </div>
                      <div>
                        <span className="text-xs text-emerald-300/70 block">Ammonia Gas (NH3)</span>
                        <span className="text-xl font-extrabold text-white">11.8 ppm</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                      Safe (&lt; 20 ppm)
                    </span>
                  </div>

                  {/* AI Vision Status */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/50 to-green-950/70 border border-emerald-600/40">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                        <Camera size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white block">
                            Vision Screening (ResNet-18)
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            94.2% Conf.
                          </span>
                        </div>
                        <p className="text-xs text-emerald-200/80 mt-1">
                          Evaluated status: <strong className="text-emerald-300">Healthy Flock</strong>. No cutaneous lesions or respiratory coryza symptoms detected.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Biosecurity Health Status Banner (Replaces Vet Preview Card) */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-900/60 text-emerald-400">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Biosecurity Alert Status</span>
                        <span className="text-[11px] text-emerald-300/80">All environmental parameters within limits</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Normal (Safe)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= DEDICATED HARDWARE SECTION (FEATURING COMPLETE SENSOR PHOTOGRAPH) ================= */}
      <section id="hardware" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-emerald-800 uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
              <Cpu size={14} />
              Our IoT Hardware / Smart Sensor Technology
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Real-World Environmental Sensing & Prototyping
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Precision poultry biosecurity requires trustworthy physical measurement. Below is our operational breadboard sensor apparatus configured to monitor shed microclimates and hazardous gases in real-time.
            </p>
          </div>

          {/* Actual Photograph Feature Display (Uncropped, Fully Visible) */}
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Image Container with Proper Aspect Ratio & No Cropping */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-slate-900 border border-emerald-900/50 p-3 sm:p-5 shadow-2xl shadow-emerald-950/20">
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Actual Hardware Prototype Setup
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Physical Lab Breadboard
                  </span>
                </div>

                {/* The Complete, Uncropped Sensor Photograph */}
                <div className="w-full bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center p-1 sm:p-2">
                  <img
                    src={sensorHardwareImg}
                    alt="Actual sensor hardware prototype connected on a breadboard for environmental monitoring"
                    className="w-full h-auto max-h-[520px] object-contain rounded-xl block mx-auto"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/sensor-hardware.jpeg";
                    }}
                  />
                </div>

                {/* Uncluttered Descriptive Caption */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40 text-slate-300 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-slate-200">
                      <strong>Components Visible:</strong> High-precision DHT22 microclimate sensor, MQ-series electrochemical ammonia gas sensor, and ESP Wi-Fi development board.
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400/90 shrink-0">
                    ThingSpeak Telemetry Active
                  </span>
                </div>
              </div>
            </div>

            {/* Hardware Breakdown Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-[#f8fafc] border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-md">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                    <Thermometer size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">DHT22 / Microclimate Probe</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Continuous monitoring of shed temperature (0–50°C ±0.5°C) and relative humidity (20–90% ±2%). Essential for preventing heat stress in broilers and hypothermia in day-old chicks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8fafc] border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-md">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <Wind size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">MQ-137 / MQ-135 Gas Sensors</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Electrochemical detection of airborne ammonia (NH3) concentration. Levels above 20 ppm damage avian ciliated mucosa, drastically increasing susceptibility to Infectious Coryza and Newcastle Disease.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8fafc] border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-md">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                    <Wifi size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">ThingSpeak IoT Cloud Integration</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Sensor packets are securely transmitted to ThingSpeak over Wi-Fi. Our backend enforces a 300-second freshness window and database deduplication, ensuring accurate environmental health alerts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8fafc] border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-md">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">ESP32-CAM Optical Capture Ready</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Stationary or handheld Wi-Fi cameras capture high-resolution poultry photos and push them directly to our private Supabase storage pipeline for automated ResNet-18 disease inference.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= AI VISION SCREENING SECTION ================= */}
      <section id="ai-vision" className="py-24 bg-[#f8fafc] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-emerald-800 uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
              <Sparkles size={14} />
              Deep Learning Computer Vision
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              ResNet-18 3-Class Disease Screening
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Our retrained deep learning model evaluates 224x224 RGB imagery to detect key poultry pathologies with verified confidence scores, providing fast decision support before clinical symptoms worsen.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {diseaseClasses.map((item, idx) => (
              <div
                key={idx}
                className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                        item.color === "emerald"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : item.color === "amber"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Class {idx}</span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-slate-900">{item.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                    Recommended Action
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {item.protocol}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Cloud Storage Informational Note (No Public Image Upload Trigger) */}
          <div className="mt-12 p-6 rounded-2xl bg-emerald-950 text-emerald-100 border border-emerald-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-800/60 text-emerald-300 shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <span className="font-bold text-sm text-white block">Private Cloud Storage Architecture</span>
                <span className="text-xs text-emerald-300/80">
                  Flock photographs are securely compartmentalized in private Supabase Storage buckets (<code className="text-emerald-200">poultry-images</code>). Visual screening is accessed within the authenticated farmer dashboard via 1-hour signed URLs.
                </span>
              </div>
            </div>
            <Link
              to="/login"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap"
            >
              Sign In to Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section id="features" className="py-24 bg-[#fafaf9] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-emerald-800 uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
              <Layers size={14} />
              Full Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Built for Commercial & Smallholder Flocks
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Every feature is built around the operational challenges of poultry farms—balancing microclimate biology, disease vectors, and farm management.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                      {item.icon}
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        item.badgeType === "operational"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (OPERATIONAL WORKFLOW) ================= */}
      <section id="how-it-works" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-emerald-800 uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
              <Activity size={14} />
              Operational Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              How Poultry Guard AI Works
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              From in-shed physical sensors to cloud inference and immediate biosecurity alerts—data travels smoothly through a verified pipeline.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-5 gap-6">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative p-6 rounded-3xl bg-[#f8fafc] border border-slate-200 flex flex-col justify-between hover:border-emerald-300 transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-extrabold text-emerald-700">{step.step}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                      {step.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 max-w-3xl mx-auto">
            <strong>Multi-Modal Resilience:</strong> Sensors, optical vision, and acoustic inputs operate independently. If an internet interruption delays live telemetry, historical readings remain intact with zero synthetic extrapolation.
          </div>
        </div>
      </section>

      {/* ================= ROLE-BASED PORTALS ================= */}
      <section id="roles" className="py-24 bg-[#f8fafc] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-emerald-800 uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
              <Users size={14} />
              Dedicated Portals
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Tailored Portals for Every Contributor
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Strict role-based authentication ensures data privacy, device integrity, and administrative oversight.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, idx) => (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-white border border-slate-200 flex flex-col justify-between space-y-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{role.icon}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {role.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{role.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{role.desc}</p>

                  <div className="pt-2 space-y-1.5">
                    {role.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={role.link}
                  className="w-full text-center py-3 rounded-xl border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-700 font-bold text-xs transition-colors block"
                >
                  {role.actionText} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ABOUT SECTION ================= */}
      <section id="about" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-emerald-800 uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
              <FileText size={14} />
              About the Mission
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Biosecurity Prevention Over Crisis Intervention
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Poultry farming in India is subject to high environmental stress and devastating viral epidemics like Infectious Coryza and Fowlpox. Poultry Guard AI empowers farm operators to act early.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-slate-900">Biosecurity Defense</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Early alarm triggers on microclimate anomalies prevent respiratory epithelial damage, keeping natural flock immunity resilient against opportunistic bacteria.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                📊
              </div>
              <h3 className="text-xl font-bold text-slate-900">Empirical Records</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Replace unsearchable paper ledgers with immutable cloud audit trails for batch mortality, feed conversion ratios, vaccination timestamps, and biosecurity events.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-slate-900">Rapid Response</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Immediate detection of symptom indicators drastically limits disease spread, saving thousands of birds and preserving farm profitability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CALL TO ACTION BANNER ================= */}
      <section className="py-20 bg-gradient-to-br from-[#062817] via-[#094022] to-[#041d11] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider inline-block">
            Start Guarding Your Flock Today
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto">
            Ready to Protect Your Poultry Flock with Precision AI?
          </h2>
          <p className="text-base sm:text-lg text-emerald-100/80 max-w-2xl mx-auto leading-relaxed">
            Join registered poultry farmers and growers across Maharashtra. Getting started takes only two minutes.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-950/60 transition-all hover:scale-[1.02] whitespace-nowrap"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 rounded-xl border border-emerald-400/40 hover:border-emerald-300 text-white font-bold text-base transition-colors whitespace-nowrap"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-950 text-slate-400 py-16 text-sm border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-white text-xl">PoultryGuard</span>
                  <span className="font-extrabold text-emerald-400 text-xl">AI</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Intelligent poultry health management platform featuring ESP8266 IoT microclimate telemetry, ResNet-18 computer vision disease classification, private encrypted image storage, and automated biosecurity risk alerts.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
                <strong>Biosecurity Disclaimer:</strong> AI model predictions and sensor telemetry provide automated decision support and early alerts for farm management.
              </p>
            </div>

            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Platform Navigation</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Home</a></li>
                <li><a href="#hardware" className="hover:text-emerald-400 transition-colors">IoT Hardware & Sensor Rig</a></li>
                <li><a href="#ai-vision" className="hover:text-emerald-400 transition-colors">ResNet-18 Vision Model</a></li>
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Platform Capabilities</a></li>
                <li><a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a></li>
                <li><a href="#about" className="hover:text-emerald-400 transition-colors">About Our Mission</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Portals & Authentication</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/login" className="hover:text-emerald-400 transition-colors">Farmer Sign In</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition-colors">Operations Portal</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition-colors">Vendor Access</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition-colors">Administrator Portal</Link></li>
                <li><Link to="/register" className="hover:text-emerald-400 transition-colors">Create New Account</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 Poultry Guard AI. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-slate-400">ThingSpeak Telemetry Engine</span>
              <span className="hover:text-slate-400">ResNet-18 v2 Vision Model</span>
              <span className="hover:text-slate-400">Private Cloud Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
