export default function OverviewCards({ cards }) {
  return (
    <section className="card-grid" aria-label="System summary cards">
      {cards.map((card) => {
        const compactValue = card.label === 'Feed Freshness';
        return (
          <article className="info-card" key={card.label}>
            <p className="card-label">{card.label}</p>
            <h2 className={compactValue ? 'card-value-compact' : ''}>{card.value}</h2>
            <p className="card-helper">{card.helper}</p>
          </article>
        );
      })}
    </section>
  );
}
