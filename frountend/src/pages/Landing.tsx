import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, usePresence } from "motion/react";
import { ArrowRight, ArrowUpRight, Bone, BookOpen, Dna, Gem, Leaf, Plus } from "lucide-react";

/* ---------------- Data ---------------- */

const chaptersData = [
  { name: "Age of Dinosaurs", image: "/assets/01.png" },
  { name: "Fossils of Ancient Life", image: "/assets/02.png" },
  { name: "Reptiles of the Mesozoic", image: "/assets/03.png" },
  { name: "Marine Fossil Gallery", image: "/assets/04.png" },
  { name: "Prehistoric Giants", image: "/assets/05.png" },
];

const VIDEO_URL = "/assets/hero.mp4";
const PTERODACTYL_URL = "/assets/pterodactyl.png";

/* ---------------- Animation variants ---------------- */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const letterBlock = {
  initial: { y: 120, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ---------------- NHM Logo (animated SVG) ---------------- */

function NhmLogo() {
  return (
    <motion.h1
      variants={{
        initial: { scale: 1.03 },
        animate: { scale: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
      }}
      className="w-full"
    >
      <svg viewBox="0 0 840 100" className="w-full fill-[#111]" aria-label="NHM">
        {/* N */}
        <g transform="translate(0,0)">
          <motion.polygon variants={letterBlock} points="0,0 14,0 14,100 0,100" />
          <motion.polygon variants={letterBlock} points="200,0 214,0 214,100 200,100" />
          <motion.polygon variants={letterBlock} points="0,0 33,0 214,100 181,100" />
        </g>
        {/* H */}
        <g transform="translate(280,0)">
          <motion.polygon variants={letterBlock} points="0,0 14,0 14,100 0,100" />
          <motion.polygon variants={letterBlock} points="200,0 214,0 214,100 200,100" />
          <motion.polygon variants={letterBlock} points="14,43 200,43 200,57 14,57" />
        </g>
        {/* M */}
        <g transform="translate(560,0)">
          <motion.polygon variants={letterBlock} points="0,0 14,0 14,100 0,100" />
          <motion.polygon variants={letterBlock} points="266,0 280,0 280,100 266,100" />
          <motion.polygon variants={letterBlock} points="0,0 26,0 153,100 127,100" />
          <motion.polygon variants={letterBlock} points="254,0 280,0 153,100 127,100" />
        </g>
      </svg>
    </motion.h1>
  );
}

/* ---------------- Sand dissolve image ---------------- */

function SandTransitionImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isPresent, safeToRemove] = usePresence();
  const filterId = useRef(`sand-${Math.floor(performance.now() * 1000) % 1_000_000}`).current;
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const offsetRef = useRef<SVGFEOffsetElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const matrixRef = useRef<SVGFEColorMatrixElement>(null);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const DURATION = 900;
    const entering = isPresent;

    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = entering ? 1 - Math.pow(1 - t, 4) : Math.pow(t, 3);
      const progress = entering ? 1 - eased : eased; // 1 = fully dissolved, 0 = solid

      dispRef.current?.setAttribute("scale", String(progress * 150));
      offsetRef.current?.setAttribute("dy", String(entering ? -progress * 80 : progress * 120));
      offsetRef.current?.setAttribute("dx", String((entering ? -1 : 1) * progress * 30));
      blurRef.current?.setAttribute("stdDeviation", String(progress * 6));
      matrixRef.current?.setAttribute(
        "values",
        `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${Math.max(0, 1 - progress * 1.2)} 0`
      );

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!entering) {
        safeToRemove?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPresent, safeToRemove]);

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves={4} result="noise" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale={0} result="disp" />
          <feOffset ref={offsetRef} in="disp" dx={0} dy={0} result="off" />
          <feGaussianBlur ref={blurRef} in="off" stdDeviation={0} result="blur" />
          <feColorMatrix ref={matrixRef} in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        className={className}
        style={{ filter: `url(#${filterId})` }}
      />
    </>
  );
}

/* ---------------- Header ---------------- */

