
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PackagePlus,
  MapPin,
  LoaderCircle,
  ArrowLeft,
  ImagePlus,
} from "lucide-react";
import { API_URL, readApiResponse } from "../lib/api";
import { ITEM_CATEGORIES } from "../lib/categories";

const CLOUD_NAME = "tmsj9ho8";
const UPLOAD_PRESET = "sharebox_unsigned";

function OfferItem() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemName: "",
    itemDescription: "",
    category: "",
    sharingType: "",
    itemLocation: "",
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const selectedImages = Array.from(e.target.files || []);

    if (selectedImages.length < 1 || selectedImages.length > 5) {
      setImages([]);
      e.target.value = "";
      setMessage("Please select between 1 and 5 images.");
      setMessageType("error");
      return;
    }

    const validImages = selectedImages.every(
      (file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 5 * 1024 * 1024
    );

    if (!validImages) {
      setImages([]);
      e.target.value = "";
      setMessage("Use JPG, PNG, or WebP images up to 5 MB each.");
      setMessageType("error");
      return;
    }

    setImages(selectedImages);
    setMessage("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (images.length < 1 || images.length > 5) {
      setMessage("Please select between 1 and 5 images.");
      setMessageType("error");
      return;
    }

    if (
      !UPLOAD_PRESET ||
      UPLOAD_PRESET === "YOUR_UNSIGNED_UPLOAD_PRESET"
    ) {
      setMessage("Configure your Cloudinary upload preset first.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
  
      const imageUrls = [];

      for (const image of images) {
        const uploadData = new FormData();
        uploadData.append("file", image);
        uploadData.append("upload_preset", UPLOAD_PRESET);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: uploadData,
          }
        );

        const uploadResult = await readApiResponse(uploadResponse);

        if (!uploadResponse.ok) {
          throw new Error(
            uploadResult.error?.message || "Image upload failed."
          );
        }

        imageUrls.push(uploadResult.secure_url);
      }


      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          itemImage: imageUrls,
        }),
      });
      const data = await readApiResponse(response);

// Redirect unauthenticated users to Login
if (response.status === 401) {
  navigate("/login", {
    replace: true,
    state: { from: "/offer-item" },
  });
  return;
}

if (!response.ok) {
  throw new Error(data.message || "Failed to publish listing.");
}
      setMessage("Listing published successfully!");
      setMessageType("success");

      console.log("Saved item:", data.item);


      setFormData({
        itemName: "",
        itemDescription: "",
        category: "",
        sharingType: "",
        itemLocation: "",
      });

      setImages([]);

      e.target.reset();


      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      console.error("Error publishing item:", error);
      setMessage(error.message || "Something went wrong.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] isolate h-dvh w-full overflow-y-auto overscroll-contain bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <span className="text-sm font-semibold text-slate-500">
            ShareBox / Offer an Item
          </span>

          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Close form"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
          </button>
        </div>
      </header>


      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <PackagePlus size={30} strokeWidth={1.8} />
            </div>

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">
                Give something a second life
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Offer an Item
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                Share something you no longer need with someone who could use it.
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-sm leading-6 text-slate-600">
              Help your community waste less. Add clear details and photos so
              others know exactly what you're offering.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="itemName"
                className="text-sm font-semibold text-slate-800"
              >
                Item Name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="e.g. Scientific Calculator"
                required
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="itemDescription"
                className="text-sm font-semibold text-slate-800"
              >
                Item Description <span className="text-red-500">*</span>
              </label>

              <textarea
                id="itemDescription"
                name="itemDescription"
                value={formData.itemDescription}
                onChange={handleChange}
                placeholder="Describe the item's condition and useful details..."
                required
                maxLength={2000}
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />

              <p className="text-right text-xs text-slate-400">
                {formData.itemDescription.length}/2000 characters
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="category"
                className="text-sm font-semibold text-slate-800"
              >
                Category <span className="text-red-500">*</span>
              </label>

              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Choose a category</option>
                {ITEM_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="sharingType"
                className="text-sm font-semibold text-slate-800"
              >
                Sharing Type <span className="text-red-500">*</span>
              </label>

              <select
                id="sharingType"
                name="sharingType"
                value={formData.sharingType}
                onChange={handleChange}
                required
                className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Select a sharing type</option>
                <option value="Giveaway">Giveaway — Free to take</option>
                <option value="Exchange">Exchange — Swap for something</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="itemImage"
                className="text-sm font-semibold text-slate-800"
              >
                Item Images <span className="text-red-500">*</span>
              </label>

              <label
                htmlFor="itemImage"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50"
              >
                <ImagePlus size={30} className="mb-3 text-indigo-500" />

                <span className="text-sm font-semibold text-slate-800">
                  Choose images from your device
                </span>

                <span className="mt-1 text-xs leading-5 text-slate-500">
                  JPG, PNG or WebP · 1–5 images · Maximum 5 MB each
                </span>

                <input
                  type="file"
                  id="itemImage"
                  name="itemImage"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>

              {images.length > 0 && (
                <p className="text-sm font-medium text-indigo-600">
                  {images.length} image(s) selected
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="itemLocation"
                className="text-sm font-semibold text-slate-800"
              >
                Item Location <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <MapPin
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500"
                />

                <input
                  type="text"
                  id="itemLocation"
                  name="itemLocation"
                  value={formData.itemLocation}
                  onChange={handleChange}
                  placeholder="Enter your area or locality"
                  required
                  maxLength={150}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            {message && (
              <div
                role="status"
                aria-live="polite"
                className={
                  messageType === "success"
                    ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                    : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                }
              >
                {message}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                disabled={loading}
                className="order-2 cursor-pointer rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:order-1"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="order-1 cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
              >
                {loading && (
                  <LoaderCircle size={18} className="animate-spin" />
                )}

                {loading ? "Publishing Listing..." : "Publish Listing"}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            By publishing, you help build a community based on sharing and
            kindness.
          </p>
        </div>
      </main>
    </div>
  );
}

export default OfferItem;
