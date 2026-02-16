import { recordAudit } from "../lib/audit";

interface Props {
  documentId: string;
  name: string;
}

export default function DocumentDownload({ documentId, name }: Props) {
  const handleClick = () => {
    recordAudit("BUYER_DOCUMENT_DOWNLOADED", { documentId, name });
    // placeholder: real download to be wired; here we just log.
    alert("Download placeholder");
  };

  return (
    <button className="text-sm font-semibold text-brand-700" onClick={handleClick}>
      Download
    </button>
  );
}
