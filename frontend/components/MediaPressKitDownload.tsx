"use client";

export default function MediaPressKitDownload() {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/media/RedRooEnergy_Media_Press_Kit.zip";
    link.download = "RedRooEnergy_Media_Press_Kit.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
      <h2 className="text-xl font-semibold text-strong leading-tight">Download the RedRooEnergy Media & Press Kit</h2>
      <p className="text-base text-muted">
        A complete reference pack including organisation overview, approved descriptions, brand assets, and media-ready
        materials.
      </p>
      <button
        onClick={handleDownload}
        className="mt-6 px-6 py-3 rounded-md font-medium bg-primary text-white hover:opacity-90"
      >
        Download Media & Press Kit
      </button>
    </section>
  );
}
