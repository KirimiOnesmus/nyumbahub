import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuBuilding2,
  LuLayers,
  LuWallet,
  LuUserRound,
  LuUserPlus,
  LuDoorOpen,
} from "react-icons/lu";
import Card from "../../../components/common/Card.jsx";
import Badge from "../../../components/common/Badge.jsx";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";
import { formatCurrency } from "../../../components/constast/Constasts.js";
import { getUnitById } from "../../../services/unit.service.js";
import { getBuilding } from "../../../services/building.service.js";
import { getTenants } from "../../../services/tenant.service.js";

const STATUS_TONE = { occupied: "success", vacant: "warning" };

const UNIT_TYPE_LABELS = {
  single: "Single",
  bedsitter: "Bedsitter",
  studio: "Studio",
  shop: "Shop",
  oneBedroom: "1 Bedroom",
  twoBedroom: "2 Bedroom",
  threeBedroom: "3 Bedroom",
  fourBedroomPlus: "4+ Bedroom",
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center text-slate-500 shrink-0">
      <Icon aria-hidden="true" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const UnitsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState(null);
  const [buildingName, setBuildingName] = useState("");
  const [currentTenant, setCurrentTenant] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { unit: foundUnit } = await getUnitById(id);
        if (cancelled) return;
        setUnit(foundUnit);

        const [buildingRes, tenantsRes] = await Promise.all([
          getBuilding(foundUnit.buildingId).catch(() => null),
          getTenants(foundUnit.buildingId, { page: 1, limit: 100 }).catch(
            () => ({ tenants: [] }),
          ),
        ]);
        if (cancelled) return;

        setBuildingName(buildingRes?.building?.name ?? "");
        const tenants = Array.isArray(tenantsRes.tenants)
          ? tenantsRes.tenants
          : [];
        const occupant = tenants.find(
          (t) => (t.unitId?.id ?? t.unitId) === foundUnit.id,
        );
        setCurrentTenant(occupant ?? null);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "We couldn't load this unit. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const BackButton = (
    <button
      type="button"
      onClick={() => navigate("/caretaker/units")}
      aria-label="Back to units"
      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
    >
      <LuArrowLeft />
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{BackButton}</div>
        <Loader label="Loading unit…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{BackButton}</div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{BackButton}</div>
        <Card className="p-0">
          <EmptyState
            icon={LuDoorOpen}
            title="Unit not found"
            description="This unit may have been removed or the link is outdated."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {BackButton}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Unit {unit.unitNumber}
              </h2>
              <Badge tone={STATUS_TONE[unit.status] ?? "default"}>
                {unit.status === "occupied" ? "Occupied" : "Vacant"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{buildingName || "—"}</p>
          </div>
        </div>
        {unit.status === "vacant" && (
          <button
            type="button"
            onClick={() =>
              navigate("/caretaker/tenants/add", {
                state: { unitId: unit.id, buildingId: unit.buildingId },
              })
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
          >
            <LuUserPlus aria-hidden="true" />
            Assign Tenant
          </button>
        )}
      </div>

      <Card className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <InfoRow
            icon={LuBuilding2}
            label="Building"
            value={buildingName || "—"}
          />
          <InfoRow
            icon={LuLayers}
            label="Type"
            value={UNIT_TYPE_LABELS[unit.type] ?? unit.type}
          />
          <InfoRow
            icon={LuWallet}
            label="Monthly Rent"
            value={
              unit.rentAmount != null ? formatCurrency(unit.rentAmount) : "—"
            }
          />
          <InfoRow
            icon={LuUserRound}
            label="Current Tenant"
            value={currentTenant?.userId?.name ?? "—"}
          />
        </div>
      </Card>

      {currentTenant && (
        <button
          type="button"
          onClick={() => navigate(`/caretaker/tenants/${currentTenant._id}`)}
          className="self-start flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline transition-colors cursor-pointer"
        >
          View tenant profile →
        </button>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Tenant History
        </h3>
        {/* TODO: no backend support for this yet. listTenants only returns
            pending/active TenantProfiles — moved_out ones are excluded — and
            there's no endpoint to list all profiles (including past ones)
            for a given unit. Needs something like GET /units/:id/tenant-history. */}
        <Card className="p-0">
          <EmptyState
            icon={LuUserRound}
            title="Tenant history isn't available yet"
            description="This view needs a backend endpoint that includes past (moved-out) tenants for a unit — it hasn't been built."
          />
        </Card>
      </div>
    </div>
  );
};

export default UnitsDetail;
