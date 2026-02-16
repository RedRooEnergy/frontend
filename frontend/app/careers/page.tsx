import CareersLanding from "../../components/careers/CareersLanding";
import { getPublishedJobs } from "../../lib/careers/store";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const jobs = await getPublishedJobs();
  return <CareersLanding jobs={jobs} />;
}
