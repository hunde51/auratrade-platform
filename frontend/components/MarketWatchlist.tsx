const instruments = [
  { symbol: "BTC-USD", price: "$68,420.15", change: "+1.28%", volume: "$2.1B" },
  { symbol: "ETH-USD", price: "$3,612.40", change: "+0.84%", volume: "$1.4B" },
  { symbol: "SOL-USD", price: "$184.33", change: "-0.41%", volume: "$612M" },
  { symbol: "AAPL", price: "$212.18", change: "+0.22%", volume: "$428M" },
  { symbol: "NVDA", price: "$901.72", change: "+1.94%", volume: "$756M" },
  { symbol: "TSLA", price: "$198.54", change: "-1.11%", volume: "$508M" },
];

function changeTone(change: string) {
  return change.startsWith("-") ? "text-rose-400" : "text-emerald-400";
}

export default function MarketWatchlist() {
  return (
    <section className="panel rounded-2xl p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Market Watchlist</p>
          <h2 className="section-title">Core instruments</h2>
        </div>
        <span className="data-chip">6 symbols</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[420px] w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <th className="border-b border-slate-800 px-0 py-3 font-medium">Symbol</th>
              <th className="border-b border-slate-800 px-3 py-3 font-medium">Last</th>
              <th className="border-b border-slate-800 px-3 py-3 font-medium">24h</th>
              <th className="border-b border-slate-800 px-3 py-3 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody>
            {instruments.map((instrument) => (
              <tr className="text-sm" key={instrument.symbol}>
                <td className="border-b border-slate-900 px-0 py-4 font-semibold text-slate-100">{instrument.symbol}</td>
                <td className="border-b border-slate-900 px-3 py-4 text-slate-200">{instrument.price}</td>
                <td className={`border-b border-slate-900 px-3 py-4 font-medium ${changeTone(instrument.change)}`}>
                  {instrument.change}
                </td>
                <td className="border-b border-slate-900 px-3 py-4 text-slate-400">{instrument.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
