import { FormEvent, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SYMBOLS } from "@/lib/constants";
import {
  createAlertRule,
  deleteAlertRule,
  getAlertRules,
  toggleAlertRule,
  updateAlertRule,
} from "@/services/mockApi";
import type { AlertRule } from "@/lib/types";

const CONDITION_OPTIONS = [
  { value: "price_above", label: "Price above" },
  { value: "price_below", label: "Price below" },
  { value: "percent_drop", label: "Percent drop in window" },
] as const;

const ACTION_OPTIONS = [
  { value: "notify", label: "Notify only" },
  { value: "place_order", label: "Place paper order" },
] as const;

const ORDER_SIDE_OPTIONS = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
] as const;

const ORDER_TYPE_OPTIONS = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
] as const;

const MAX_ENABLED_RULES = 20;
const AUTO_ORDER_RATE_LIMIT_PER_MINUTE = 5;

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const alertsQuery = useQuery({ queryKey: ["alert-rules"], queryFn: getAlertRules });

  const [symbol, setSymbol] = useState("BTCUSD");
  const [conditionType, setConditionType] = useState<"price_above" | "price_below" | "percent_drop">("percent_drop");
  const [threshold, setThreshold] = useState("3");
  const [windowMinutes, setWindowMinutes] = useState("15");
  const [actionType, setActionType] = useState<"notify" | "place_order">("notify");
  const [cooldownSeconds, setCooldownSeconds] = useState("120");
  const [enabled, setEnabled] = useState(true);

  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderPrice, setOrderPrice] = useState("0");

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editConditionType, setEditConditionType] = useState<"price_above" | "price_below" | "percent_drop">("percent_drop");
  const [editThreshold, setEditThreshold] = useState("3");
  const [editWindowMinutes, setEditWindowMinutes] = useState("15");
  const [editActionType, setEditActionType] = useState<"notify" | "place_order">("notify");
  const [editCooldownSeconds, setEditCooldownSeconds] = useState("120");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editOrderSide, setEditOrderSide] = useState<"buy" | "sell">("buy");
  const [editOrderType, setEditOrderType] = useState<"market" | "limit">("market");
  const [editOrderQuantity, setEditOrderQuantity] = useState("1");
  const [editOrderPrice, setEditOrderPrice] = useState("0");

  const thresholdValue = Number(threshold);
  const windowValue = Number(windowMinutes);
  const cooldownValue = Number(cooldownSeconds);
  const quantityValue = Number(orderQuantity);
  const priceValue = Number(orderPrice);

  const formIsValid = useMemo(() => {
    if (!symbol.trim()) {
      return false;
    }
    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      return false;
    }
    if (!Number.isFinite(windowValue) || windowValue < 1 || windowValue > 1440) {
      return false;
    }
    if (!Number.isFinite(cooldownValue) || cooldownValue < 10 || cooldownValue > 86_400) {
      return false;
    }

    if (actionType === "place_order") {
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        return false;
      }
      if (orderType === "limit" && (!Number.isFinite(priceValue) || priceValue <= 0)) {
        return false;
      }
    }

    return true;
  }, [
    actionType,
    cooldownValue,
    orderType,
    priceValue,
    quantityValue,
    symbol,
    thresholdValue,
    windowValue,
  ]);

  const createMutation = useMutation({
    mutationFn: async () =>
      createAlertRule({
        symbol,
        conditionType,
        threshold: thresholdValue,
        windowMinutes: windowValue,
        actionType,
        actionPayload:
          actionType === "place_order"
            ? {
                side: orderSide,
                order_type: orderType,
                quantity: quantityValue,
                price: orderType === "limit" ? priceValue : undefined,
              }
            : {},
        enabled,
        cooldownSeconds: cooldownValue,
      }),
    onSuccess: async () => {
      toast.success("Alert rule created");
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create alert rule");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, nextEnabled }: { id: string; nextEnabled: boolean }) => toggleAlertRule(id, nextEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to toggle alert rule");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteAlertRule(id),
    onSuccess: async () => {
      toast.success("Rule deleted");
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete alert rule");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (ruleId: string) =>
      updateAlertRule(ruleId, {
        conditionType: editConditionType,
        threshold: Number(editThreshold),
        windowMinutes: Number(editWindowMinutes),
        actionType: editActionType,
        actionPayload:
          editActionType === "place_order"
            ? {
                side: editOrderSide,
                order_type: editOrderType,
                quantity: Number(editOrderQuantity),
                price: editOrderType === "limit" ? Number(editOrderPrice) : undefined,
              }
            : {},
        cooldownSeconds: Number(editCooldownSeconds),
        enabled: editEnabled,
      }),
    onSuccess: async () => {
      toast.success("Rule updated");
      setEditingRuleId(null);
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update rule");
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formIsValid) {
      toast.error("Please fix invalid fields before saving");
      return;
    }
    createMutation.mutate();
  };

  const startEdit = (rule: AlertRule) => {
    setEditingRuleId(rule.id);
    setEditConditionType(rule.conditionType);
    setEditThreshold(String(rule.threshold));
    setEditWindowMinutes(String(rule.windowMinutes));
    setEditActionType(rule.actionType);
    setEditCooldownSeconds(String(rule.cooldownSeconds));
    setEditEnabled(rule.enabled);

    const payload = rule.actionPayload ?? {};
    const sideValue = payload.side;
    const orderTypeValue = payload.order_type;
    const quantityValue = payload.quantity;
    const priceValue = payload.price;

    setEditOrderSide(sideValue === "sell" ? "sell" : "buy");
    setEditOrderType(orderTypeValue === "limit" ? "limit" : "market");
    setEditOrderQuantity(typeof quantityValue === "number" ? String(quantityValue) : "1");
    setEditOrderPrice(typeof priceValue === "number" ? String(priceValue) : "0");
  };

  const onSaveEdit = (ruleId: string) => {
    const thresholdNumber = Number(editThreshold);
    const windowNumber = Number(editWindowMinutes);
    const cooldownNumber = Number(editCooldownSeconds);
    const quantityNumber = Number(editOrderQuantity);
    const priceNumber = Number(editOrderPrice);

    if (!Number.isFinite(thresholdNumber) || thresholdNumber <= 0) {
      toast.error("Threshold must be greater than 0");
      return;
    }
    if (!Number.isFinite(windowNumber) || windowNumber < 1 || windowNumber > 1440) {
      toast.error("Window must be between 1 and 1440 minutes");
      return;
    }
    if (!Number.isFinite(cooldownNumber) || cooldownNumber < 10 || cooldownNumber > 86400) {
      toast.error("Cooldown must be between 10 and 86400 seconds");
      return;
    }
    if (editActionType === "place_order") {
      if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
        toast.error("Order quantity must be greater than 0");
        return;
      }
      if (editOrderType === "limit" && (!Number.isFinite(priceNumber) || priceNumber <= 0)) {
        toast.error("Limit order requires a valid positive price");
        return;
      }
    }

    updateMutation.mutate(ruleId);
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const entries = Object.entries(details);
    if (entries.length === 0) {
      return "No details";
    }
    return entries
      .map(([key, value]) => `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
      .join(" | ");
  };

  const enabledRulesCount = alertsQuery.data?.items.filter((item) => item.enabled).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Alerts + Auto-Rules</h2>
        <p className="text-sm text-muted-foreground">Create price triggers that notify you or place paper orders automatically.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Safety limits: max {MAX_ENABLED_RULES} enabled rules per user, max {AUTO_ORDER_RATE_LIMIT_PER_MINUTE} auto-order actions per minute.
        </p>
      </div>

      <form onSubmit={onSubmit} className="glass-card space-y-4 p-5">
        <h3 className="text-sm font-semibold">Create Rule</h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Symbol</span>
            <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="h-10 w-full rounded-md border border-border bg-secondary px-3">
              {SYMBOLS.map((item) => {
                const normalized = item.symbol.replace("/", "");
                return (
                  <option key={normalized} value={normalized}>
                    {normalized}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Condition</span>
            <select
              value={conditionType}
              onChange={(event) => setConditionType(event.target.value as "price_above" | "price_below" | "percent_drop")}
              className="h-10 w-full rounded-md border border-border bg-secondary px-3"
            >
              {CONDITION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Threshold</span>
            <input type="number" min="0.000001" step="0.000001" value={threshold} onChange={(event) => setThreshold(event.target.value)} className="h-10 w-full rounded-md border border-border bg-secondary px-3" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Window (minutes)</span>
            <input type="number" min="1" max="1440" value={windowMinutes} onChange={(event) => setWindowMinutes(event.target.value)} className="h-10 w-full rounded-md border border-border bg-secondary px-3" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Cooldown (seconds)</span>
            <input type="number" min="10" max="86400" value={cooldownSeconds} onChange={(event) => setCooldownSeconds(event.target.value)} className="h-10 w-full rounded-md border border-border bg-secondary px-3" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Action</span>
            <select value={actionType} onChange={(event) => setActionType(event.target.value as "notify" | "place_order")} className="h-10 w-full rounded-md border border-border bg-secondary px-3">
              {ACTION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {actionType === "place_order" && (
          <div className="grid grid-cols-1 gap-4 rounded-md border border-border/70 bg-secondary/20 p-3 lg:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Order side</span>
              <select value={orderSide} onChange={(event) => setOrderSide(event.target.value as "buy" | "sell")} className="h-10 w-full rounded-md border border-border bg-secondary px-3">
                {ORDER_SIDE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Order type</span>
              <select value={orderType} onChange={(event) => setOrderType(event.target.value as "market" | "limit")} className="h-10 w-full rounded-md border border-border bg-secondary px-3">
                {ORDER_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <input type="number" min="0.000001" step="0.000001" value={orderQuantity} onChange={(event) => setOrderQuantity(event.target.value)} className="h-10 w-full rounded-md border border-border bg-secondary px-3" />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Limit price (optional)</span>
              <input
                type="number"
                min="0.000001"
                step="0.000001"
                disabled={orderType !== "limit"}
                value={orderPrice}
                onChange={(event) => setOrderPrice(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-secondary px-3 disabled:opacity-60"
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Enable immediately
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!formIsValid || createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create rule"}
          </button>
        </div>
      </form>

      <div className="glass-card space-y-3 p-5">
        <h3 className="text-sm font-semibold">Active Rules</h3>
        <p className="text-xs text-muted-foreground">Enabled now: {enabledRulesCount}/{MAX_ENABLED_RULES}</p>

        {alertsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading rules...</p>}
        {alertsQuery.isError && <p className="text-sm text-red-300">Failed to load rules.</p>}

        {!alertsQuery.isLoading && !alertsQuery.isError && (alertsQuery.data?.items.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No alert rules created yet.</p>
        )}

        <div className="space-y-2">
          {alertsQuery.data?.items.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-3 rounded-md border border-border/70 p-3 lg:flex-row lg:items-center lg:justify-between">
              {editingRuleId === rule.id ? (
                <div className="w-full space-y-3">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Condition</span>
                      <select value={editConditionType} onChange={(event) => setEditConditionType(event.target.value as "price_above" | "price_below" | "percent_drop")} className="h-9 w-full rounded-md border border-border bg-secondary px-2">
                        {CONDITION_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Threshold</span>
                      <input value={editThreshold} onChange={(event) => setEditThreshold(event.target.value)} type="number" className="h-9 w-full rounded-md border border-border bg-secondary px-2" />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Window (m)</span>
                      <input value={editWindowMinutes} onChange={(event) => setEditWindowMinutes(event.target.value)} type="number" className="h-9 w-full rounded-md border border-border bg-secondary px-2" />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Cooldown (s)</span>
                      <input value={editCooldownSeconds} onChange={(event) => setEditCooldownSeconds(event.target.value)} type="number" className="h-9 w-full rounded-md border border-border bg-secondary px-2" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Action</span>
                      <select value={editActionType} onChange={(event) => setEditActionType(event.target.value as "notify" | "place_order")} className="h-9 w-full rounded-md border border-border bg-secondary px-2">
                        {ACTION_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>

                    {editActionType === "place_order" && (
                      <>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Side</span>
                          <select value={editOrderSide} onChange={(event) => setEditOrderSide(event.target.value as "buy" | "sell")} className="h-9 w-full rounded-md border border-border bg-secondary px-2">
                            {ORDER_SIDE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Order type</span>
                          <select value={editOrderType} onChange={(event) => setEditOrderType(event.target.value as "market" | "limit")} className="h-9 w-full rounded-md border border-border bg-secondary px-2">
                            {ORDER_TYPE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Quantity</span>
                          <input value={editOrderQuantity} onChange={(event) => setEditOrderQuantity(event.target.value)} type="number" className="h-9 w-full rounded-md border border-border bg-secondary px-2" />
                        </label>
                        {editOrderType === "limit" && (
                          <label className="space-y-1 text-xs">
                            <span className="text-muted-foreground">Limit price</span>
                            <input value={editOrderPrice} onChange={(event) => setEditOrderPrice(event.target.value)} type="number" className="h-9 w-full rounded-md border border-border bg-secondary px-2" />
                          </label>
                        )}
                      </>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={editEnabled} onChange={(event) => setEditEnabled(event.target.checked)} />
                    Enabled
                  </label>

                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setEditingRuleId(null)} className="rounded-md bg-secondary px-3 py-2 text-xs">Cancel</button>
                    <button type="button" onClick={() => onSaveEdit(rule.id)} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm">
                    <p className="font-semibold">
                      {rule.symbol} {rule.conditionType} {rule.threshold}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      action={rule.actionType} | window={rule.windowMinutes}m | cooldown={rule.cooldownSeconds}s
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(rule)}
                      className="rounded-md bg-secondary px-3 py-2 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: rule.id, nextEnabled: !rule.enabled })}
                      className={rule.enabled ? "rounded-md bg-secondary px-3 py-2 text-xs" : "rounded-md bg-primary/20 px-3 py-2 text-xs text-primary"}
                    >
                      {rule.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card space-y-3 p-5">
        <h3 className="text-sm font-semibold">Recent Trigger History</h3>
        {(alertsQuery.data?.recentEvents.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No trigger history yet.</p>
        ) : (
          <div className="space-y-2">
            {alertsQuery.data?.recentEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-border/70 p-3 text-sm">
                <p className="font-semibold">
                  Rule #{event.ruleId} | {event.actionType} | {event.status}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(event.triggeredAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDetails(event.details)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
