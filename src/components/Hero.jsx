import {
  ArrowDown,
  ArrowRight,
  Armchair,
  BookOpen,
  Dumbbell,
  Gift,
  Heart,
  House,
  Monitor,
  Puzzle,
  Repeat2,
  Shapes,
  Shirt,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ITEM_CATEGORIES } from "../lib/categories";

const CATEGORY_ICONS = {
  "Books & Study": BookOpen,
  Electronics: Monitor,
  Furniture: Armchair,
  Clothing: Shirt,
  "Home & Kitchen": House,
  "Sports & Outdoors": Dumbbell,
  "Toys & Games": Puzzle,
  Other: Shapes,
};

function Hero({
  activeFilter,
  onFilterChange,
  activeCategory,
  onCategoryChange,
}) {
  const navigate = useNavigate();

  const browseListings = (filter) => {
    onFilterChange(filter);
    document.getElementById("marketplace-listings")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const browseCategory = (category) => {
    onCategoryChange(category);
    document.getElementById("marketplace-listings")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main className="overflow-hidden bg-[#F7F3EB] text-[#292725]">
      <section className="relative px-4 pb-14 pt-12 sm:px-7 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute -right-36 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#E8DFD0]/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E8DFD0] bg-white/80 px-4 py-2 text-xs font-semibold tracking-wide text-[#641E32]">
              <Sparkles size={15} />
              A kinder way to find what you need
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-[#292725] sm:text-5xl lg:text-7xl">
              Good things are
              <span className="block font-serif italic text-[#641E32]">
                meant to be shared.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#66705F] sm:text-lg sm:leading-8">
              Pass along what you no longer need, exchange something useful,
              and meet the people who make your community feel like home.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/offer-item")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#641E32] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#641E32]/15 transition hover:-translate-y-0.5 hover:bg-[#53192B] focus:outline-none focus:ring-2 focus:ring-[#641E32] focus:ring-offset-2"
              >
                Share an item
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                onClick={() => browseListings("")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8CDBD] bg-white/70 px-5 py-3.5 text-sm font-semibold text-[#292725] transition hover:border-[#641E32] hover:text-[#641E32]"
              >
                Explore the community
                <ArrowDown size={17} />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#7D8976]">
              <span className="inline-flex items-center gap-2">
                <Heart size={15} className="text-[#641E32]" />
                Made for neighbors
              </span>
              <span className="hidden h-4 w-px bg-[#D8CDBD] sm:block" />
              <span>No money. Just meaningful exchanges.</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-4 top-12 h-32 w-32 rounded-full bg-[#A3B18A]/35 blur-2xl sm:-left-8" />
            <div className="absolute -right-4 bottom-4 h-40 w-40 rounded-full bg-[#641E32]/10 blur-2xl sm:-right-8" />

            <div className="relative overflow-hidden rounded-[2rem] bg-[#641E32] p-6 text-white shadow-2xl shadow-[#641E32]/20 sm:p-9">
              <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full border border-white/10" />
              <div className="absolute -right-2 -top-4 h-32 w-32 rounded-full border border-white/10" />

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D8C1C7]">
                  ShareBox community
                </p>
                <h2 className="mt-3 max-w-sm font-serif text-3xl leading-tight sm:text-4xl">
                  A little less waste.
                  <span className="block italic text-[#DCE3D2]">
                    A lot more good.
                  </span>
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
                  Give away something useful or find a thoughtful exchange,
                  right where you live.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => browseListings("Giveaway")}
                    aria-pressed={activeFilter === "Giveaway"}
                    className={`group rounded-2xl border p-4 text-left transition ${
                      activeFilter === "Giveaway"
                        ? "border-[#DCE3D2] bg-white/15"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A3B18A] text-[#292725]">
                      <Gift size={20} />
                    </span>
                    <span className="mt-4 block text-sm font-semibold">
                      Give something away
                    </span>
                    <span className="mt-1 block text-xs text-white/65">
                      Pass it forward for free
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => browseListings("Exchange")}
                    aria-pressed={activeFilter === "Exchange"}
                    className={`group rounded-2xl border p-4 text-left transition ${
                      activeFilter === "Exchange"
                        ? "border-[#DCE3D2] bg-white/15"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8DFD0] text-[#641E32]">
                      <Repeat2 size={20} />
                    </span>
                    <span className="mt-4 block text-sm font-semibold">
                      Make an exchange
                    </span>
                    <span className="mt-1 block text-xs text-white/65">
                      Trade for something useful
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mx-auto -mt-4 w-[88%] rounded-b-2xl border border-[#E8DFD0] bg-white px-5 py-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm font-semibold text-[#292725]">
                Every item can find a new story.
              </p>
              <p className="mt-1 text-xs text-[#7D8976] sm:mt-0">
                Local sharing, made simple
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="category-heading"
        className="border-t border-[#E8DFD0] bg-white/60 px-4 py-8 sm:px-7 lg:px-10 lg:py-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7D8976]">
                Find something useful
              </p>
              <h2
                id="category-heading"
                className="mt-1 text-xl font-semibold text-[#292725] sm:text-2xl"
              >
                Browse by category
              </h2>
            </div>
            <button
              type="button"
              onClick={() => browseCategory("")}
              className={`text-sm font-semibold transition hover:text-[#641E32] ${
                activeCategory ? "text-[#7D8976]" : "text-[#641E32]"
              }`}
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {ITEM_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => browseCategory(category)}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center text-xs font-semibold transition sm:min-h-28 sm:text-sm ${
                    isActive
                      ? "border-[#641E32] bg-[#F8EEF0] text-[#641E32] shadow-sm"
                      : "border-[#E8DFD0] bg-white text-[#66705F] hover:-translate-y-0.5 hover:border-[#A3B18A] hover:text-[#641E32]"
                  }`}
                >
                  <Icon
                    size={21}
                    strokeWidth={1.8}
                    className={isActive ? "text-[#641E32]" : "text-[#7D8976]"}
                  />
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Hero;
