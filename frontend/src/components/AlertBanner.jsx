export default function AlertBanner({ alert }) {
  return (
    <section className={`alert-banner ${alert.level}`} aria-live="polite">
      {alert.title ? <strong>{alert.title}</strong> : null}
      <p>{alert.message}</p>
    </section>
  );
}
