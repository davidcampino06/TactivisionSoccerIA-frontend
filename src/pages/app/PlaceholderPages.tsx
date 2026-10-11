import { Link } from "react-router";
import { EmptyState, PageHeader } from "../../components/ui";
import { es } from "../../i18n/es";

/** Temporary page for sections still being built in phase 2. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="page">
      <PageHeader title={title} />
      <EmptyState title={es.app.comingSoon} />
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="page page-narrow">
      <EmptyState title={es.app.notFoundTitle} body={es.app.notFoundBody}
        action={<Link to="/" className="btn btn-primary">{es.app.goHome}</Link>} />
    </div>
  );
}
