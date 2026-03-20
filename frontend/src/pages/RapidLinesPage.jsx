import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import TopNav from '../components/TopNav';
import { loadLineStations, loadRapidLines } from '../api';
import { RAPID_LINE_LAYOUTS } from '../lineLayouts';

const LINE_COLORS = {
  '1': '#f2c230',
  '2': '#00c97d',
  '4': '#8f0024',
  '5': '#ff9350',
};

function normalizeStationName(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(lrt|subway|station|platform|eastbound|westbound|northbound|southbound)\b/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function resolveStation(layoutStation, apiStations) {
  const candidates = [layoutStation.label, layoutStation.displayName, ...(layoutStation.aliases ?? [])];
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeStationName(candidate);
    const match = apiStations.find((station) => normalizeStationName(station.name) === normalizedCandidate);
    if (match) {
      return match;
    }
  }
  return null;
}

function enrichStations(layoutStations, apiStations) {
  return layoutStations.map((layoutStation) => {
    const matched = resolveStation(layoutStation, apiStations);
    return {
      ...layoutStation,
      id: matched?.id ?? null,
      apiName: matched?.name ?? null,
    };
  });
}

function splitLabel(label) {
  return label.split('\n');
}

function renderTextLines(label, x, y, className, textAnchor = 'start') {
  const parts = splitLabel(label);
  return (
    <text x={x} y={y} className={className} textAnchor={textAnchor}>
      {parts.map((part, index) => (
        <tspan key={`${label}-${index}`} x={x} dy={index === 0 ? 0 : 14}>
          {part}
        </tspan>
      ))}
    </text>
  );
}

function InterchangeBadges({ values, x, y, compact = false }) {
  if (!values?.length) {
    return null;
  }
  const gap = compact ? 18 : 22;
  const startX = x - ((values.length - 1) * gap) / 2;
  return (
    <g className="svg-interchange-group" aria-hidden="true">
      {values.map((value, index) => (
        <g key={`${value}-${index}`} transform={`translate(${startX + index * gap} ${y})`}>
          <circle r={compact ? 8 : 10} className="svg-interchange-badge" />
          <text y={compact ? 3 : 4} textAnchor="middle" className="svg-interchange-text">
            {value}
          </text>
        </g>
      ))}
    </g>
  );
}

function SvgStation({ station, x, y, color, labelX, labelY, labelClass, navigate, interchangeY, textAnchor = 'start', terminal = false }) {
  const handleActivate = () => {
    if (station.id) {
      navigate(`/stations/${station.id}`);
    }
  };

  const isClickable = Boolean(station.id);

  return (
    <g
      className={`svg-station ${isClickable ? 'is-clickable' : 'is-disabled'}`}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
      role={isClickable ? 'link' : 'img'}
      tabIndex={isClickable ? 0 : -1}
      aria-label={station.displayName}
    >
      <circle cx={x} cy={y} r={terminal ? 12 : 7} fill={terminal ? color : '#ffffff'} stroke={color} strokeWidth={terminal ? 5 : 4} />
      {renderTextLines(station.displayName, labelX, labelY, labelClass, textAnchor)}
      <InterchangeBadges values={station.interchanges} x={labelX} y={interchangeY} compact />
    </g>
  );
}

