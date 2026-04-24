export interface Point {
  type: 'point';
  id?: string;
  x: number;
  y: number;
  label?: string;
}

export interface Line {
  type: 'line';
  from?: string;
  to?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  label?: string;
  equation?: string;
  color?: string;
}

export interface Circle {
  type: 'circle';
  center: { x: number; y: number };
  radius: number;
  label?: string;
}

export interface Arc {
  type: 'arc';
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
  label?: string;
}

export interface Angle {
  type: 'angle';
  vertex: string;
  value: string;
}

export interface Axis {
  type: 'axis';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Shape3D {
  type: 'cylinder' | 'cone' | 'sphere';
  radius: number;
  height?: number;
  label?: string;
  labels?: { radius?: string; height?: string; slant?: string };
}

export interface Annotation {
  type: 'measurement';
  text: string;
  position: { x: number; y: number };
}

export type DiagramElement = Point | Line | Circle | Arc | Angle | Axis | Shape3D;

export interface GeometryDiagramProps {
  diagram: {
    diagramType: string;
    elements: DiagramElement[];
    annotations?: Annotation[];
  };
  width?: number;
  height?: number;
}

export function GeometryDiagram({ diagram, width = 300, height = 250 }: GeometryDiagramProps) {
  if (!diagram || !diagram.elements || diagram.elements.length === 0) {
    return null;
  }

  const padding = 30;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const axisElement = diagram.elements.find((el): el is Axis => el.type === 'axis');
  const hasAxisBounds = axisElement && (axisElement.xMin !== undefined);
  
  const normalizeX = (x: number) => {
    if (hasAxisBounds) {
      return (x - axisElement.xMin) / (axisElement.xMax - axisElement.xMin);
    }
    return x > 1 || x < 0 ? (x + 5) / 10 : x;
  };
  
  const normalizeY = (y: number) => {
    if (hasAxisBounds) {
      return (y - axisElement.yMin) / (axisElement.yMax - axisElement.yMin);
    }
    return y > 1 || y < 0 ? (y + 5) / 10 : y;
  };

  const points: Record<string, { x: number; y: number }> = {};
  diagram.elements.forEach((el) => {
    if (el.type === 'point' && (el as Point).id) {
      const p = el as Point;
      points[p.id!] = { x: p.x, y: p.y };
    }
  });

  const toCanvasX = (x: number) => padding + normalizeX(x) * innerWidth;
  const toCanvasY = (y: number) => padding + (1 - normalizeY(y)) * innerHeight;

  const renderElement = (el: DiagramElement, idx: number) => {
    switch (el.type) {
      case 'point': {
        const p = el as Point;
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        return (
          <g key={`point-${idx}`}>
            <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />
            {p.label && (
              <text x={cx + 8} y={cy - 8} fontSize={12} fill="#1e40af" fontWeight="bold">
                {p.label}
              </text>
            )}
          </g>
        );
      }

      case 'line': {
        const l = el as Line;
        let x1: number, y1: number, x2: number, y2: number;
        
        if (l.from && l.to && points[l.from] && points[l.to]) {
          x1 = toCanvasX(points[l.from].x);
          y1 = toCanvasY(points[l.from].y);
          x2 = toCanvasX(points[l.to].x);
          y2 = toCanvasY(points[l.to].y);
        } else if (l.x1 !== undefined && l.y1 !== undefined && l.x2 !== undefined && l.y2 !== undefined) {
          x1 = toCanvasX(l.x1);
          y1 = toCanvasY(l.y1);
          x2 = toCanvasX(l.x2);
          y2 = toCanvasY(l.y2);
        } else {
          return null;
        }
        
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        return (
          <g key={`line-${idx}`}>
            <line 
              x1={x1} y1={y1} x2={x2} y2={y2} 
              stroke={l.color || "#1e40af"} 
              strokeWidth={2} 
            />
            {l.label && (
              <text x={midX + 5} y={midY - 5} fontSize={11} fill="#374151" fontWeight="500">
                {l.label}
              </text>
            )}
          </g>
        );
      }

      case 'circle': {
        const c = el as Circle;
        const cx = toCanvasX(c.center.x);
        const cy = toCanvasY(c.center.y);
        const r = c.radius * Math.min(innerWidth, innerHeight);
        
        return (
          <g key={`circle-${idx}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth={2} />
            {c.label && (
              <text x={cx} y={cy + 4} fontSize={12} fill="#1e40af" textAnchor="middle" fontWeight="bold">
                {c.label}
              </text>
            )}
          </g>
        );
      }

      case 'arc': {
        const a = el as Arc;
        const cx = toCanvasX(a.center.x);
        const cy = toCanvasY(a.center.y);
        const r = a.radius * Math.min(innerWidth, innerHeight);
        const startRad = (a.startAngle * Math.PI) / 180;
        const endRad = (a.endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy - r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy - r * Math.sin(endRad);
        const largeArc = a.endAngle - a.startAngle > 180 ? 1 : 0;
        
        return (
          <g key={`arc-${idx}`}>
            <path
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`}
              fill="none"
              stroke="#10b981"
              strokeWidth={3}
            />
            {a.label && (
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} fontSize={11} fill="#059669" fontWeight="500">
                {a.label}
              </text>
            )}
          </g>
        );
      }

      case 'angle': {
        const ang = el as Angle;
        if (!points[ang.vertex]) return null;
        const vx = toCanvasX(points[ang.vertex].x);
        const vy = toCanvasY(points[ang.vertex].y);
        
        if (ang.value === '90°') {
          return (
            <g key={`angle-${idx}`}>
              <rect x={vx} y={vy - 12} width={12} height={12} fill="none" stroke="#6366f1" strokeWidth={1.5} />
            </g>
          );
        }
        return (
          <text key={`angle-${idx}`} x={vx + 15} y={vy - 15} fontSize={10} fill="#6366f1">
            {ang.value}
          </text>
        );
      }

      case 'axis': {
        const ax = el as Axis;
        const xRange = ax.xMax - ax.xMin;
        const yRange = ax.yMax - ax.yMin;
        const originX = padding + ((-ax.xMin) / xRange) * innerWidth;
        const originY = padding + ((ax.yMax) / yRange) * innerHeight;
        
        return (
          <g key={`axis-${idx}`}>
            <line x1={padding} y1={originY} x2={width - padding} y2={originY} stroke="#9ca3af" strokeWidth={1} />
            <line x1={originX} y1={padding} x2={originX} y2={height - padding} stroke="#9ca3af" strokeWidth={1} />
            <text x={width - padding + 5} y={originY + 4} fontSize={10} fill="#6b7280">x</text>
            <text x={originX + 5} y={padding - 5} fontSize={10} fill="#6b7280">y</text>
            {[...Array(Math.floor(xRange) + 1)].map((_, i) => {
              const val = ax.xMin + i;
              if (val === 0) return null;
              const x = padding + (i / xRange) * innerWidth;
              return (
                <g key={`xtick-${i}`}>
                  <line x1={x} y1={originY - 3} x2={x} y2={originY + 3} stroke="#9ca3af" strokeWidth={1} />
                  <text x={x} y={originY + 12} fontSize={8} fill="#9ca3af" textAnchor="middle">{val}</text>
                </g>
              );
            })}
            {[...Array(Math.floor(yRange) + 1)].map((_, i) => {
              const val = ax.yMax - i;
              if (val === 0) return null;
              const y = padding + (i / yRange) * innerHeight;
              return (
                <g key={`ytick-${i}`}>
                  <line x1={originX - 3} y1={y} x2={originX + 3} y2={y} stroke="#9ca3af" strokeWidth={1} />
                  <text x={originX - 10} y={y + 3} fontSize={8} fill="#9ca3af" textAnchor="end">{val}</text>
                </g>
              );
            })}
          </g>
        );
      }

      case 'cylinder': {
        const s = el as Shape3D;
        const cx = width / 2;
        const topY = padding + 20;
        const bottomY = height - padding - 20;
        const rx = s.radius * innerWidth;
        const ry = rx * 0.3;
        
        return (
          <g key={`cylinder-${idx}`}>
            <ellipse cx={cx} cy={topY} rx={rx} ry={ry} fill="none" stroke="#3b82f6" strokeWidth={2} />
            <line x1={cx - rx} y1={topY} x2={cx - rx} y2={bottomY} stroke="#3b82f6" strokeWidth={2} />
            <line x1={cx + rx} y1={topY} x2={cx + rx} y2={bottomY} stroke="#3b82f6" strokeWidth={2} />
            <ellipse cx={cx} cy={bottomY} rx={rx} ry={ry} fill="none" stroke="#3b82f6" strokeWidth={2} />
            {s.labels?.radius && (
              <text x={cx + rx + 10} y={bottomY} fontSize={11} fill="#374151">{s.labels.radius}</text>
            )}
            {s.labels?.height && (
              <text x={cx - rx - 20} y={(topY + bottomY) / 2} fontSize={11} fill="#374151">{s.labels.height}</text>
            )}
          </g>
        );
      }

      case 'cone': {
        const s = el as Shape3D;
        const cx = width / 2;
        const topY = padding + 20;
        const bottomY = height - padding - 20;
        const rx = s.radius * innerWidth;
        const ry = rx * 0.3;
        
        return (
          <g key={`cone-${idx}`}>
            <line x1={cx} y1={topY} x2={cx - rx} y2={bottomY} stroke="#3b82f6" strokeWidth={2} />
            <line x1={cx} y1={topY} x2={cx + rx} y2={bottomY} stroke="#3b82f6" strokeWidth={2} />
            <ellipse cx={cx} cy={bottomY} rx={rx} ry={ry} fill="none" stroke="#3b82f6" strokeWidth={2} />
            <circle cx={cx} cy={topY} r={3} fill="#3b82f6" />
            {s.labels?.radius && (
              <text x={cx + rx + 10} y={bottomY} fontSize={11} fill="#374151">{s.labels.radius}</text>
            )}
            {s.labels?.height && (
              <text x={cx + 10} y={(topY + bottomY) / 2} fontSize={11} fill="#374151">{s.labels.height}</text>
            )}
          </g>
        );
      }

      case 'sphere': {
        const s = el as Shape3D;
        const cx = width / 2;
        const cy = height / 2;
        const r = s.radius * Math.min(innerWidth, innerHeight);
        
        return (
          <g key={`sphere-${idx}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth={2} />
            <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4,4" />
            <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#10b981" strokeWidth={1.5} />
            {s.label && (
              <text x={cx + r / 2} y={cy - 8} fontSize={11} fill="#374151">{s.label}</text>
            )}
          </g>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 my-3">
      <svg width={width} height={height} className="mx-auto">
        <rect x={0} y={0} width={width} height={height} fill="#fafafa" rx={4} />
        {diagram.elements.map((el, idx) => renderElement(el, idx))}
        {diagram.annotations?.map((ann, idx) => (
          <text 
            key={`ann-${idx}`}
            x={toCanvasX(ann.position.x)} 
            y={toCanvasY(ann.position.y)}
            fontSize={11}
            fill="#6b7280"
            textAnchor="middle"
          >
            {ann.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
