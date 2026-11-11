import { useEffect, useState } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  ArrowLeft as BackIcon,
  MapPin,
  Clock3,
  Gift,
  Repeat2,
  Clipboard,
  Bookmark,
  MessageCircle,
  ShieldCheck,
  BookOpen,
  Tag,
  Layers,
  Package,
  X,
} from "lucide-react";
import { API_URL, readApiResponse } from "../lib/api";
import { HANDOVER_OPTIONS } from "../lib/handover";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Product states
  const [item, setItem] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Request states
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [handoverPreference, setHandoverPreference] = useState("");
  const [handoverDetails, setHandoverDetails] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setItem(null);
        setError("");
        setRequestSuccess("");

        const response = await fetch(`${API_URL}/items/${id}`);

        // Handle removed or unavailable products
if (response.status === 404) {
  setError(
    "This product is no longer available. It may have been removed by the administrator or is no longer listed."
  );
  return;
}

if (!response.ok) {
  throw new Error("Unable to load this item. Please try again.");
}

const data = await readApiResponse(response);

setItem(data);
setCurrentImage(0);

} catch (err) {
  console.error("Product loading error:", err);

  setError(
    err.message || "Unable to connect to ShareBox. Please try again."
  );
}
    };

    fetchProduct();
  }, [id]);

  // Submit buyer request
  const handleRequestSubmit = async (e) => {
    e.preventDefault();

    if (!handoverPreference) {
      setRequestError("Choose a preferred pickup or delivery arrangement.");
      return;
    }

    if (handoverPreference === "custom" && !handoverDetails.trim()) {
      setRequestError("Describe your preferred handover arrangement.");
      return;
    }

    if (
      requestMessage.trim().length > 500 ||
      handoverDetails.trim().length > 500
    ) {
      setRequestError("Messages and handover details cannot exceed 500 characters.");
      return;
    }

    setRequestLoading(true);
    setRequestError("");

    try {
      const response = await fetch(`${API_URL}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          itemId: id,
          message: requestMessage.trim(),
          handoverPreference,
          handoverDetails:
            handoverPreference === "custom" ? handoverDetails.trim() : "",
        }),
      });

      const data = await readApiResponse(response);

      // Redirect unauthenticated users
      if (response.status === 401) {
        navigate("/login", {
          state: {
            from: location.pathname,
          },
        });

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit your request."
        );
      }

      // Successful submission
      setRequestSuccess(
        data.message || "Your request was submitted successfully!"
      );

      setRequestMessage("");
      setHandoverPreference("");
      setHandoverDetails("");
      setRequestOpen(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    } catch (err) {
      console.error("Request submission error:", err);
      setRequestError(err.message);
    } finally {
      setRequestLoading(false);
    }
  };

  // Close request modal
  const closeRequestModal = () => {
    if (requestLoading) return;

    setRequestOpen(false);
    setRequestError("");
    setRequestMessage("");
    setHandoverPreference("");
    setHandoverDetails("");
  };

  // Product loading error
  if (error) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="text-center">
          <Package
            size={40}
            className="mx-auto mb-4 text-slate-400"
          />

          <p className="text-lg font-semibold text-slate-800">
            {error}
          </p>

          <Link
            to="/"
            className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-white"
          >
            Back to items
          </Link>
        </div>
      </div>
    );
  }

  // Product loading
  if (!item) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-slate-500">
          Loading item...
        </p>
      </div>
    );
  }

  const images = item.itemImage || [];
  const isGiveaway = item.sharingType === "Giveaway";

  // Previous image
  const previousImage = () => {
    setCurrentImage((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  // Next image
  const nextImage = () => {
    setCurrentImage((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <>
      <main className="min-h-screen bg-slate-50 text-slate-900">

        {/* SUCCESS MESSAGE */}
        {requestSuccess && (
          <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              <span>{requestSuccess}</span>

              <button
                type="button"
                onClick={() => setRequestSuccess("")}
                aria-label="Dismiss success message"
                className="shrink-0 rounded-lg p-1 hover:bg-green-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* BREADCRUMB */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">

            <Link
              to="/"
              className="inline-flex items-center gap-2 transition hover:text-indigo-600"
            >
              <BackIcon size={16} />
              Back to items
            </Link>

            <span>/</span>

            <Link
              to="/"
              className="hover:text-indigo-600"
            >
              Home
            </Link>

            <span>/</span>

            <span className="max-w-[200px] truncate text-slate-800">
              {item.itemName}
            </span>

          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">

            {/* LEFT SECTION */}
            <section className="min-w-0">

              {/* PRODUCT IMAGES */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

                <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-xl bg-slate-50 sm:h-[400px]">

                  {images.length > 0 ? (
                    <img
                      src={images[currentImage]}
                      alt={item.itemName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Package
                        size={48}
                        className="mx-auto mb-2"
                      />
                      <p>No image available</p>
                    </div>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={previousImage}
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md transition hover:bg-indigo-50"
                      >
                        <ArrowLeft size={20} />
                      </button>

                      <button
                        type="button"
                        onClick={nextImage}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md transition hover:bg-indigo-50"
                      >
                        <ArrowRight size={20} />
                      </button>

                      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                        {currentImage + 1} / {images.length}
                      </span>
                    </>
                  )}

                </div>

                {/* IMAGE THUMBNAILS */}
                {images.length > 1 && (
                  <div className="mt-3 flex gap-3 overflow-x-auto pb-1">

                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setCurrentImage(index)}
                        aria-label={`View image ${index + 1}`}
                        className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-24 ${
                          currentImage === index
                            ? "border-indigo-600"
                            : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${item.itemName} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}

                  </div>
                )}

              </div>

              {/* DESCRIPTION */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">

                  <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Clipboard size={21} />
                  </div>

                  <h2 className="text-lg font-bold">
                    Description
                  </h2>

                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {item.itemDescription || "No description available."}
                </p>

                {/* ITEM INFORMATION */}
                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">

                  <div className="flex items-start gap-3">
                    <BookOpen
                      size={20}
                      className="mt-1 text-slate-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500">
                        Category
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {item.category || "Other"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Tag
                      size={20}
                      className="mt-1 text-slate-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500">
                        Condition
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        Not specified
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Layers
                      size={20}
                      className="mt-1 text-slate-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500">
                        Sharing type
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {item.sharingType}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </section>

            {/* RIGHT SECTION */}
            <section className="flex min-w-0 flex-col gap-5">

              {/* PRODUCT INFORMATION */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex flex-wrap items-center gap-2">

                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                      isGiveaway
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    {isGiveaway ? (
                      <Gift size={16} />
                    ) : (
                      <Repeat2 size={16} />
                    )}

                    {item.sharingType}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Available
                  </span>

                </div>

                <h1 className="mt-5 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                  {item.itemName}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-500">

                  <span className="flex items-center gap-2">
                    <MapPin size={18} />
                    {item.itemLocation || "Location not specified"}
                  </span>

                  {item.createdAt && (
                    <span className="flex items-center gap-2">
                      <Clock3 size={18} />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  )}

                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                  {/* REQUEST BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setRequestError("");
                      setRequestSuccess("");
                      setRequestOpen(true);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <MessageCircle size={19} />
                    Request this item
                  </button>

                  {/* SAVE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setSaved((prev) => !prev)}
                    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-5 py-3.5 font-medium transition ${
                      saved
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Bookmark
                      size={19}
                      fill={saved ? "currentColor" : "none"}
                    />

                    {saved ? "Saved" : "Save"}
                  </button>

                </div>

              </div>

              {/* SELLER INFORMATION */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center gap-4">

                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                    {item.ownerName?.[0]?.toUpperCase() || "S"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">
                      {item.ownerName || "ShareBox Member"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Item shared with the community
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alert("Messaging functionality will be added next.")
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 px-3 py-2.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    <MessageCircle size={17} />
                    Message
                  </button>

                </div>

              </div>

              {/* LOCATION */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center gap-3">
                  <MapPin size={21} />

                  <h2 className="text-lg font-bold">
                    Location
                  </h2>
                </div>

                <div className="mt-4 flex min-h-28 items-center gap-3 rounded-xl bg-slate-50 p-4">

                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-600">
                    <MapPin size={22} />
                  </div>

                  <div>
                    <p className="font-semibold">
                      {item.itemLocation || "Location not specified"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Item pickup location
                    </p>
                  </div>

                </div>

                <div className="mt-4 flex items-start gap-3 rounded-xl bg-indigo-50 p-3 text-sm leading-6 text-indigo-700">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0"
                  />

                  Confirm the pickup details with the item owner before meeting.
                </div>

              </div>

            </section>

          </div>
        </div>
      </main>

      {/* REQUEST MODAL */}
      {requestOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeRequestModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                Request this item
              </h2>

              <button
                type="button"
                onClick={closeRequestModal}
                disabled={requestLoading}
                aria-label="Close request modal"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>

            <p className="mt-2 text-sm text-slate-500">
              Send a message to the product owner about{" "}
              <span className="font-semibold text-slate-700">
                {item.itemName}
              </span>.
            </p>

            {/* REQUEST FORM */}
            <form onSubmit={handleRequestSubmit}>

              <label
                htmlFor="handoverPreference"
                className="mt-5 block text-sm font-semibold text-slate-700"
              >
                Preferred handover
              </label>
              <select
                id="handoverPreference"
                value={handoverPreference}
                onChange={(event) => {
                  setHandoverPreference(event.target.value);
                  setRequestError("");
                }}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Choose a free arrangement</option>
                {HANDOVER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {handoverPreference === "custom" && (
                <>
                  <label
                    htmlFor="handoverDetails"
                    className="mt-4 block text-sm font-semibold text-slate-700"
                  >
                    Describe your arrangement
                  </label>
                  <textarea
                    id="handoverDetails"
                    value={handoverDetails}
                    onChange={(event) => {
                      setHandoverDetails(event.target.value);
                      setRequestError("");
                    }}
                    placeholder="Suggest a convenient, free way to hand over the item..."
                    maxLength={500}
                    rows={3}
                    required
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {handoverDetails.length}/500
                  </p>
                </>
              )}

              <label
                htmlFor="requestMessage"
                className="mt-4 block text-sm font-semibold text-slate-700"
              >
                Your message
              </label>

              <textarea
                id="requestMessage"
                value={requestMessage}
                onChange={(e) => {
                  setRequestMessage(e.target.value);
                  setRequestError("");
                }}
                placeholder="Hi, I'm interested in this item..."
                maxLength={500}
                rows={5}
                required
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {requestMessage.length}/500
              </p>

              {/* ERROR */}
              {requestError && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                >
                  {requestError}
                </div>
              )}

              {/* FORM BUTTONS */}
              <div className="mt-5 flex gap-3">

                <button
                  type="button"
                  onClick={closeRequestModal}
                  disabled={requestLoading}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    requestLoading ||
                    !requestMessage.trim() ||
                    !handoverPreference ||
                    (handoverPreference === "custom" && !handoverDetails.trim())
                  }
                  className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requestLoading ? "Sending..." : "Send Request"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </>
  );
}

export default ProductDetails;