function LineOneSchematic({ stations, color, navigate }) {
  const leftUpper = stations.slice(0, 12);
  const leftLower = stations.slice(12, 16);
  const innerLower = stations.slice(16, 21);
  const union = stations[21];
  const rightLower = stations.slice(22, 28);
  const rightUpper = stations.slice(28);

  const leftUpperNodes = leftUpper.map((station, index) => ({
    station,
    x: 170 + index * 12,
    y: 78 + index * 18,
  }));
  const leftLowerNodes = leftLower.map((station, index) => ({
    station,
    x: 302,
    y: 306 + index * 34,
  }));
  const innerLowerNodes = innerLower.map((station, index) => ({
    station,
    x: 318 + index * 10,
    y: 450 + index * 26,
  }));
  const unionNode = { station: union, x: 430, y: 620 };
  const rightLowerNodes = rightLower.map((station, index) => ({
    station,
    x: 520,
    y: 548 - index * 38,
  }));
  const rightUpperNodes = rightUpper.map((station, index) => ({
    station,
    x: 520,
    y: 286 - index * 22,
  }));

  return (
    <div className="schematic-scroll line-one-scroll">
      <svg className="svg-schematic line-one-schematic" viewBox="0 0 840 720" aria-label="Line 1 Yonge-University schematic">
        <path
          d="M170 78 L302 276 L302 410 Q302 510 430 620 Q520 560 520 320 L520 78"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text x="80" y="54" className="svg-line-title">Line 1</text>
        <text x="162" y="54" className="svg-line-subtitle">Yonge-University</text>

        {leftUpperNodes.map(({ station, x, y }, index) => (
          <SvgStation
            key={station.label}
            station={station}
            x={x}
            y={y}
            color={color}
            labelX={x - 22}
            labelY={y + 4}
            labelClass={`svg-station-name left ${index === 0 ? 'terminal' : ''}`}
            textAnchor="end"
            navigate={navigate}
            interchangeY={y + 18}
            terminal={index === 0}
          />
        ))}

        {leftLowerNodes.map(({ station, x, y }) => (
          <SvgStation
            key={station.label}
            station={station}
            x={x}
            y={y}
            color={color}
            labelX={x - 22}
            labelY={y + 4}
            labelClass="svg-station-name left"
            textAnchor="end"
            navigate={navigate}
            interchangeY={y + 18}
          />
        ))}

        {innerLowerNodes.map(({ station, x, y }) => (
          <SvgStation
            key={station.label}
            station={station}
            x={x}
            y={y}
            color={color}
            labelX={x - 28}
            labelY={y + 4}
            labelClass="svg-station-name left"
            textAnchor="end"
            navigate={navigate}
            interchangeY={y + 18}
          />
        ))}

        <SvgStation
          station={unionNode.station}
          x={unionNode.x}
          y={unionNode.y}
          color={color}
          labelX={unionNode.x}
          labelY={unionNode.y + 34}
          labelClass="svg-station-name center terminal"
          textAnchor="middle"
          navigate={navigate}
          interchangeY={unionNode.y - 24}
          terminal
        />

        {rightLowerNodes.map(({ station, x, y }) => (
          <SvgStation
            key={station.label}
            station={station}
            x={x}
            y={y}
            color={color}
            labelX={x + 22}
            labelY={y + 4}
            labelClass="svg-station-name right"
            navigate={navigate}
            interchangeY={y + 18}
          />
        ))}

        {rightUpperNodes.map(({ station, x, y }, index) => (
          <SvgStation
            key={station.label}
            station={station}
            x={x}
            y={y}
            color={color}
            labelX={x + 22}
            labelY={y + 4}
            labelClass={`svg-station-name right ${index === rightUpperNodes.length - 1 ? 'terminal' : ''}`}
            navigate={navigate}
            interchangeY={y + 18}
            terminal={index === rightUpperNodes.length - 1}
          />
        ))}
      </svg>
    </div>
  );
}

