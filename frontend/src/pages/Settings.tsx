import { FormEvent, useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SYMBOLS } from "@/lib/constants";
import { changePassword, getUserSettings, updateUserSettings } from "@/services/mockApi";

const TIMEFRAMES = ["1h", "4h", "1d", "1w"] as const;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["user-settings"], queryFn: getUserSettings });

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

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) {
      return;
    }

    setUsername(settings.username);
    setDefaultOrderType(settings.defaultOrderType);
    setDefaultOrderQuantity(String(settings.defaultOrderQuantity));

    setNotifyTradeConfirmations(settings.notifyTradeConfirmations);
    setNotifyWalletUpdates(settings.notifyWalletUpdates);
    setNotifyOrderStatusChanges(settings.notifyOrderStatusChanges);
    setNotifyPriceAlerts(settings.notifyPriceAlerts);

    setPreferredTimeframe(settings.preferredTimeframe);
    setPreferredSymbols(settings.preferredSymbols);
  }, [settingsQuery.data]);

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
    onSuccess: async () => {
      toast.success("Settings updated");
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
        <span className="text-red-300">Failed to load settings.</span>
        <button type="button" onClick={() => settingsQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account, trading defaults, and notifications.</p>
      </div>

      <form onSubmit={onSaveSettings} className="glass-card space-y-6 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={100}
              className="h-10 w-full rounded-md border border-border bg-secondary px-3"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Email (read-only)</span>
            <input value={settingsQuery.data.email} disabled className="h-10 w-full rounded-md border border-border bg-secondary/60 px-3" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Default order type</span>
            <select
              value={defaultOrderType}
              onChange={(event) => setDefaultOrderType(event.target.value as "market" | "limit")}
              className="h-10 w-full rounded-md border border-border bg-secondary px-3"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Default order quantity</span>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={defaultOrderQuantity}
              onChange={(event) => setDefaultOrderQuantity(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-secondary px-3"
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm text-muted-foreground">Notifications</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notifyTradeConfirmations} onChange={(event) => setNotifyTradeConfirmations(event.target.checked)} />
              Trade confirmations
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notifyWalletUpdates} onChange={(event) => setNotifyWalletUpdates(event.target.checked)} />
              Wallet updates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notifyOrderStatusChanges} onChange={(event) => setNotifyOrderStatusChanges(event.target.checked)} />
              Order status changes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notifyPriceAlerts} onChange={(event) => setNotifyPriceAlerts(event.target.checked)} />
              Price alerts
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Preferred timeframe</span>
            <select
              value={preferredTimeframe}
              onChange={(event) => setPreferredTimeframe(event.target.value as (typeof TIMEFRAMES)[number])}
              className="h-10 w-full rounded-md border border-border bg-secondary px-3"
            >
              {TIMEFRAMES.map((timeframe) => (
                <option key={timeframe} value={timeframe}>
                  {timeframe}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 text-sm">
            <span className="text-muted-foreground">Preferred symbols</span>
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-border p-2">
              {SYMBOLS.map((item) => {
                const value = item.symbol.replace("/", "");
                const checked = preferredSymbols.includes(value);
                return (
                  <label key={item.symbol} className="flex items-center gap-2">
                    <input type="checkbox" checked={checked} onChange={() => toggleSymbol(value)} />
                    {item.symbol}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>

      <form onSubmit={onChangePassword} className="glass-card space-y-4 p-5">
        <h3 className="text-sm font-semibold">Change Password</h3>

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
            className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {passwordMutation.isPending ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
