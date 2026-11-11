import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  ImageOff,
  ArrowUpRight,
  PackageSearch,
  SlidersHorizontal,
} from "lucide-react";
import { API_URL, readApiResponse } from "../lib/api";
import { ITEM_CATEGORIES } from "../lib/categories";

function Products({
  searchQuery = "",
  sharingType = "",
  onSharingTypeChange,
  category = "",
  onCategoryChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(`${API_URL}/items`);

        if (!response.ok) {
          throw new Error("Failed to fetch items. Please try again.");
        }

        const data = await readApiResponse(response);

        if (!Array.isArray(data)) {
          throw new Error("Invalid response received from server.");
        }

        setItems(data);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const openProduct = (id) => navigate(`/product/${id}`);

  const handleKeyDown = (event, id) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct(id);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesType = !sharingType || item.sharingType === sharingType;
    const matchesCategory =
      !category || (item.category || "Other") === category;
    const searchableText = [
      item.itemName,
      item.itemDescription,
      item.itemLocation,
      item.sharingType,
      item.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesType && matchesCategory && searchableText.includes(normalizedQuery);
  });
  const orderedItems = [...filteredItems].sort((a, b) => {
    const typeOrder = { Giveaway: 0, Exchange: 1 };
    return (typeOrder[a.sharingType] ?? 2) - (typeOrder[b.sharingType] ?? 2);
  });

  // LOADING STATE
  if (loading) {
    return (
      <section className="min-h-screen bg-[#F7F3EB] px-4 py-20">
        <div className="flex flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A3B18A] border-t-[#641E32]" />

          <p className="mt-5 text-sm font-medium text-[#7D8976]">
            Finding useful things for you...
          </p>
        </div>
      </section>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <section className="bg-[#F7F3EB] px-4 py-16">
        <div
          role="alert"
          className="mx-auto max-w-7xl rounded-2xl border border-[#E8DFD0] bg-white p-8 text-center text-[#641E32]"
        >
          {error}
        </div>
      </section>
    );
  }

  return (
    <section
      id="marketplace-listings"
      className="min-h-screen bg-[#F7F3EB] px-4 py-8 sm:px-7 lg:px-10 lg:py-10"
    >
      <div className="mx-auto max-w-7xl">

        {/* MARKETPLACE SECTION */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#E8DFD0] pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#7D8976]">
              GIVEAWAYS FIRST. EXCHANGES ALWAYS.
            </span>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#292725] sm:text-3xl">
              {category
                ? `${category} to discover`
                : sharingType === "Giveaway"
                  ? "Free giveaways"
                  : sharingType === "Exchange"
                    ? "Items to exchange"
                    : "Find something useful"}
            </h2>

            <p className="mt-2 text-sm text-[#7D8976]">
              Discover useful things shared freely by your community.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#E8DFD0] bg-white px-4 py-2.5 text-sm font-semibold text-[#641E32] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#A3B18A]" />
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "item" : "items"} found
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" aria-label="Filter by sharing type">
            {[
              { label: "Everything", value: "" },
              { label: "Giveaways", value: "Giveaway" },
              { label: "Exchanges", value: "Exchange" },
            ].map((filter) => (
              <button
                key={filter.value || "all"}
                type="button"
                onClick={() => onSharingTypeChange?.(filter.value)}
                aria-pressed={sharingType === filter.value}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  sharingType === filter.value
                    ? "border-[#641E32] bg-[#641E32] text-white"
                    : "border-[#E8DFD0] bg-white text-[#66705F] hover:border-[#A3B18A] hover:text-[#641E32]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="category-filter">
            Filter listings by category
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(event) => onCategoryChange?.(event.target.value)}
            className="min-w-48 rounded-full border border-[#E8DFD0] bg-white px-4 py-2.5 text-sm font-semibold text-[#66705F] outline-none transition focus:border-[#641E32] focus:ring-2 focus:ring-[#641E32]/15"
          >
            <option value="">All categories</option>
            {ITEM_CATEGORIES.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>

          {normalizedQuery && (
            <p className="flex items-center gap-2 text-xs font-medium text-[#7D8976]">
              <SlidersHorizontal size={15} />
              Results for &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          )}
        </div>

        {/* EMPTY STATE */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-[#E8DFD0] bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F3EB] text-[#641E32]">
              <PackageSearch size={30} />
            </div>

            <h3 className="mt-5 text-xl font-bold text-[#292725]">
              {items.length === 0 ? "Nothing shared yet" : "No matching items"}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7D8976]">
              {items.length === 0
                ? "There are no available items at the moment. Check back soon for new community listings."
                : "Try a different search or clear your filters to see more listings."}
            </p>
          </div>
        ) : (

          /* PRODUCT GRID */
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {orderedItems.map((item, index) => (
              <Fragment key={item._id}>
                {(index === 0 ||
                  orderedItems[index - 1].sharingType !== item.sharingType) && (
                  <div className="col-span-full flex items-center gap-3 pt-2 first:pt-0">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                        item.sharingType === "Giveaway"
                          ? "bg-[#A3B18A] text-[#292725]"
                          : item.sharingType === "Exchange"
                            ? "bg-[#641E32] text-white"
                            : "bg-[#E8DFD0] text-[#292725]"
                      }`}
                    >
                      {item.sharingType === "Giveaway"
                        ? "Giveaways · Free"
                        : item.sharingType === "Exchange"
                          ? "Exchanges"
                          : "Community items"}
                    </span>
                    <span className="h-px flex-1 bg-[#E8DFD0]" />
                  </div>
                )}
              <article
                role="link"
                tabIndex={0}
                aria-label={`View ${item.itemName}`}
                onClick={() => openProduct(item._id)}
                onKeyDown={(event) => handleKeyDown(event, item._id)}
                className="group min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-[#E8DFD0] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#A3B18A] hover:shadow-xl hover:shadow-[#641E32]/10 focus:outline-none focus:ring-2 focus:ring-[#641E32]"
              >

                {/* PRODUCT IMAGE */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#E8DFD0]">

                  {item.itemImage?.[0] ? (
                    <>
                      <img
                        src={item.itemImage[0]}
                        alt={item.itemName}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />

                      <div className="absolute inset-0 hidden flex-col items-center justify-center gap-2 text-[#7D8976]">
                        <ImageOff size={32} />
                        <span className="text-xs font-medium">
                          Image unavailable
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-[#7D8976]">
                      <ImageOff size={32} />
                      <span className="text-xs font-medium">
                        Image unavailable
                      </span>
                    </div>
                  )}

                  {/* PRODUCT TYPE */}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                        item.sharingType === "Giveaway"
                          ? "bg-[#A3B18A] text-[#292725]"
                          : "bg-[#641E32] text-white"
                      }`}
                    >
                      {item.sharingType}
                    </span>
                    <span className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#292725] shadow-sm">
                      {item.category || "Other"}
                    </span>
                  </div>

                  {/* HOVER ARROW */}
                  <div className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#641E32] text-white opacity-0 shadow-md transition group-hover:opacity-100">
                    <ArrowUpRight size={19} />
                  </div>
                </div>

                {/* PRODUCT DETAILS */}
                <div className="p-5">

                  <h3 className="truncate text-lg font-bold tracking-tight text-[#292725] transition group-hover:text-[#641E32]">
                    {item.itemName}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#7D8976]">
                    {item.itemDescription}
                  </p>

                  {/* LOCATION */}
                  <div className="mt-5 flex min-w-0 items-center gap-2 border-t border-[#F0E9DE] pt-4 text-xs text-[#7D8976]">
                    <MapPin
                      size={16}
                      className="shrink-0 text-[#A3B18A]"
                    />

                    <span className="truncate">
                      {item.itemLocation || "Location not specified"}
                    </span>
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#66705F]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#A3B18A]" />
                    {item.sharingType === "Giveaway"
                      ? "Free · available to request"
                      : "Available for exchange"}
                  </p>

                  {/* VIEW DETAILS */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#641E32]">
                      {item.sharingType === "Giveaway"
                        ? "View & request"
                        : "View exchange"}
                    </span>

                    <ArrowUpRight
                      size={18}
                      className="text-[#A3B18A] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </article>
              </Fragment>
            ))}

          </div>
        )}

      </div>
    </section>
  );
}

export default Products;