const NAV_LINKS = ["Visit", "Exhibitions", "Discover", "Learn", "About"];

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <motion.header
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
      className="relative pt-6 px-6 md:px-16 z-20"
    >
      <NhmLogo />

      <div className="flex justify-between items-start mt-8 text-[10px] md:text-[11px] font-mono tracking-[0.2em] uppercase">
        {/* Left */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-[15%] text-gray-800 leading-relaxed"
        >
          <div>Natura</div>
          <div>History</div>
          <div>Museum</div>
        </motion.div>

        <ArrowRight size={14} strokeWidth={1} className="hidden md:block text-gray-400 mt-1 w-[5%]" />

        {/* Center */}
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 md:w-[30%] md:flex-none text-gray-800 leading-relaxed font-mono"
        >
          Exploring the story of life on earth through science, discovery and wonder.
        </motion.p>

        <ArrowRight size={14} strokeWidth={1} className="hidden md:block text-gray-400 mt-1 w-[5%]" />

        {/* Right nav */}
        <motion.nav
          variants={fadeUp}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden md:block w-[15%] text-gray-800 space-y-1"
        >
          {NAV_LINKS.map((l) => (
            <div key={l} className="hover:text-black hover:underline cursor-pointer">
              {l}
            </div>
          ))}
        </motion.nav>

        {/* Hamburger */}
        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden relative z-[60] flex flex-col gap-[6px] group"
        >
          <span
            className={
              "h-[1.5px] bg-black transition-all duration-300 " +
              (open ? "w-8 rotate-45 translate-y-[3.75px]" : "w-8 group-hover:w-6")
            }
          />
          <span
            className={
              "h-[1.5px] bg-black transition-all duration-300 " +
              (open ? "w-8 -rotate-45 -translate-y-[3.75px]" : "w-8 group-hover:w-10")
            }
          />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="md:hidden absolute left-0 right-0 top-full mt-4 bg-[#fcfcfc] border-b border-gray-200 shadow-xl px-6 py-8 z-40"
          >
            <div className="space-y-6 text-sm font-mono tracking-[0.2em] uppercase">
              {NAV_LINKS.map((l) => (
                <div key={l} className="text-gray-800">
                  {l}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ---------------- Section 1: Hero ---------------- */

function Hero() {
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowVideo(true), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative w-full min-h-screen flex flex-col overflow-hidden">
      <Header />

      {/* Background video */}
      <AnimatePresence>
        {showVideo && (
          <motion.video
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-0"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={VIDEO_URL} type="video/mp4" />
          </motion.video>
        )}
      </AnimatePresence>

      <div className="relative flex flex-1 justify-between">
        {/* Left sidebar */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } } }}
          className="px-10 md:px-16 mt-20 sm:mt-28 md:mt-32 w-[320px] z-10"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6 text-xs font-mono">
            <span>01</span>
            <span className="w-16 h-[1.5px] bg-black/20" />
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[3.5rem] md:text-[5rem] font-normal tracking-tight leading-[1] mb-6"
          >
            TIMELESS
            <br />
            WONDERS
          </motion.h2>

          <motion.p variants={fadeUp} className="text-[13px] md:text-[14px] text-gray-700 w-[240px] leading-[1.6] mb-8">
            Step into the natural world and discover the stories written millions of years ago.
          </motion.p>

          <motion.div variants={fadeUp}>
            <Link
              to="/encyclopedia"
              className="group relative inline-flex items-center gap-3 overflow-hidden bg-[#1a1a1a] px-6 py-3.5 border border-[#1a1a1a] rounded-md shadow-sm transition-transform duration-300 hover:-translate-y-[0.5px] hover:shadow-[3px_3px_0px_rgba(17,17,17,0.5)] active:translate-y-0 active:shadow-none"
            >
              <span className="absolute inset-0 bg-[#fcfcfc] -translate-x-[101%] group-hover:translate-x-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              <Leaf
                size={16}
                className="relative z-10 text-white group-hover:text-[#111] transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12 group-hover:-translate-y-1"
              />
              <span className="relative z-10 text-[15px] font-medium text-white group-hover:text-[#111] transition-colors duration-300">
                Explore Now
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Right sidebar */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.15, delayChildren: 0.9 } } }}
          className="hidden md:flex flex-col gap-8 w-[200px] mt-12 md:mt-20 px-6 z-10"
        >
          <motion.div variants={fadeUp}>
            <div className="text-[10px] font-bold font-mono tracking-widest uppercase mb-2">Tyrannosaurus Rex</div>
            <div className="text-[12px] text-gray-600 leading-[1.6]">
              Late Cretaceous period
              <br />
              68-66 million years ago
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500">Length</div>
              <div className="text-[13px] font-medium">12.3 m</div>
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-gray-500">Height</div>
              <div className="text-[13px] font-medium">4.0 m</div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link to="/encyclopedia" className="group flex items-center gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-full border border-gray-400 group-hover:border-black group-hover:bg-[#111] transition-colors">
                <Plus size={16} strokeWidth={1.5} className="text-black group-hover:text-white transition-colors" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">View Details</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll to explore */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="hidden md:flex items-center gap-3 absolute bottom-10 left-[2.5rem] md:left-[4rem] z-10"
      >
        <span className="grid place-items-center w-12 h-12 rounded-full border border-gray-300">
          <span className="flex gap-[4px]">
            <span className="w-[1px] h-[12px] bg-gray-600" />
            <span className="w-[1px] h-[12px] bg-gray-600" />
          </span>
        </span>
        <span className="text-[10px] font-mono tracking-widest uppercase text-gray-500 font-semibold">
          Scroll to explore
        </span>
      </motion.div>
    </section>
  );
}