function HorizontalLineSchematic({ routeId, routeName, stations, color, navigate }) {
  const width = Math.max(820, 120 + (stations.length - 1) * 42);
  const y = routeId === '4' ? 170 : 190;
  const startX = 70;
  const endX = width - 70;
  const spacing = stations.length > 1 ? (endX - startX) / (stations.length - 1) : 0;

  return (
    <div className="schematic-scroll">
      <svg className="svg-schematic horizontal-schematic" viewBox={`0 0 ${width} 360`} aria-label={`${routeName} schematic`}>
        <line x1={startX} y1={y} x2={endX} y2={y} stroke={color} strokeWidth="10" strokeLinecap="round" />
        <text x="48" y="56" className="svg-line-title">{routeId}</text>
        <text x="94" y="56" className="svg-line-subtitle">{routeName.replace(/^Line \d+\s*/, '')}</text>

        {stations.map((station, index) => {
          const x = startX + spacing * index;
          const terminal = index === 0 || index === stations.length - 1;
          const labelY = routeId === '4' ? y - 24 : y - 20;
          const rotate = routeId === '4' ? '' : `rotate(-48 ${x - 4} ${labelY})`;
          const textClass = `svg-station-name horizontal ${terminal ? 'terminal' : ''}`;

          const handleActivate = () => {
            if (station.id) {
              navigate(`/stations/${station.id}`);
            }
          };

          const isClickable = Boolean(station.id);

          return (
            <g
              key={station.label}
              className={`svg-station ${isClickable ? 'is-clickable' : 'is-disabled'}`}
              onClick={handleActivate}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleActivate();
                }
              }}
              role={isClickable ? 'link' : 'img'}
              tabIndex={isClickable ? 0 : -1}
              aria-label={station.displayName}
            >
              <circle cx={x} cy={y} r={terminal ? 12 : 7} fill={terminal ? color : '#ffffff'} stroke={color} strokeWidth={terminal ? 5 : 4} />
              <text x={x - 4} y={labelY} transform={rotate} className={textClass} textAnchor={routeId === '4' ? 'middle' : 'end'}>
                {station.displayName}
              </text>
              <InterchangeBadges values={station.interchanges} x={x} y={y + 26} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function RapidLinesPage() {
  const { routeId = '1' } = useParams();
  const navigate = useNavigate();
  const [lines, setLines] = useState([]);
  const [lineData, setLineData] = useState({ routeId: '1', routeName: '', stations: [], colorClass: 'line-yellow', mode: 'subway' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const [rapidLines, currentLine] = await Promise.all([loadRapidLines(), loadLineStations(routeId)]);
        setLines(rapidLines);
        setLineData(currentLine);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load rapid line data.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [routeId]);

  const layout = RAPID_LINE_LAYOUTS[routeId] ?? RAPID_LINE_LAYOUTS['1'];
  const schematicStations = useMemo(() => enrichStations(layout.stations, lineData.stations), [layout.stations, lineData.stations]);
  const displayLine = lines.find((line) => line.id === routeId);
  const lineColor = LINE_COLORS[routeId] ?? LINE_COLORS['1'];

  return (
    <div className="app-shell">
      <TopNav />
      <Header lastUpdated={new Date().toISOString()} loading={loading} onRefresh={() => window.location.reload()} />
      <main className="main-content">
        {error ? <p className="panel status-message error-message">{error}</p> : null}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Rapid Transit Lines</h2>
              <p className="muted">Curated schematic layouts with station detail links.</p>
            </div>
          </div>
          <div className="line-selector">
            {lines.map((line) => (
              <NavLink key={line.id} className={({ isActive }) => `line-tab ${isActive ? 'active' : ''}`} to={`/lines/${line.id}`}>
                <span className={`line-dot ${line.colorClass}`} />
                {line.name}
              </NavLink>
            ))}
          </div>
        </section>

        <section className="panel schematic-panel">
          <div className="panel-heading">
            <div>
              <h2>{displayLine?.name ?? layout.routeName}</h2>
              <p className="muted">Shape is curated for the TTC line, while station detail still comes from backend data.</p>
            </div>
          </div>

          {layout.type === 'u' ? (
            <LineOneSchematic stations={schematicStations} color={lineColor} navigate={navigate} />
          ) : (
            <HorizontalLineSchematic
              routeId={routeId}
              routeName={displayLine?.name ?? layout.routeName}
              stations={schematicStations}
              color={lineColor}
              navigate={navigate}
            />
          )}
        </section>
      </main>
    </div>
  );
}
