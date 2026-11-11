import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Inbox,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { API_URL as API_BASE_URL, readApiResponse } from "../lib/api";
import { getHandoverLabel, HANDOVER_OPTIONS } from "../lib/handover";

const API_URL = `${API_BASE_URL}/requests`;

function Requests() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("incoming");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [handoverChoices, setHandoverChoices] = useState({});
  const [handoverDetails, setHandoverDetails] = useState({});
  const [messageDrafts, setMessageDrafts] = useState({});
  const [sendingMessageId, setSendingMessageId] = useState(null);

  const fetchRequests = useCallback(async () => {
    const endpoint = activeTab === "incoming" ? "/incoming" : "/mine";
    const response = await fetch(`${API_URL}${endpoint}`, {
      credentials: "include",
    });

    if (response.status === 401) {
      navigate("/login", {
        state: { from: "/requests" },
      });
      return null;
    }

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Unable to load requests.");
    }

    return Array.isArray(data) ? data : [];
  }, [activeTab, navigate]);

  useEffect(() => {
    let active = true;

    fetchRequests()
      .then((loadedRequests) => {
        if (active && loadedRequests) {
          setRequests(loadedRequests);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Requests loading error:", err);
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchRequests]);

  const handleTabChange = (tab) => {
    setLoading(true);
    setError("");
    setActiveTab(tab);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError("");

    try {
      const loadedRequests = await fetchRequests();
      if (loadedRequests) setRequests(loadedRequests);
    } catch (err) {
      console.error("Requests loading error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (requestId, action) => {
    setProcessingId(requestId);
    setError("");

    try {
      const endpoint =
        action === "cancel"
          ? `/${requestId}/cancel`
          : `/${requestId}/status`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        ...(action !== "cancel" && {
          body: JSON.stringify({
            status: action,
            ...(action === "Accepted" && {
              sellerHandoverPreference: handoverChoices[requestId],
              sellerHandoverDetails:
                handoverChoices[requestId] === "custom"
                  ? handoverDetails[requestId] || ""
                  : "",
            }),
          }),
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to update request.");
      }

      setLoading(true);
      const loadedRequests = await fetchRequests();
      if (loadedRequests) setRequests(loadedRequests);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const sendMessage = async (requestId) => {
    const text = (messageDrafts[requestId] || "").trim();
    if (!text) return;

    setSendingMessageId(requestId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${requestId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const data = await readApiResponse(response);

      if (response.status === 401) {
        navigate("/login", {
          state: { from: "/requests" },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to send message.");
      }

      setMessageDrafts((previous) => ({
        ...previous,
        [requestId]: "",
      }));
      const loadedRequests = await fetchRequests();
      if (loadedRequests) setRequests(loadedRequests);
    } catch (err) {
      setError(err.message || "Unable to send message.");
    } finally {
      setSendingMessageId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      case "Cancelled":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              ShareBox Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Requests Management
            </h1>

            <p className="mt-2 text-slate-500">
              Manage your product requests and incoming offers.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* TABS */}
        <div className="mb-7 flex gap-3 rounded-xl border border-slate-200 bg-white p-2">

          <button
            onClick={() => handleTabChange("incoming")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "incoming"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Inbox size={18} />
            Incoming Requests
          </button>

          <button
            onClick={() => handleTabChange("mine")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "mine"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Send size={18} />
            My Requests
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw
              size={28}
              className="mx-auto mb-3 animate-spin"
            />
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">

            <Package
              size={45}
              className="mx-auto mb-4 text-slate-300"
            />

            <h2 className="text-xl font-bold text-slate-800">
              No requests found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {activeTab === "incoming"
                ? "You haven't received any product requests yet."
                : "You haven't requested any products yet."}
            </p>

          </div>
        ) : (

          /* REQUEST CARDS */
          <div className="grid gap-5 md:grid-cols-2">

            {requests.map((request) => {
              const product = request.item;
              const person =
                activeTab === "incoming"
                  ? request.buyer
                  : request.seller;

              return (
                <div
                  key={request._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >

                  <div className="flex gap-4 p-5">

                    {/* PRODUCT IMAGE */}
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">

                      {product?.itemImage?.[0] ? (
                        <img
                          src={product.itemImage[0]}
                          alt={product.itemName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <Package className="text-slate-400" />
                        </div>
                      )}

                    </div>

                    {/* PRODUCT DETAILS */}
                    <div className="min-w-0 flex-1">

                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {product?.itemName || "Product unavailable"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {product?.sharingType || "Product"}
                      </p>

                      <span
                        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}
                      >
                        {request.status}
                      </span>

                    </div>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Handover arrangement
                    </p>
                    <div className="mt-3 rounded-xl bg-indigo-50/70 p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        Requester&apos;s preference
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {getHandoverLabel(request.handoverPreference)}
                      </p>
                      {request.handoverPreference === "custom" &&
                        request.handoverDetails && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                            {request.handoverDetails}
                          </p>
                        )}

                      {request.sellerHandoverPreference && (
                        <>
                          <p className="mt-4 text-xs font-semibold text-slate-500">
                            Seller&apos;s arrangement
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {getHandoverLabel(request.sellerHandoverPreference)}
                          </p>
                          {request.sellerHandoverPreference === "custom" &&
                            request.sellerHandoverDetails && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                                {request.sellerHandoverDetails}
                              </p>
                            )}
                        </>
                      )}
                    </div>

                    {activeTab === "incoming" && request.status === "Pending" && (
                      <div className="mt-4 space-y-3">
                        <label
                          htmlFor={`seller-handover-${request._id}`}
                          className="block text-sm font-semibold text-slate-700"
                        >
                          Choose your arrangement to accept
                        </label>
                        <select
                          id={`seller-handover-${request._id}`}
                          value={handoverChoices[request._id] || ""}
                          onChange={(event) =>
                            setHandoverChoices((previous) => ({
                              ...previous,
                              [request._id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Select an arrangement</option>
                          {HANDOVER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {handoverChoices[request._id] === "custom" && (
                          <textarea
                            value={handoverDetails[request._id] || ""}
                            onChange={(event) =>
                              setHandoverDetails((previous) => ({
                                ...previous,
                                [request._id]: event.target.value,
                              }))
                            }
                            placeholder="Describe the free handover arrangement..."
                            maxLength={500}
                            rows={3}
                            aria-label="Custom handover arrangement"
                            className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* PERSON DETAILS */}
                  <div className="border-t border-slate-100 px-5 py-4">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {activeTab === "incoming" ? "Requested by" : "Seller"}
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      {person?.picture ? (
                        <img
                          src={person.picture}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound size={19} />
                        </div>
                      )}
                      <p className="font-semibold text-slate-800">
                        {person?.name || "ShareBox Member"}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">

                      <p className="text-xs font-semibold text-slate-500">
                        Message
                      </p>

                      <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                        {request.message}
                      </p>

                    </div>

                      <div className="mt-4 rounded-xl border border-slate-100 p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Handover discussion
                        </p>

                        {request.discussion?.length > 0 && (
                          <div className="mt-3 max-h-56 space-y-3 overflow-y-auto">
                            {request.discussion.map((message) => (
                              <div
                                key={message._id}
                                className="rounded-lg bg-slate-50 p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-700">
                                    {message.sender?.name || "ShareBox Member"}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {new Date(message.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">
                                  {message.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {["Pending", "Accepted"].includes(request.status) && (
                          <form
                            className="mt-3 space-y-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              sendMessage(request._id);
                            }}
                          >
                            <textarea
                              value={messageDrafts[request._id] || ""}
                              onChange={(event) =>
                                setMessageDrafts((previous) => ({
                                  ...previous,
                                  [request._id]: event.target.value,
                                }))
                              }
                              placeholder="Coordinate a convenient, free handover..."
                              maxLength={500}
                              rows={2}
                              aria-label="Write a handover message"
                              className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-400">
                                {(messageDrafts[request._id] || "").length}/500
                              </span>
                              <button
                                type="submit"
                                disabled={
                                  sendingMessageId === request._id ||
                                  !(messageDrafts[request._id] || "").trim()
                                }
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {sendingMessageId === request._id
                                  ? "Sending..."
                                  : "Send message"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={14} />
                      {new Date(request.createdAt).toLocaleString()}
                    </p>

                  </div>

                  {/* ACTION BUTTONS */}
                  {request.status === "Pending" && (
                    <div className="flex gap-3 border-t border-slate-100 p-5">

                      {activeTab === "incoming" ? (
                        <>
                          <button
                            onClick={() =>
                              updateRequest(request._id, "Accepted")
                            }
                            disabled={
                              processingId === request._id ||
                              !handoverChoices[request._id] ||
                              (handoverChoices[request._id] === "custom" &&
                                !handoverDetails[request._id]?.trim())
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle size={17} />
                            Accept
                          </button>

                          <button
                            onClick={() =>
                              updateRequest(request._id, "Rejected")
                            }
                            disabled={processingId === request._id}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            <XCircle size={17} />
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            updateRequest(request._id, "cancel")
                          }
                          disabled={processingId === request._id}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle size={17} />
                          Cancel Request
                        </button>
                      )}

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>
    </main>
  );
}

export default Requests;