/* ---------------- Section 2: Explore Our World ---------------- */

const PILLS = [
  { icon: Bone, label: "Dinosaurs" },
  { icon: Dna, label: "Ancient Life" },
  { icon: Gem, label: "Minerals" },
  { icon: Leaf, label: "Fossils" },
  { icon: BookOpen, label: "Learn More" },
];

function ExploreSection() {
  return (
    <section className="relative w-full min-h-[75vh] md:min-h-screen bg-[#fcfcfc] flex flex-col items-center pt-24 md:pt-32 pb-0 z-20">
      <div className="text-[10px] md:text-[11px] font-mono tracking-[0.2em] mb-12">
        <span className="text-gray-500">[ 02 ]</span>{" "}
        <span className="text-gray-900 font-bold uppercase">Explore Our World</span>
      </div>

      <motion.h2
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        className="text-[2.2rem] md:text-[3.5rem] lg:text-[4.2rem] leading-[1.1] font-medium tracking-tight text-[#111] max-w-[1000px] text-center px-6"
      >
        Unearth the stories of our planet's past through fossils, minerals, and ancient wonders.
      </motion.h2>

      <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={{ animate: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
        className="flex flex-wrap justify-center gap-3 md:gap-4 mt-12 mb-10 md:mb-24 px-6"
      >
        {PILLS.map(({ icon: Icon, label }) => (
          <motion.button
            key={label}
            variants={fadeUp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-[11px] font-medium uppercase tracking-wider bg-white/50 backdrop-blur-sm text-gray-800 hover:border-black hover:bg-black hover:text-white transition-colors"
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </motion.button>
        ))}
      </motion.div>

      <div className="min-h-[220px] md:min-h-[450px]" />

      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8 md:px-16 pb-8 md:pb-12 pointer-events-none">
        <span className="hidden md:block text-[10px] font-mono tracking-widest uppercase text-gray-500 font-medium">
          We don't just tell stories.
        </span>
        <span className="hidden md:block text-[10px] font-mono tracking-widest uppercase text-gray-500 font-medium">
          Paleontology (C) 2026
        </span>
      </div>
    </section>
  );
}

/* ---------------- Section 3: Ancient Collection (dark) ---------------- */

function AncientCollection() {
  const [activeChapter, setActiveChapter] = useState(2);

  useEffect(() => {
    const id = setInterval(() => setActiveChapter((prev) => (prev + 1) % chaptersData.length), 3500);
    return () => clearInterval(id);
  }, []);

  const counter = String(activeChapter + 1).padStart(2, "0");

  return (
    <section className="relative w-full bg-[#0a0a0a] text-white flex flex-col z-30">
      {/* Pterodactyl overlap — must NOT be clipped; it reaches up into the white section above */}
      <motion.img
        src={PTERODACTYL_URL}
        alt="Pterodactyl"
        initial={{ y: "-55%", opacity: 0 }}
        whileInView={{ y: "-68%", opacity: 1 }}
        viewport={{ margin: "100px" }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[160vw] md:w-[1100px] pointer-events-none z-20"
      />

      {/* Heading area */}
      <div className="relative px-8 md:px-16 pt-32 md:pt-48 mb-16 z-10 flex flex-col xl:flex-row justify-between gap-10">
        <h2 className="text-[1.8rem] md:text-[3rem] lg:text-[3.8rem] xl:text-[4rem] leading-[1.15] font-medium tracking-tight text-white max-w-[820px]">
          Curated from millions of years of wonder
          <span className="inline-flex gap-2 md:gap-3 align-middle mx-2 md:mx-4 translate-y-[-4px]">
            {[Bone, Dna, Leaf].map((Icon, i) => (
              <span
                key={i}
                className="grid place-items-center w-10 h-10 md:w-14 md:h-14 rounded-full border border-gray-600 bg-black text-gray-400 hover:bg-white hover:text-black hover:border-white transition-colors"
              >
                <Icon size={22} />
              </span>
            ))}
          </span>
          & discovery.
        </h2>

        <div className="shrink-0">
          <p className="text-[9px] md:text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-6 leading-relaxed">
            We don't just display fossils
            <br />
            We share earth's story
          </p>
          <div className="flex flex-wrap gap-3">
            {["Educational", "Authentic", "Inspiring"].map((t) => (
              <span
                key={t}
                className="px-5 py-2 rounded-full border border-gray-600 text-[9px] font-mono tracking-widest uppercase text-gray-300 hover:bg-white hover:text-black hover:border-white transition-colors cursor-default"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column panel */}
      <div className="relative z-10 flex flex-col md:flex-row border-t border-gray-800">
        {/* Left: image */}
        <div className="md:w-[35%] border-b md:border-b-0 md:border-r border-gray-800 min-h-[400px] md:min-h-[500px] flex flex-col justify-between p-6">
          <div className="text-gray-500 text-xl tracking-[0.3em]">***</div>
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <SandTransitionImage
                key={activeChapter}
                src={chaptersData[activeChapter].image}
                alt={chaptersData[activeChapter].name}
                className="absolute inset-0 w-[80%] h-[80%] m-auto object-contain mix-blend-lighten"
              />
            </AnimatePresence>
          </div>
          <div className="text-[10px] font-mono tracking-widest text-[#888] uppercase">
            <span className="text-[#888]">{counter}</span>
            <span className="text-[#333]"> / </span>
            <span className="text-[#333]">05</span>
          </div>
        </div>

        {/* Right: chapter list */}
        <div className="md:w-[65%]">
          <div className="border-b border-gray-800 p-8 flex justify-between text-[10px] font-mono text-gray-400 tracking-widest uppercase">
            <span>Explore the past. Understand the present.</span>
            <span>Chapter {counter}</span>
          </div>

          <ul>
            {chaptersData.map((ch, i) => {
              const active = i === activeChapter;
              return (
                <li
                  key={ch.name}
                  onClick={() => setActiveChapter(i)}
                  className={
                    "flex items-center justify-between border-b border-gray-800/80 py-8 px-8 cursor-pointer transition-colors " +
                    (active ? "text-white" : "text-[#444] hover:text-[#999]")
                  }
                >
                  <span className="text-2xl md:text-[2rem] font-medium tracking-tight">{ch.name}</span>
                  <AnimatePresence>
                    {active && (
                      <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <ArrowUpRight size={22} strokeWidth={1} className="text-gray-400" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 h-[1px] bg-gray-800" />
      <div className="relative z-10 px-8 py-8 text-[10px] font-mono tracking-widest text-gray-500 uppercase bg-[#0a0a0a]">
        Digging into our planet's past
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function Landing() {
  return (
    <main className="w-full overflow-x-hidden">
      <Hero />
      <ExploreSection />
      <AncientCollection />
    </main>
  );
}
