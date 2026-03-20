export default function OverviewCards({ cards }) {
  return (
    <section className="card-grid" aria-label="System summary cards">
      {cards.map((card) => (
        <article className="info-card" key={card.label}>
          <p className="card-label">{card.label}</p>
          <h2>{card.value}</h2>
          <p className="card-helper">{card.helper}</p>
        </article>
      ))}
    </section>
  );
}
