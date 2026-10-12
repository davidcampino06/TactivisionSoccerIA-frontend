import { Link } from "react-router";
import { EmptyState } from "../../components/ui";
import { es } from "../../i18n/es";

export function NotFoundPage() {
  return (
    <div className="page page-narrow">
      <EmptyState title={es.app.notFoundTitle} body={es.app.notFoundBody}
        action={<Link to="/" className="btn btn-primary">{es.app.goHome}</Link>} />
    </div>
  );
}
