import React, { useEffect, useMemo, useState } from "react";
import { Activity, Radius, Search } from "lucide-react";
import { LoadingSpinner } from "../../components/admin/LoadingSpinner";
import { getAllOutbreaks } from "../../services/adminService";

export default function OutbreakMonitoring() {
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadOutbreaks = async () => {
      try {
        setLoading(true);
        const res = await getAllOutbreaks();
        setOutbreaks(res?.data || []);
      } finally {
        setLoading(false);
      }
    };

    loadOutbreaks();
  }, []);

  const filteredOutbreaks = useMemo(() => {
    const query = search.toLowerCase();
    return outbreaks.filter((item) =>
      [item.disease_name, item.status, item.source_farm_id, item.target_farm_id]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [outbreaks, search]);

  if (loading) return <LoadingSpinner text="Loading outbreak records..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
          <Activity className="text-[#166534]" size={24} />
          Outbreak Monitoring
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor disease name, source farm, target farm, radius, status, and alert time.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Total Outbreaks</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{outbreaks.length}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700 shadow-sm">
          <p className="text-xs font-bold uppercase">Active</p>
          <p className="mt-2 text-3xl font-extrabold">
            {outbreaks.filter((item) => item.status === "Active").length}
          </p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-green-700 shadow-sm">
          <p className="text-xs font-bold uppercase">Resolved</p>
          <p className="mt-2 text-3xl font-extrabold">
            {outbreaks.filter((item) => item.status === "Resolved").length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search outbreaks..."
            value={search}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Disease", "Source Farm", "Target Farm", "Radius KM", "Status", "Alert Time"].map((heading) => (
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOutbreaks.map((item) => (
                <tr className="transition hover:bg-green-50/40" key={item.outbreak_id}>
                  <td className="px-6 py-4 font-semibold text-gray-800">{item.disease_name || "Unknown"}</td>
                  <td className="px-6 py-4 text-gray-600">#{item.source_farm_id}</td>
                  <td className="px-6 py-4 text-gray-600">#{item.target_farm_id}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                      <Radius size={13} />
                      {item.radius_km || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.status === "Resolved"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {item.status || "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {item.alert_time ? new Date(item.alert_time).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredOutbreaks.length && (
          <div className="p-12 text-center">
            <p className="font-bold text-gray-800">No outbreaks found</p>
            <p className="mt-1 text-sm text-gray-500">There are no outbreak records for this filter.</p>
          </div>
        )}
      </section>
    </div>
  );
}
