import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SYMBOLS } from "@/lib/constants";
import { changePassword, getUserSettings, updateUserSettings } from "@/services/mockApi";
import type { UserSettings } from "@/services/mockApi";

const TIMEFRAMES = ["1h", "4h", "1d", "1w"] as const;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["user-settings"], queryFn: getUserSettings });
  const settingsLoadError = settingsQuery.error instanceof Error ? settingsQuery.error.message : "Failed to load settings.";

  const [username, setUsername] = useState("");
  const [defaultOrderType, setDefaultOrderType] = useState<"market" | "limit">("market");
  const [defaultOrderQuantity, setDefaultOrderQuantity] = useState("1");

  const [notifyTradeConfirmations, setNotifyTradeConfirmations] = useState(true);
  const [notifyWalletUpdates, setNotifyWalletUpdates] = useState(true);
  const [notifyOrderStatusChanges, setNotifyOrderStatusChanges] = useState(true);
  const [notifyPriceAlerts, setNotifyPriceAlerts] = useState(true);

  const [preferredTimeframe, setPreferredTimeframe] = useState<(typeof TIMEFRAMES)[number]>("4h");
  const [preferredSymbols, setPreferredSymbols] = useState<string[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [symbolSearch, setSymbolSearch] = useState("");
  const [initialSettings, setInitialSettings] = useState<UserSettings | null>(null);

  const applySettings = (settings: UserSettings) => {
    setUsername(settings.username);
    setDefaultOrderType(settings.defaultOrderType);
    setDefaultOrderQuantity(String(settings.defaultOrderQuantity));

    setNotifyTradeConfirmations(settings.notifyTradeConfirmations);
    setNotifyWalletUpdates(settings.notifyWalletUpdates);
    setNotifyOrderStatusChanges(settings.notifyOrderStatusChanges);
    setNotifyPriceAlerts(settings.notifyPriceAlerts);

    setPreferredTimeframe(settings.preferredTimeframe);
    setPreferredSymbols(settings.preferredSymbols);
  };

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) {
      return;
    }

    applySettings(settings);
    setInitialSettings(settings);
  }, [settingsQuery.data]);

  const parsedQuantity = Number(defaultOrderQuantity);
  const quantityIsValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const filteredSymbols = useMemo(() => {
    const query = symbolSearch.trim().toUpperCase();
    return SYMBOLS.filter((item) => item.symbol.replace("/", "").includes(query) || item.name.toUpperCase().includes(query));
  }, [symbolSearch]);
  const hasSettingsChanges = useMemo(() => {
    if (!initialSettings) {
      return false;
    }

    return (
      username !== initialSettings.username ||
      defaultOrderType !== initialSettings.defaultOrderType ||
      parsedQuantity !== initialSettings.defaultOrderQuantity ||
      notifyTradeConfirmations !== initialSettings.notifyTradeConfirmations ||
      notifyWalletUpdates !== initialSettings.notifyWalletUpdates ||
      notifyOrderStatusChanges !== initialSettings.notifyOrderStatusChanges ||
      notifyPriceAlerts !== initialSettings.notifyPriceAlerts ||
      preferredTimeframe !== initialSettings.preferredTimeframe ||
      JSON.stringify(preferredSymbols) !== JSON.stringify(initialSettings.preferredSymbols)
    );
  }, [
    defaultOrderType,
    initialSettings,
    notifyOrderStatusChanges,
    notifyPriceAlerts,
    notifyTradeConfirmations,
    notifyWalletUpdates,
    parsedQuantity,
    preferredSymbols,
    preferredTimeframe,
    username,
  ]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateUserSettings({
        username,
        defaultOrderType,
        defaultOrderQuantity: Number(defaultOrderQuantity),
        notifyTradeConfirmations,
        notifyWalletUpdates,
        notifyOrderStatusChanges,
        notifyPriceAlerts,
        preferredSymbols,
        preferredTimeframe,
      }),
    onSuccess: async (updatedSettings) => {
      toast.success("Settings updated");
      setInitialSettings(updatedSettings);
      await queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirmation do not match");
      }
      await changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    },
  });

  const onSaveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateMutation.mutate();
  };

  const onChangePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    passwordMutation.mutate();
  };

  const toggleSymbol = (symbol: string) => {
    setPreferredSymbols((current) => {
      if (current.includes(symbol)) {
        return current.filter((item) => item !== symbol);
      }
      if (current.length >= 20) {
        toast.error("You can select up to 20 symbols");
        return current;
      }
      return [...current, symbol];
    });
  };

  if (settingsQuery.isLoading) {
    return <div className="glass-card p-6 text-sm text-muted-foreground">Loading settings...</div>;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <div className="glass-card flex items-center justify-between p-6 text-sm">
        <span className="text-red-300">{settingsLoadError}</span>
        <button type="button" onClick={() => settingsQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings <span className="text-muted-foreground text-2xl font-medium">- Manage your account and defaults</span></h2>
      </div>

      <form onSubmit={onSaveSettings} className="glass-card overflow-hidden border border-border/70 p-0">
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3 lg:gap-5 lg:p-5">
          <section className="rounded-xl border border-border/70 bg-card/40 p-4">
            <h3 className="mb-4 text-2xl font-semibold">General Info</h3>
            <div className="space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={100}
                  className="h-10 w-full rounded-md border border-border bg-secondary/70 px-3"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Email (read-only)</span>
                <input value={settingsQuery.data.email} disabled className="h-10 w-full rounded-md border border-border bg-secondary/50 px-3" />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/40 p-4">
            <h3 className="mb-4 text-2xl font-semibold">Trade Defaults</h3>
            <div className="space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Default Order Type</span>
                <select
                  value={defaultOrderType}
                  onChange={(event) => setDefaultOrderType(event.target.value as "market" | "limit")}
                  className="h-10 w-full rounded-md border border-border bg-secondary/70 px-3"
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Default Order Quantity</span>
                <input
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={defaultOrderQuantity}
                  onChange={(event) => setDefaultOrderQuantity(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-secondary/70 px-3"
                />
                {!quantityIsValid && <span className="text-xs text-red-300">Quantity must be greater than 0.</span>}
              </label>

              <div className="space-y-2 text-sm">
                <span className="text-muted-foreground">Preferred Timeframe</span>
                <div className="flex flex-wrap gap-2 rounded-md border border-border bg-secondary/40 p-2">
                  {TIMEFRAMES.map((timeframe) => {
                    const active = preferredTimeframe === timeframe;
                    return (
                      <button
                        key={timeframe}
                        type="button"
                        onClick={() => setPreferredTimeframe(timeframe)}
                        className={active ? "rounded bg-primary/20 px-2 py-1 text-xs font-semibold text-primary" : "rounded bg-secondary px-2 py-1 text-xs text-muted-foreground hover:text-foreground"}
                      >
                        {timeframe}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/40 p-4">
            <h3 className="mb-4 text-2xl font-semibold">Preferred Symbols</h3>
            <div className="space-y-4 text-sm">
              <div className="rounded-md border border-border bg-secondary/40 p-2">
                <div className="mb-2 flex flex-wrap gap-1">
                  {preferredSymbols.length === 0 && <span className="text-xs text-muted-foreground">No symbols selected</span>}
                  {preferredSymbols.map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => toggleSymbol(symbol)}
                      className="rounded bg-secondary px-2 py-1 text-xs"
                    >
                      {symbol} x
                    </button>
                  ))}
                </div>
                <input
                  value={symbolSearch}
                  onChange={(event) => setSymbolSearch(event.target.value)}
                  placeholder="Search..."
                  className="h-9 w-full rounded-md border border-border bg-secondary/80 px-3"
                />
                <div className="mt-2 max-h-24 space-y-1 overflow-auto rounded-md border border-border/70 p-2">
                  {filteredSymbols.map((item) => {
                    const value = item.symbol.replace("/", "");
                    const checked = preferredSymbols.includes(value);
                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => toggleSymbol(value)}
                        className={checked ? "block w-full rounded px-2 py-1 text-left text-primary" : "block w-full rounded px-2 py-1 text-left text-muted-foreground hover:text-foreground"}
                      >
                        {item.symbol}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-muted-foreground">Notifications</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={notifyTradeConfirmations} onChange={(event) => setNotifyTradeConfirmations(event.target.checked)} />
                    Trade confirmations
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={notifyOrderStatusChanges} onChange={(event) => setNotifyOrderStatusChanges(event.target.checked)} />
                    Order status changes
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={notifyWalletUpdates} onChange={(event) => setNotifyWalletUpdates(event.target.checked)} />
                    Wallet updates
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={notifyPriceAlerts} onChange={(event) => setNotifyPriceAlerts(event.target.checked)} />
                    Price alerts
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
          <button
            type="button"
            onClick={() => initialSettings && applySettings(initialSettings)}
            disabled={!hasSettingsChanges || updateMutation.isPending}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending || !hasSettingsChanges || !quantityIsValid}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      <form onSubmit={onChangePassword} className="glass-card space-y-4 border border-red-500/50 p-5">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-xl font-semibold text-red-100"><Lock className="h-4 w-4 text-red-300" />Change Password</h3>
          <p className="text-xs text-red-200/90">Security rule: password can only be changed once every 24 hours.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            minLength={8}
            className="h-10 rounded-md border border-border bg-secondary px-3"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            className="h-10 rounded-md border border-border bg-secondary px-3"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            className="h-10 rounded-md border border-border bg-secondary px-3"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {passwordMutation.isPending ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
