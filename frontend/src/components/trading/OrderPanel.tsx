import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMarketStore } from '@/store/useMarketStore';
import { useTradingStore } from '@/store/useTradingStore';
import { placeOrder } from '@/services/mockApi';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { SYMBOLS } from '@/lib/constants';

export function OrderPanel() {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const prices = useMarketStore((s) => s.prices);
  const addTrade = useTradingStore((s) => s.addTrade);
  const addPosition = useTradingStore((s) => s.addPosition);

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPrice = prices.find((p) => p.symbol === selectedSymbol)?.price ?? 0;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const price = orderType === 'market' ? currentPrice : Number(limitPrice);
      const order = await placeOrder({
        symbol: selectedSymbol,
        side,
        type: orderType,
        quantity: Number(quantity),
        price,
        limitPrice: orderType === 'limit' ? Number(limitPrice) : undefined,
      });

      if (order.status === 'filled') {
        addTrade({
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          price: order.price,
          total: order.price * order.quantity,
          timestamp: order.timestamp,
        });
        addPosition({
          id: order.id,
          symbol: order.symbol,
          side: side === 'buy' ? 'long' : 'short',
          quantity: order.quantity,
          entryPrice: order.price,
          currentPrice: order.price,
          pnl: 0,
          pnlPercent: 0,
          timestamp: order.timestamp,
        });
        toast.success(`${side.toUpperCase()} ${quantity} ${selectedSymbol} @ ${formatCurrency(price)}`);
      } else {
        toast.info(`Limit order placed for ${selectedSymbol}`);
      }
    } catch {
      toast.error('Order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold mb-4">Place Order</h3>

      {/* Symbol */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
        <select
          value={selectedSymbol}
          onChange={(e) => useMarketStore.getState().setSelectedSymbol(e.target.value)}
          className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SYMBOLS.map((s) => (
            <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
          ))}
        </select>
      </div>

      {/* Side */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setSide('buy')}
          className={`h-10 rounded-md text-sm font-semibold transition-all ${
            side === 'buy'
              ? 'bg-success text-success-foreground shadow-lg'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`h-10 rounded-md text-sm font-semibold transition-all ${
            side === 'sell'
              ? 'bg-destructive text-destructive-foreground shadow-lg'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Order Type */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['market', 'limit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={`h-8 rounded-md text-xs font-medium transition-all ${
              orderType === t ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          min="0.01"
          step="0.01"
        />
      </div>

      {/* Limit Price */}
      {orderType === 'limit' && (
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Limit Price</label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={currentPrice.toFixed(2)}
          />
        </div>
      )}

      {/* Price display */}
      <div className="flex justify-between text-xs text-muted-foreground mb-4">
        <span>Market Price</span>
        <span className="font-semibold text-foreground">{formatCurrency(currentPrice)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mb-6">
        <span>Est. Total</span>
        <span className="font-semibold text-foreground">
          {formatCurrency((orderType === 'market' ? currentPrice : Number(limitPrice) || 0) * Number(quantity))}
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full h-11 rounded-md text-sm font-bold transition-all ${
          side === 'buy'
            ? 'bg-success text-success-foreground hover:brightness-110'
            : 'bg-destructive text-destructive-foreground hover:brightness-110'
        } disabled:opacity-50`}
      >
        {loading ? 'Processing...' : `${side.toUpperCase()} ${selectedSymbol}`}
      </button>
    </motion.div>
  );
}
