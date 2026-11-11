import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
ArrowLeft,
Save,
ImagePlus,
MapPin,
LoaderCircle,
X,
} from "lucide-react";
import { API_URL, readApiResponse } from "../lib/api";
import { ITEM_CATEGORIES } from "../lib/categories";

const CLOUD_NAME = "tmsj9ho8";
const UPLOAD_PRESET = "sharebox_unsigned";

function EditProduct() {
const { id } = useParams();
const navigate = useNavigate();

const [formData, setFormData] = useState({
itemName: "",
itemDescription: "",
category: "Other",
sharingType: "",
itemLocation: "",
});

const [existingImages, setExistingImages] = useState([]);
const [newImages, setNewImages] = useState([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");
const [message, setMessage] = useState("");

// LOAD EXISTING PRODUCT
useEffect(() => {
const fetchProduct = async () => {
try {
const response = await fetch(`${API_URL}/items/${id}`, {
credentials: "include",
});


    if (!response.ok) {
      throw new Error("Unable to load this product.");
    }

    const item = await readApiResponse(response);

    setFormData({
      itemName: item.itemName || "",
      itemDescription: item.itemDescription || "",
      category: item.category || "Other",
      sharingType: item.sharingType || "",
      itemLocation: item.itemLocation || "",
    });

    setExistingImages(item.itemImage || []);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

fetchProduct();


}, [id]);

// HANDLE TEXT INPUTS
const handleChange = (e) => {
const { name, value } = e.target;


setFormData((previous) => ({
  ...previous,
  [name]: value,
}));


};

// SELECT REPLACEMENT IMAGES
const handleImageChange = (e) => {
const selected = Array.from(e.target.files || []);


if (selected.length > 5) {
  setError("You can select a maximum of 5 images.");
  e.target.value = "";
  return;
}

const valid = selected.every(
  (file) =>
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= 5 * 1024 * 1024
);

if (!valid) {
  setError("Use JPG, PNG or WebP images up to 5 MB each.");
  e.target.value = "";
  return;
}

setNewImages(selected);
setError("");
setMessage("");


};

// UPLOAD NEW IMAGES TO CLOUDINARY
const uploadImages = async () => {
const imageUrls = [];


for (const image of newImages) {
  const uploadData = new FormData();

  uploadData.append("file", image);
  uploadData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: uploadData,
    }
  );

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data.error?.message || "Image upload failed.");
  }

  imageUrls.push(data.secure_url);
}

return imageUrls;


};

// SAVE PRODUCT CHANGES
const handleSubmit = async (e) => {
e.preventDefault();


setError("");
setMessage("");

if (
  !formData.itemName.trim() ||
  !formData.itemDescription.trim() ||
  !formData.category ||
  !formData.sharingType ||
  !formData.itemLocation.trim()
) {
  setError("Please complete all required fields.");
  return;
}

if (newImages.length === 0 && existingImages.length === 0) {
  setError("Please keep or upload at least one product image.");
  return;
}

setSaving(true);

try {
  let imageUrls = existingImages;

  // Replace all existing images only when new images are selected
  if (newImages.length > 0) {
    imageUrls = await uploadImages();
  }

  const response = await fetch(`${API_URL}/items/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...formData,
      itemName: formData.itemName.trim(),
      itemDescription: formData.itemDescription.trim(),
      itemLocation: formData.itemLocation.trim(),
      itemImage: imageUrls,
    }),
  });

  const data = await readApiResponse(response);

  if (response.status === 401) {
    navigate("/login", {
      replace: true,
      state: { from: `/edit-product/${id}` },
    });
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to update product.");
  }

  setMessage("Product updated successfully!");

  setTimeout(() => {
    navigate("/my-products");
  }, 1000);
} catch (err) {
  console.error("Update product error:", err);
  setError(err.message || "Something went wrong.");
} finally {
  setSaving(false);
}


};

if (loading) {
return ( <div className="flex min-h-screen items-center justify-center"> <LoaderCircle className="animate-spin text-indigo-600" size={35} /> </div>
);
}

return ( <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8"> <div className="mx-auto max-w-3xl">


    <button
      type="button"
      onClick={() => navigate("/my-products")}
      className="mb-7 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600"
    >
      <ArrowLeft size={18} />
      Back to My Products
    </button>

    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">

      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
        Seller Dashboard
      </p>

      <h1 className="text-3xl font-bold text-slate-900">
        Edit Product
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Update your listing details and keep your information accurate.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">

        {/* PRODUCT NAME */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Product Name
          </label>

          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            maxLength={100}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Description
          </label>

          <textarea
            name="itemDescription"
            value={formData.itemDescription}
            onChange={handleChange}
            rows={5}
            maxLength={2000}
            required
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <p className="mt-1 text-right text-xs text-slate-400">
            {formData.itemDescription.length}/2000
          </p>
        </div>

        {/* CATEGORY */}
        <div>
          <label
            htmlFor="category"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Category
          </label>

          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
          >
            {ITEM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* SHARING TYPE */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Sharing Type
          </label>

          <select
            name="sharingType"
            value={formData.sharingType}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
          >
            <option value="Giveaway">Giveaway</option>
            <option value="Exchange">Exchange</option>
          </select>
        </div>

        {/* LOCATION */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Product Location
          </label>

          <div className="relative">
            <MapPin
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500"
            />

            <input
              type="text"
              name="itemLocation"
              value={formData.itemLocation}
              onChange={handleChange}
              maxLength={150}
              required
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* EXISTING IMAGES */}
        <div>
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Current Product Images
          </label>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {existingImages.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="h-36 overflow-hidden rounded-xl border border-slate-200"
              >
                <img
                  src={image}
                  alt={`Product ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* REPLACE IMAGES */}
        <div>
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Replace Images (Optional)
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50">
            <ImagePlus size={30} className="mb-3 text-indigo-600" />

            <span className="text-sm font-semibold text-slate-700">
              Choose replacement images
            </span>

            <span className="mt-2 text-xs text-slate-500">
              JPG, PNG or WebP · Maximum 5 images · 5 MB each
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleImageChange}
              className="sr-only"
            />
          </label>

          {newImages.length > 0 && (
            <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
              {newImages.length} replacement image(s) selected.
              Saving will replace all current images.
              <button
                type="button"
                onClick={() => setNewImages([])}
                className="ml-2 inline-flex items-center gap-1 font-semibold underline"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <LoaderCircle size={19} className="animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save size={19} />
              Save Changes
            </>
          )}
        </button>

      </form>
    </div>
  </div>
</main>


);
}

export default EditProduct;
