import { useEffect, useRef, type PointerEvent } from 'react';
import { PAPER_HEIGHT, PAPER_WIDTH, type DrawingPoint, type DrawingStroke } from '@/lib/drawing-model';

type DrawingPadProps = {
  strokes: DrawingStroke[];
  onChange: (strokes: DrawingStroke[]) => void;
  color: string;
  tool: 'brush' | 'eraser';
};

function paintStroke(context: CanvasRenderingContext2D, stroke: DrawingStroke) {
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.beginPath();
  context.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.stroke();
}

export default function DrawingPad({ strokes, onChange, color, tool }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef<DrawingStroke | null>(null);
  const pointerId = useRef<number | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, PAPER_WIDTH, PAPER_HEIGHT);
    strokes.forEach((stroke) => paintStroke(context, stroke));
    if (activeStroke.current) paintStroke(context, activeStroke.current);
  }, [strokes]);

  const position = (event: PointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(PAPER_WIDTH, (event.clientX - bounds.left) / bounds.width * PAPER_WIDTH)),
      y: Math.max(0, Math.min(PAPER_HEIGHT, (event.clientY - bounds.top) / bounds.height * PAPER_HEIGHT)),
    };
  };

  const finishStroke = () => {
    const stroke = activeStroke.current;
    if (!stroke) return;
    activeStroke.current = null;
    pointerId.current = null;
    const next = [...strokesRef.current, stroke];
    strokesRef.current = next;
    onChange(next);
  };

  const appendPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStroke.current;
    if (!stroke || pointerId.current !== event.pointerId) return;
    const point = position(event);
    const previous = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1) return;
    stroke.points.push(point);
    const context = event.currentTarget.getContext('2d');
    if (context) paintStroke(context, { ...stroke, points: [previous, point] });
  };

  return (
    <canvas
      ref={canvasRef}
      width={PAPER_WIDTH}
      height={PAPER_HEIGHT}
      className={`drawing-paper drawing-paper--${tool}`}
      data-testid="drawing-paper"
      aria-label="ورقة الرسم البيضاء، استخدم الريشة أو الممحاة بإصبعك أو الماوس"
      style={{ display: 'block', width: '100%', height: 'auto', background: '#ffffff', touchAction: 'none' }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || pointerId.current !== null) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointerId.current = event.pointerId;
        activeStroke.current = {
          color: tool === 'eraser' ? '#FFFFFF' : color,
          width: tool === 'eraser' ? 38 : 12,
          points: [position(event)],
        };
        const context = event.currentTarget.getContext('2d');
        if (context) paintStroke(context, activeStroke.current);
      }}
      onPointerMove={appendPoint}
      onPointerUp={(event) => {
        if (event.pointerId !== pointerId.current) return;
        appendPoint(event);
        finishStroke();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        if (event.pointerId === pointerId.current) finishStroke();
      }}
      onLostPointerCapture={(event) => {
        if (event.pointerId === pointerId.current) finishStroke();
      }}
    >
      ورقة للرسم بالأزرق والأحمر والأبيض والأصفر.
    </canvas>
  );
}

export function DrawingPreview({ strokes, className }: { strokes: DrawingStroke[]; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${PAPER_WIDTH} ${PAPER_HEIGHT}`}
      className={className}
      role="img"
      aria-label="معاينة الرسم المحفوظ"
      style={{ background: '#ffffff' }}
    >
      <rect width={PAPER_WIDTH} height={PAPER_HEIGHT} fill="#FFFFFF" />
      {strokes.map((stroke, index) => stroke.points.length === 1 ? (
        <circle key={index} cx={stroke.points[0].x} cy={stroke.points[0].y} r={stroke.width / 2} fill={stroke.color} />
      ) : (
        <polyline
          key={index}
          points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </svg>
  );
}