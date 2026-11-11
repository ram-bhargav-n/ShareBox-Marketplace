import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  RefreshCw,
  LoaderCircle,
  CheckCircle,
} from "lucide-react";
import { API_URL, readApiResponse } from "../lib/api";

function MyProducts() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  

  // FETCH MY PRODUCTS
  const fetchMyProducts = useCallback(async () => {
    const response = await fetch(`${API_URL}/items/my`, {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 401) {
      navigate("/login", {
        replace: true,
        state: { from: "/my-products" },
      });
      return null;
    }

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to load your products.");
    }

    return data.items || [];
  }, [navigate]);

  useEffect(() => {
    let active = true;

    fetchMyProducts()
      .then((loadedItems) => {
        if (active && loadedItems) {
          setItems(loadedItems);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          console.error("My Products error:", err);
          setError(err.message || "Something went wrong.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchMyProducts]);

  const handleRefresh = async () => {
    setError("");
    setLoading(true);

    try {
      const loadedItems = await fetchMyProducts();
      if (loadedItems) setItems(loadedItems);
    } catch (err) {
      console.error("My Products error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
  const status = item.status || "Available";

  if (activeFilter === "All") {
    return true;
  }

  return status === activeFilter;
});

  // DELETE PRODUCT
  const handleDelete = async (itemId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await readApiResponse(response);

      if (response.status === 401) {
        navigate("/login", {
          replace: true,
          state: { from: "/my-products" },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete listing.");
      }

      setItems((previousItems) =>
        previousItems.filter((item) => item._id !== itemId)
      );

    } catch (err) {
      alert(err.message || "Failed to delete listing.");
    }
  };

  // MARK PRODUCT AS COMPLETED
  const handleComplete = async (itemId) => {
    const confirmed = window.confirm(
      "Have you successfully completed this giveaway or exchange? This action cannot be undone."
    );

    if (!confirmed) return;

    setCompletingId(itemId);

    try {
      const response = await fetch(
        `${API_URL}/requests/item/${itemId}/complete`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await readApiResponse(response);

      if (response.status === 401) {
        navigate("/login", {
          replace: true,
          state: { from: "/my-products" },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to complete this product."
        );
      }

      // Update product status immediately
      setItems((previousItems) =>
        previousItems.map((item) =>
          item._id === itemId
            ? { ...item, status: "Completed" }
            : item
        )
      );

      alert("Product marked as completed successfully!");

    } catch (err) {
      alert(err.message || "Something went wrong.");
    } finally {
      setCompletingId(null);
    }
  };

  // STATUS BADGE
  const getStatusStyle = (status) => {
    switch (status || "Available") {
      case "Reserved":
        return "bg-amber-100 text-amber-700";

      case "Completed":
        return "bg-green-100 text-green-700";

      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-indigo-600">
              Seller Dashboard
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              My Products
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage the products you have shared with your community.
            </p>
          </div>

          <button
            onClick={() => navigate("/offer-item")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={19} />
            Add Product
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoaderCircle
              size={35}
              className="animate-spin text-indigo-600"
            />
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">
            {error}

            <button
              onClick={handleRefresh}
              className="ml-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <Package
              size={48}
              className="mx-auto mb-4 text-slate-400"
            />

            <h2 className="text-xl font-bold text-slate-800">
              No products yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Products you publish will appear here.
            </p>

            <button
              onClick={() => navigate("/offer-item")}
              className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Publish Your First Product
            </button>
          </div>
        )}

        {/* PRODUCT LIST */}
        {!loading && !error && items.length > 0 && (
          <>
           {/* PRODUCT STATUS FILTERS */}
<div className="mb-6 flex flex-wrap gap-3">

  {["All", "Available", "Reserved", "Completed"].map((filter) => (
    <button
      key={filter}
      onClick={() => setActiveFilter(filter)}
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
        activeFilter === filter
          ? "bg-indigo-600 text-white shadow"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50"
      }`}
    >
      {filter}
      {filter === "All"
        ? ` (${items.length})`
        : ` (${items.filter(
            (item) => (item.status || "Available") === filter
          ).length})`}
    </button>
  ))}

</div>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold text-slate-700">
                {filteredItems.length} Listing(s)
              </p>

              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {filteredItems.map((item) => {
                const status = item.status || "Available";

                return (
                  <article
                    key={item._id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
                  >

                    {/* PRODUCT IMAGE */}
                    <div className="relative h-52 bg-slate-100">
                      <img
                        src={item.itemImage?.[0]}
                        alt={item.itemName}
                        className="h-full w-full object-cover"
                      />

                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow">
                        {item.sharingType}
                      </span>

                      <span
                        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow ${getStatusStyle(status)}`}
                      >
                        {status}
                      </span>
                    </div>

                    {/* PRODUCT DETAILS */}
                    <div className="p-5">

                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {item.itemName}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {item.itemDescription}
                      </p>

                      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={16} />
                        {item.itemLocation}
                      </p>

                      {/* COMPLETE BUTTON */}
                      {status === "Reserved" && (
                        <button
                          onClick={() => handleComplete(item._id)}
                          disabled={completingId === item._id}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {completingId === item._id ? (
                            <>
                              <LoaderCircle
                                size={17}
                                className="animate-spin"
                              />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={17} />
                              Mark as Completed
                            </>
                          )}
                        </button>
                      )}

                      {/* COMPLETED MESSAGE */}
                      {status === "Completed" && (
                        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-3 text-sm font-semibold text-green-700">
                          <CheckCircle size={18} />
                          Transaction Completed
                        </div>
                      )}

                      {/* EDIT AND DELETE */}
                      <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">

                        <button
                          onClick={() =>
                            navigate(`/edit-product/${item._id}`)
                          }
                          disabled={status === "Completed"}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil size={16} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(item._id)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>

                      </div>
                    </div>
                  </article>
                );
              })}

            </div>
          </>
        )}

      </div>
    </main>
  );
}

export default MyProducts;