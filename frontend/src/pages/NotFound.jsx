import ErrorDisplay from "../components/ErrorDisplay";

/**
 * NotFound — 404 page rendered for unmatched routes.
 */
export default function NotFound() {
  return (
    <ErrorDisplay
      status={404}
      showBackButton={true}
      showHomeButton={true}
    />
  );
}
