export default function AlertBanner({ alert }) {
  return (
    <section className={`alert-banner ${alert.level}`} aria-live="polite">
      <p>{alert.message}</p>
    </section>
  );
}
