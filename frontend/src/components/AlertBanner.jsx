export default function AlertBanner({ alert }) {
  return (
    <section className={`alert-banner ${alert.level}`} aria-live="polite">
      <strong>{alert.title}</strong>
      <p>{alert.message}</p>
    </section>
  );
}
