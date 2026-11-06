import { requireAdmin } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Enquiry } from "@/lib/models/content";
import { Flash, PageTitle, StatusPill, adminInput } from "@/components/admin/ui";
import { updateEnquiryStatusAction } from "../../actions";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  await requireAdmin("editor");
  await connectDb();
  const rows = await Enquiry.find({ status: { $ne: "spam" } }).sort({ createdAt: -1 }).limit(100).lean();
  return (
    <div className="max-w-4xl">
      <PageTitle title="Enquiries">Contact aur service enquiries (latest 100).</PageTitle>
      <Flash params={await searchParams} />
      <ul className="space-y-4">
        {rows.map((e) => (
          <li key={String(e._id)} className="surface p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatusPill status={e.status} />
              <span className="font-semibold text-fg">{e.name}</span>
              <a href={`mailto:${e.email}`} className="text-cyan-400 hover:underline">{e.email}</a>
              {e.phone && <span className="text-fg-muted">{e.phone}</span>}
              <span className="text-fg-subtle">{e.kind}{e.service ? ` · ${e.service}` : ""}{e.budget ? ` · ${e.budget}` : ""}</span>
              <span className="ml-auto text-xs text-fg-subtle">{e.createdAt.toLocaleString("en-IN")}</span>
            </div>
            {e.subject && <p className="mt-3 font-medium text-fg">{e.subject}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{e.message}</p>
            <form action={updateEnquiryStatusAction} className="mt-4 flex items-center gap-2">
              <input type="hidden" name="id" value={String(e._id)} />
              <label className="sr-only" htmlFor={`st-${e._id}`}>Status</label>
              <select id={`st-${e._id}`} name="status" defaultValue={e.status} className={`${adminInput} w-40`}>
                <option value="new">new</option>
                <option value="in_progress">in_progress</option>
                <option value="closed">closed</option>
                <option value="spam">spam</option>
              </select>
              <button className="rounded-lg border border-line-strong px-3 py-2 text-xs text-fg">Update</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
