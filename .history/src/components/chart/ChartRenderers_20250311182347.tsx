import React from "react";
import { StockData } from "../../types/stockTypes";

// レンダラープロップスの型定義
interface RendererProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: {
    open: number;
    close: number;
    high: number;
    low: number;
  };
  visibleData?: StockData[];
  stockData?: StockData[];
}

// カーソルプロップスの型定義
interface CursorProps {
  points: { x: number; y: number }[];
  width: number;
  height: number;
  stroke?: string;
  showCrosshair?: boolean;
  crosshairValues?: {
    xValue: string;
    yValue: number;
  };
}

// ローソク足レンダラー
// eslint-disable-next-line react-refresh/only-export-components
export const renderCandlestick = (props: any) => {
  const { x, y, width, height, index, payload } = props;
  const { open, close, high, low } = payload;

  const isUp = close >= open;
  const color = isUp ? "#22c55e" : "#ef4444";

  // 見える価格範囲に基づいて位置を計算
  const maxHeight = height;
  const allPrices = props.visibleData?.flatMap((d) => [d.high, d.low]) || [];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  // ローソク足の各部分のY位置を計算
  const highY = y + maxHeight * (1 - (high - minPrice) / priceRange);
  const lowY = y + maxHeight * (1 - (low - minPrice) / priceRange);
  const openY = y + maxHeight * (1 - (open - minPrice) / priceRange);
  const closeY = y + maxHeight * (1 - (close - minPrice) / priceRange);

  // ボディ位置を計算
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyHeight = bodyBottom - bodyTop;
  // 表示データ数に基づいて最適なローソク幅を計算
  const zoomLevel =
    (props.stockData?.length || 0) / (props.visibleData?.length || 1) || 1;
  const candleWidth = Math.max(1, Math.min(15, width * 0.7));

  return (
    <g key={`candlestick-${index}`}>
      {/* 垂直線（ヒゲ）を描画 */}
      <line
        x1={x + width / 2}
        y1={highY}
        x2={x + width / 2}
        y2={lowY}
        stroke={color}
        strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
      />

      {/* ボディを描画 */}
      <rect
        x={x + (width - candleWidth) / 2}
        y={bodyTop}
        width={candleWidth}
        height={Math.max(1, bodyHeight)}
        fill={color}
      />
    </g>
  );
};

// OHLCレンダラー
export const renderOHLC = (props: any) => {
  const { x, y, width, height, index, payload } = props;
  const { open, close, high, low } = payload;

  const color = close >= open ? "#22c55e" : "#ef4444";

  // 見える価格範囲に基づいて位置を計算
  const allPrices = props.visibleData?.flatMap((d) => [d.high, d.low]) || [];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  // ライン位置を計算
  const highY = y + height * (1 - (high - minPrice) / priceRange);
  const lowY = y + height * (1 - (low - minPrice) / priceRange);
  const openY = y + height * (1 - (open - minPrice) / priceRange);
  const closeY = y + height * (1 - (close - minPrice) / priceRange);
  // 表示データ数に基づいて最適なティック幅を計算
  const zoomLevel =
    (props.stockData?.length || 0) / (props.visibleData?.length || 1) || 1;
  const tickWidth = Math.max(1, Math.min(10, width * 0.4));

  return (
    <g key={`ohlc-${index}`}>
      {/* 高値から安値への垂直線 */}
      <line
        x1={x + width / 2}
        y1={highY}
        x2={x + width / 2}
        y2={lowY}
        stroke={color}
        strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
      />

      {/* 始値ティック（左） */}
      <line
        x1={x + width / 2 - tickWidth}
        y1={openY}
        x2={x + width / 2}
        y2={openY}
        stroke={color}
        strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
      />

      {/* 終値ティック（右） */}
      <line
        x1={x + width / 2}
        y1={closeY}
        x2={x + width / 2 + tickWidth}
        y2={closeY}
        stroke={color}
        strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
      />
    </g>
  );
};

// カスタムカーソル（クロスヘアー）
export const CustomCursor = (props: any) => {
  const { points, width, height, stroke } = props;
  const { x, y } = points[0];
  const { showCrosshair, crosshairValues } = props;

  if (!showCrosshair || !crosshairValues) return null;

  return (
    <g>
      {/* 垂直線 */}
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#666"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {/* 水平線 */}
      <line
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#666"
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Y軸値の表示 */}
      <rect
        x={width - 70}
        y={y - 10}
        width={70}
        height={20}
        fill="rgba(0, 0, 0, 0.7)"
        rx={3}
      />
      <text
        x={width - 35}
        y={y + 5}
        textAnchor="middle"
        fill="#fff"
        fontSize={12}
      >
        {crosshairValues.yValue.toFixed(2)}
      </text>

      {/* X軸値の表示 */}
      <rect
        x={x - 40}
        y={height - 20}
        width={80}
        height={20}
        fill="rgba(0, 0, 0, 0.7)"
        rx={3}
      />
      <text x={x} y={height - 5} textAnchor="middle" fill="#fff" fontSize={12}>
        {crosshairValues.xValue}
      </text>
    </g>
  );
};
