import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  LogOut,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  Menu,
  X,
  Search,
  Eye,
  Ban,
  CheckCircle2,
  UserRound,
  Trash2,
} from "lucide-react";
import { API_URL, readApiResponse } from "../lib/api";
import { getHandoverLabel } from "../lib/handover";


function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value ?? 0}
          </h2>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={25} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Available: "bg-blue-100 text-blue-700",
    Reserved: "bg-amber-100 text-amber-700",
    Completed: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Accepted: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
    Cancelled: "bg-slate-200 text-slate-700",
    admin: "bg-purple-100 text-purple-700",
    user: "bg-blue-100 text-blue-700",
    Active: "bg-green-100 text-green-700",
    Suspended: "bg-red-100 text-red-700",
    Removed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Available"}
    </span>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [usersPagination, setUsersPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [itemsPagination, setItemsPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [itemToRemove, setItemToRemove] = useState(null);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationLoading, setModerationLoading] = useState(false);

  // VERIFY ADMIN
  const verifyAdmin = useCallback(async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      navigate("/login", { replace: true });
      return null;
    }

    const data = await readApiResponse(response);
    const loggedInUser = data.user || data;

    if (loggedInUser.role !== "admin") {
      navigate("/", { replace: true });
      return null;
    }

    setUser(loggedInUser);
    return loggedInUser;
  }, [navigate]);

  // FETCH DASHBOARD
  const fetchDashboard = useCallback(async () => {
    const response = await fetch(`${API_URL}/admin/dashboard`, {
      credentials: "include",
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load dashboard");
    }

    setStatistics(data.statistics);
  }, []);

  // FETCH USERS
  const fetchUsers = async (search = userSearch, page = 1) => {
    const params = new URLSearchParams({
      search,
      page: String(page),
      limit: "10",
    });

    const response = await fetch(
      `${API_URL}/admin/users?${params.toString()}`,
      { credentials: "include" }
    );

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load users");
    }

    setUsers(data.users || []);
    setUsersPagination(
      data.pagination || {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      }
    );
  };

  // FETCH PRODUCTS
  const fetchItems = async (page = itemsPagination.page) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "50",
      sort: "oldest",
    });
    const response = await fetch(
      `${API_URL}/admin/items?${params.toString()}`,
      { credentials: "include" }
    );

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load products");
    }

    const pagination = data.pagination || {
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    };

    if (pagination.total > 0 && page > pagination.totalPages) {
      return fetchItems(pagination.totalPages);
    }

    setItems(data.items || []);
    setItemsPagination(pagination);
  };

  // FETCH REQUESTS
  const fetchRequests = async () => {
    const response = await fetch(`${API_URL}/admin/requests`, {
      credentials: "include",
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load requests");
    }

    setRequests(data.requests || []);
  };

  // LOAD TAB DATA
  const loadTabData = async (tab) => {
    setDataLoading(true);
    setError("");
    setSuccess("");

    try {
      if (tab === "dashboard") await fetchDashboard();
      if (tab === "users") await fetchUsers(userSearch, 1);
      if (tab === "items") await fetchItems();
      if (tab === "requests") await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  // INITIALIZE DASHBOARD
  useEffect(() => {
    const initialize = async () => {
      try {
        const admin = await verifyAdmin();

        if (admin) {
          await fetchDashboard();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [verifyAdmin, fetchDashboard]);

  // CHANGE TAB
  const changeTab = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    loadTabData(tab);
  };

  // SEARCH USERS
  const handleUserSearch = (event) => {
    event.preventDefault();
    loadUsers(userSearch, 1);
  };

  const loadUsers = async (search, page) => {
    setDataLoading(true);
    setError("");
    setSuccess("");

    try {
      await fetchUsers(search, page);
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  // SUSPEND OR REACTIVATE USER
  const handleSuspensionToggle = async (person) => {
    if (!person?._id || person.role === "admin") return;

    if (String(person._id) === String(user?.id)) {
      setError("You cannot modify your own account.");
      return;
    }

    const nextStatus = !person.isSuspended;

    const confirmed = window.confirm(
      nextStatus
        ? `Are you sure you want to suspend ${person.name}'s account?`
        : `Are you sure you want to reactivate ${person.name}'s account?`
    );

    if (!confirmed) return;

    setActionLoadingId(person._id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/admin/users/${person._id}/suspension`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isSuspended: nextStatus,
          }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update account status."
        );
      }

      setSuccess(data.message);
      await fetchUsers(userSearch, usersPagination.page);

      setSelectedUser((previous) =>
        previous && String(previous._id) === String(person._id)
          ? { ...previous, isSuspended: nextStatus }
          : previous
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // REMOVE PRODUCT
  const handleRemoveProduct = async (event) => {
    event.preventDefault();

    if (!itemToRemove?._id || !moderationReason.trim()) {
      setError("Please provide a reason for removing this product.");
      return;
    }

    setModerationLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/admin/items/${itemToRemove._id}/moderation`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: moderationReason.trim(),
          }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to remove product."
        );
      }

      setSuccess(data.message || "Product removed successfully.");
      setSelectedItemIds((previous) =>
        previous.filter((id) => id !== itemToRemove._id)
      );
      setItemToRemove(null);
      setModerationReason("");

      await fetchItems();
      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setModerationLoading(false);
    }
  };

  const handleDeleteSelectedItems = async () => {
    if (selectedItemIds.length === 0) return;

    setDeletingSelected(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/admin/items`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemIds: selectedItemIds }),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete selected listings.");
      }

      const deletedIds = data.deletedIds || [];
      setSelectedItemIds((previous) =>
        previous.filter((id) => !deletedIds.includes(id))
      );
      setDeleteSelectedOpen(false);

      if (data.skippedActiveRequestIds?.length) {
        setSuccess(
          `${data.deletedCount} listing(s) deleted. ${data.skippedActiveRequestIds.length} listing(s) were kept because they have pending or accepted requests.`
        );
      } else {
        setSuccess(`${data.deletedCount} listing(s) permanently deleted.`);
      }

      await fetchItems(itemsPagination.page);
      await fetchDashboard();
    } catch (err) {
      setError(err.message || "Unable to delete selected listings.");
    } finally {
      setDeletingSelected(false);
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      navigate("/login", { replace: true });
    } catch {
      setError("Logout failed. Please try again.");
    }
  };

  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
    },
    {
      id: "items",
      label: "Products",
      icon: Package,
    },
    {
      id: "requests",
      label: "Requests",
      icon: ClipboardList,
    },
  ];

  // LOADING SCREEN
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoaderCircle
          className="animate-spin text-indigo-600"
          size={35}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              ShareBox
            </h1>
            <p className="mt-1 text-xs text-indigo-300">
              ADMIN CONTROL CENTER
            </p>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-7">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Management
          </p>

          <div className="space-y-2">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  activeTab === id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-white/10 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-indigo-500/20 p-2">
              <ShieldCheck className="text-indigo-300" size={22} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name || "Administrator"}
              </p>
              <p className="text-xs text-indigo-300">
                Administrator
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-300 hover:bg-white/10"
          >
            <ArrowLeft size={18} />
            Back to ShareBox
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1">
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 lg:hidden"
            >
              <Menu size={24} />
            </button>

            <div>
              <h2 className="text-xl font-bold capitalize text-slate-900">
                {activeTab === "items" ? "Products" : activeTab}
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                ShareBox Administration
              </p>
            </div>
          </div>

          <button
            onClick={() => loadTabData(activeTab)}
            disabled={dataLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              size={16}
              className={dataLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        <section className="p-5 sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          {dataLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoaderCircle
                className="animate-spin text-indigo-600"
                size={35}
              />
            </div>
          ) : (
            <>
              {/* DASHBOARD */}
              {activeTab === "dashboard" && statistics && (
                <div>
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-slate-900">
                      Welcome back, {user?.name || "Admin"}!
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Here's an overview of your ShareBox platform.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                      title="Total Users"
                      value={statistics.users?.total}
                      icon={Users}
                      color="bg-indigo-100 text-indigo-600"
                    />
                    <StatCard
                      title="Total Products"
                      value={statistics.products?.total}
                      icon={Package}
                      color="bg-blue-100 text-blue-600"
                    />
                    <StatCard
                      title="Total Requests"
                      value={statistics.requests?.total}
                      icon={ClipboardList}
                      color="bg-purple-100 text-purple-600"
                    />
                    <StatCard
                      title="Available Products"
                      value={statistics.products?.available}
                      icon={Package}
                      color="bg-sky-100 text-sky-600"
                    />
                    <StatCard
                      title="Reserved Products"
                      value={statistics.products?.reserved}
                      icon={Package}
                      color="bg-amber-100 text-amber-600"
                    />
                    <StatCard
                      title="Completed Products"
                      value={statistics.products?.completed}
                      icon={ShieldCheck}
                      color="bg-green-100 text-green-600"
                    />
                  </div>

                  <div className="mt-8 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-5 font-bold text-slate-900">
                        Request Overview
                      </h3>

                      {Object.entries(statistics.requests || {})
                        .filter(([key]) => key !== "total")
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between border-b border-slate-100 py-3 text-sm last:border-0"
                          >
                            <span className="capitalize text-slate-500">
                              {key} Requests
                            </span>
                            <span className="font-bold text-slate-900">
                              {value}
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-4 font-bold text-slate-900">
                        Administration
                      </h3>
                      <p className="text-sm leading-7 text-slate-500">
                        Manage registered users, monitor product listings,
                        and review buyer requests from one central location.
                      </p>
                      <div className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
                        <ShieldCheck size={20} />
                        Admin access verified
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* USERS */}
              {activeTab === "users" && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Registered Users ({usersPagination.total})
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Search, view and manage ShareBox accounts.
                      </p>
                    </div>

                    <form
                      onSubmit={handleUserSearch}
                      className="flex gap-2"
                    >
                      <input
                        type="search"
                        placeholder="Search name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:w-64"
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <Search size={16} />
                        Search
                      </button>
                    </form>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Account Status</th>
                          <th className="p-4">Joined</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map((person) => {
                          const isAdmin = person.role === "admin";
                          const isCurrentUser =
                            String(person._id) === String(user?.id);
                          const isBusy = actionLoadingId === person._id;

                          return (
                            <tr
                              key={person._id}
                              className="border-t border-slate-100 hover:bg-slate-50/70"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {person.picture ? (
                                    <img
                                      src={person.picture}
                                      alt=""
                                      className="h-9 w-9 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                      <UserRound size={18} />
                                    </div>
                                  )}

                                  <span className="font-medium text-slate-900">
                                    {person.name}
                                    {isCurrentUser && (
                                      <span className="ml-2 text-xs text-indigo-500">
                                        You
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 text-slate-600">
                                {person.email}
                              </td>

                              <td className="p-4">
                                <StatusBadge status={person.role} />
                              </td>

                              <td className="p-4">
                                <StatusBadge
                                  status={
                                    person.isSuspended
                                      ? "Suspended"
                                      : "Active"
                                  }
                                />
                              </td>

                              <td className="p-4 text-slate-500">
                                {person.createdAt
                                  ? new Date(
                                      person.createdAt
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>

                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setSelectedUser(person)
                                    }
                                    title="View user details"
                                    className="rounded-lg border border-slate-200 p-2 text-indigo-600 transition hover:bg-indigo-50"
                                  >
                                    <Eye size={17} />
                                  </button>

                                  {!isAdmin && !isCurrentUser && (
                                    <button
                                      onClick={() =>
                                        handleSuspensionToggle(person)
                                      }
                                      disabled={isBusy}
                                      title={
                                        person.isSuspended
                                          ? "Reactivate account"
                                          : "Suspend account"
                                      }
                                      className={`rounded-lg border p-2 transition disabled:opacity-50 ${
                                        person.isSuspended
                                          ? "border-green-200 text-green-600 hover:bg-green-50"
                                          : "border-red-200 text-red-600 hover:bg-red-50"
                                      }`}
                                    >
                                      {isBusy ? (
                                        <LoaderCircle
                                          size={17}
                                          className="animate-spin"
                                        />
                                      ) : person.isSuspended ? (
                                        <CheckCircle2 size={17} />
                                      ) : (
                                        <Ban size={17} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {users.length === 0 && (
                    <p className="p-8 text-center text-slate-500">
                      No users found.
                    </p>
                  )}

                  <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-5 sm:flex-row">
                    <p className="text-sm text-slate-500">
                      Page {usersPagination.page} of{" "}
                      {usersPagination.totalPages || 1}
                      {" · "}
                      {usersPagination.total} users
                    </p>

                    <div className="flex gap-2">
                      <button
                        disabled={usersPagination.page <= 1}
                        onClick={() =>
                          loadUsers(
                            userSearch,
                            usersPagination.page - 1
                          )
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>

                      <button
                        disabled={
                          usersPagination.page >=
                          usersPagination.totalPages
                        }
                        onClick={() =>
                          loadUsers(
                            userSearch,
                            usersPagination.page + 1
                          )
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VISIBLE PRODUCTS */}
              {activeTab === "items" && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                    <h3 className="font-bold text-slate-900">
                      Visible Products ({itemsPagination.total})
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Removed listings are hidden here and from member views. Older visible listings are shown first.
                    </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteSelectedOpen(true)}
                      disabled={selectedItemIds.length === 0 || dataLoading}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Delete selected ({selectedItemIds.length})
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-4">
                            <input
                              type="checkbox"
                              aria-label="Select all listings on this page"
                              checked={
                                items.length > 0 &&
                                items.every((item) =>
                                  selectedItemIds.includes(item._id)
                                )
                              }
                              disabled={
                                items.length === 0 ||
                                (!items.every((item) =>
                                  selectedItemIds.includes(item._id)
                                ) &&
                                  items.filter(
                                    (item) =>
                                      !selectedItemIds.includes(item._id)
                                  ).length >
                                    50 - selectedItemIds.length)
                              }
                              onChange={(event) => {
                                const pageIds = items.map((item) => item._id);
                                setSelectedItemIds((previous) =>
                                  event.target.checked
                                    ? [...previous, ...pageIds].slice(0, 50)
                                    : previous.filter(
                                        (id) => !pageIds.includes(id)
                                      )
                                );
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="p-4">Product</th>
                          <th className="p-4">Description</th>
                          <th className="p-4">Seller</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Listed</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {items.map((item) => {
                          const currentStatus =
                            item.status || "Available";
                          const canRemove = currentStatus === "Available";

                          return (
                            <tr
                              key={item._id}
                              className="border-t border-slate-100"
                            >
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${item.itemName || "untitled listing"}`}
                                  checked={selectedItemIds.includes(item._id)}
                                  disabled={
                                    !selectedItemIds.includes(item._id) &&
                                    selectedItemIds.length >= 50
                                  }
                                  onChange={(event) =>
                                    setSelectedItemIds((previous) =>
                                      event.target.checked
                                        ? [...previous, item._id]
                                        : previous.filter(
                                            (id) => id !== item._id
                                          )
                                    )
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="p-4">
                                <p className="font-medium text-slate-900">
                                  {item.itemName || "Untitled listing"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {item.itemLocation ||
                                    "Location unavailable"}
                                </p>
                              </td>

                              <td className="max-w-xs whitespace-normal p-4 text-slate-600">
                                {item.itemDescription || (
                                  <span className="italic text-amber-700">
                                    No description
                                  </span>
                                )}
                              </td>

                              <td className="p-4 text-slate-600">
                                {item.createdBy?.name || "Unknown"}
                              </td>

                              <td className="p-4 text-slate-600">
                                {item.sharingType}
                              </td>

                              <td className="whitespace-nowrap p-4 text-slate-600">
                                {item.createdAt
                                  ? new Date(
                                      item.createdAt
                                    ).toLocaleDateString()
                                  : "Date unavailable"}
                              </td>

                              <td className="p-4">
                                <StatusBadge
                                  status={currentStatus}
                                />
                              </td>

                              <td className="p-4">
                                {canRemove ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setError("");
                                      setSuccess("");
                                      setModerationReason("");
                                      setItemToRemove(item);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                                  >
                                    <Trash2 size={15} />
                                    Remove
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Not removable
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {items.length === 0 && (
                    <p className="p-8 text-center text-slate-500">
                      No products found.
                    </p>
                  )}

                  <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-5 sm:flex-row">
                    <p className="text-sm text-slate-500">
                      Showing page {itemsPagination.page} of{" "}
                      {itemsPagination.totalPages || 1} · Oldest listings first
                      {selectedItemIds.length > 0 &&
                        ` · ${selectedItemIds.length} selected`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={dataLoading || itemsPagination.page <= 1}
                        onClick={async () => {
                          setDataLoading(true);
                          setError("");
                          try {
                            await fetchItems(itemsPagination.page - 1);
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setDataLoading(false);
                          }
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          dataLoading ||
                          itemsPagination.page >= itemsPagination.totalPages
                        }
                        onClick={async () => {
                          setDataLoading(true);
                          setError("");
                          try {
                            await fetchItems(itemsPagination.page + 1);
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setDataLoading(false);
                          }
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* REQUESTS */}
              {activeTab === "requests" && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-5">
                    <h3 className="font-bold text-slate-900">
                      All Requests ({requests.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-4">Product</th>
                          <th className="p-4">Buyer / Email</th>
                          <th className="p-4">Seller / Email</th>
                          <th className="p-4">Handover</th>
                          <th className="p-4">Message</th>
                          <th className="p-4">Discussion</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {requests.map((request) => (
                          <tr
                            key={request._id}
                            className="border-t border-slate-100"
                          >
                            <td className="p-4 font-medium text-slate-900">
                              <p>{request.item?.itemName || "Deleted product"}</p>
                              {request.item && (
                                <p className="mt-1 text-xs font-normal text-slate-500">
                                  {[request.item.category, request.item.sharingType]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </td>

                            <td className="p-4 text-slate-600">
                              <p className="font-medium text-slate-800">
                                {request.buyer?.name || "Unknown"}
                              </p>
                              <p>{request.buyer?.email || "No email"}</p>
                            </td>

                            <td className="p-4 text-slate-600">
                              <p className="font-medium text-slate-800">
                                {request.seller?.name || "Unknown"}
                              </p>
                              <p>{request.seller?.email || "No email"}</p>
                            </td>

                            <td className="min-w-52 p-4 text-slate-600">
                              <p className="font-medium text-slate-800">
                                Requester: {getHandoverLabel(
                                  request.handoverPreference
                                )}
                              </p>
                              {request.handoverDetails && (
                                <p className="mt-1 whitespace-pre-wrap text-xs">
                                  {request.handoverDetails}
                                </p>
                              )}
                              {request.sellerHandoverPreference && (
                                <p className="mt-2 font-medium text-slate-800">
                                  Seller: {getHandoverLabel(
                                    request.sellerHandoverPreference
                                  )}
                                </p>
                              )}
                              {request.sellerHandoverDetails && (
                                <p className="mt-1 whitespace-pre-wrap text-xs">
                                  {request.sellerHandoverDetails}
                                </p>
                              )}
                            </td>

                            <td className="max-w-xs whitespace-normal p-4 text-slate-600">
                              {request.message}
                            </td>

                            <td className="min-w-64 p-4 text-slate-600">
                              {request.discussion?.length ? (
                                <div className="max-h-40 space-y-2 overflow-y-auto">
                                  {request.discussion.map((message) => (
                                    <div
                                      key={message._id}
                                      className="rounded-lg bg-slate-50 p-2"
                                    >
                                      <p className="text-xs font-semibold text-slate-800">
                                        {message.sender?.name || "Unknown"}
                                        {message.sender?.email
                                          ? ` · ${message.sender.email}`
                                          : ""}
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-xs">
                                        {message.text}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No discussion yet
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              <StatusBadge status={request.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {requests.length === 0 && (
                    <p className="p-8 text-center text-slate-500">
                      No requests found.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* PRODUCT REMOVAL MODAL */}
      {deleteSelectedOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => {
            if (!deletingSelected) setDeleteSelectedOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Permanently delete listings?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Review the selected older listings before confirming.
                </p>
              </div>
              <button
                type="button"
                disabled={deletingSelected}
                onClick={() => setDeleteSelectedOpen(false)}
                aria-label="Close delete confirmation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800">
                {selectedItemIds.length} selected listing(s) will be permanently
                deleted. This cannot be undone.
              </p>
              <p className="mt-2 text-sm leading-6 text-red-700">
                Listings with pending or accepted requests will be kept.
                Existing request history is retained, but deleted product
                details will no longer be available.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletingSelected}
                onClick={() => setDeleteSelectedOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Keep listings
              </button>
              <button
                type="button"
                disabled={deletingSelected || selectedItemIds.length === 0}
                onClick={handleDeleteSelectedItems}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingSelected ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Permanently delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT REMOVAL MODAL */}
      {itemToRemove && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => {
            if (!moderationLoading) {
              setItemToRemove(null);
              setModerationReason("");
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Remove Product
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  This listing will be hidden from the marketplace, owner listings,
                  requests, and admin product dashboard. Its moderation record stays
                  in the database.
                </p>
              </div>

              <button
                type="button"
                disabled={moderationLoading}
                onClick={() => {
                  setItemToRemove(null);
                  setModerationReason("");
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Product
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {itemToRemove.itemName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Seller: {itemToRemove.createdBy?.name || "Unknown"}
              </p>
            </div>

            <form onSubmit={handleRemoveProduct}>
              <label
                htmlFor="moderationReason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reason for removal{" "}
                <span className="text-red-500">*</span>
              </label>

              <textarea
                id="moderationReason"
                value={moderationReason}
                onChange={(event) =>
                  setModerationReason(event.target.value)
                }
                placeholder="Explain why this listing should be removed..."
                maxLength={500}
                rows={4}
                required
                disabled={moderationLoading}
                className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {moderationReason.length}/500
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={moderationLoading}
                  onClick={() => {
                    setItemToRemove(null);
                    setModerationReason("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    moderationLoading || !moderationReason.trim()
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {moderationLoading ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 size={17} />
                      Confirm Removal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                User Details
              </h3>

              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center">
              {selectedUser.picture ? (
                <img
                  src={selectedUser.picture}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <UserRound size={35} />
                </div>
              )}

              <h4 className="mt-3 text-lg font-bold text-slate-900">
                {selectedUser.name}
              </h4>

              <p className="text-sm text-slate-500">
                {selectedUser.email}
              </p>
            </div>

            <div className="space-y-4 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-500">
                  User ID
                </span>
                <span className="max-w-[65%] break-all text-right text-xs font-medium text-slate-700">
                  {selectedUser._id}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Role</span>
                <StatusBadge status={selectedUser.role} />
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-slate-500">
                  Account Status
                </span>
                <StatusBadge
                  status={
                    selectedUser.isSuspended
                      ? "Suspended"
                      : "Active"
                  }
                />
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Joined</span>
                <span className="text-sm font-medium text-slate-700">
                  {selectedUser.createdAt
                    ? new Date(
                        selectedUser.createdAt
                      ).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>

            {selectedUser.role !== "admin" &&
              String(selectedUser._id) !== String(user?.id) && (
                <button
                  onClick={() =>
                    handleSuspensionToggle(selectedUser)
                  }
                  disabled={actionLoadingId === selectedUser._id}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    selectedUser.isSuspended
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {actionLoadingId === selectedUser._id ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : selectedUser.isSuspended ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Ban size={18} />
                  )}

                  {selectedUser.isSuspended
                    ? "Reactivate Account"
                    : "Suspend Account"}
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;