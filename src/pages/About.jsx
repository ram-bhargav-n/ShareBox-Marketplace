import { ArrowLeft, Gift, Heart, Repeat2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const principles = [
  {
    icon: Gift,
    title: "Give freely",
    description:
      "Offer something you no longer need and help it find a useful new home.",
  },
  {
    icon: Repeat2,
    title: "Exchange thoughtfully",
    description:
      "Connect with someone nearby and swap useful things, without money changing hands.",
  },
  {
    icon: Heart,
    title: "Build community",
    description:
      "Make sharing local, personal, and a little easier for everyone.",
  },
];

function About() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-7 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          <ArrowLeft size={17} />
          Back to the marketplace
        </Link>

        <section className="mt-8 overflow-hidden rounded-[2rem] bg-[#641E32] px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#DCE3D2]">
            <Sparkles size={17} />
            A community-powered sharing space
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            Useful things deserve
            <span className="block italic text-[#DCE3D2]">
              another story.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
            ShareBox helps people pass along items they no longer need and
            discover useful things from their community. Listings are for
            giveaways or direct exchanges—never sales.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {principles.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon size={21} />
              </span>
              <h2 className="mt-5 text-lg font-bold text-slate-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-sm font-medium text-slate-600">
          Share more. Waste less. Help good things find their next home.
        </p>
      </div>
    </main>
  );
}

export default About;
