const DEALS = [
  {
    title: "Trina Vertex S 440W Mono PERC",
    price: "$185.00 / panel",
    shipping: "DDP eligible",
  },
  {
    title: "Sungrow SG110CX 110kW String Inverter",
    price: "$6,450.00",
    shipping: "Free metro delivery",
  },
  {
    title: "BYD Battery-Box Premium LVS 12.0",
    price: "$9,980.00",
    shipping: "ETA 7 days",
  },
  {
    title: "ABB Terra AC Wallbox 22kW",
    price: "$1,240.00",
    shipping: "Ships today",
  },
  {
    title: "Clenergy PV-ezRack Tin Interface Kit",
    price: "$62.00 / set",
    shipping: "Bulk freight rates",
  },
  {
    title: "Fluke 393 FC Solar Clamp Meter",
    price: "$1,150.00",
    shipping: "Free shipping",
  },
];

export default function DealsCarousel() {
  return (
    <section id="deals" className="container mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-ink-900">Today’s Best Deals</h2>
        <a href="#deals" className="text-brand-700 font-semibold hover:underline">See all deals</a>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-full pb-2">
          {DEALS.map((deal) => (
            <div key={deal.title} className="bg-white rounded-2xl shadow-card p-4 min-w-56 flex flex-col gap-2 hover:shadow-soft transition duration-200 ease-out">
              <div className="h-28 rounded-xl bg-brand-50 border flex items-center justify-center text-brand-700 text-sm font-semibold">
                Image
              </div>
              <div className="font-semibold text-ink-900">{deal.title}</div>
              <div className="text-brand-700 font-bold text-lg">{deal.price}</div>
              <div className="text-sm text-ink-500">{deal.shipping}</div>
              <button className="mt-auto bg-brand-700 text-white px-3 py-2 rounded-full font-semibold shadow-inner hover:bg-brand-600">Add to cart</button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <a href="#deals" className="text-brand-700 font-semibold hover:underline">See all deals</a>
      </div>
    </section>
  );
}
