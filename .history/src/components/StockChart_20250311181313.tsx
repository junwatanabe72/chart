import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Brush,
  Line,
  Legend,
  Area,
  ReferenceLine,
} from "recharts";

// 型とフックのインポート
import { StockData, StockStats } from "../types/stockTypes";
import { useStockData } from "../hooks/useStockData";
import { useChartInteraction } from "../hooks/useChartInteraction";

// サブコンポーネントのインポート
import CustomTooltip from "./chart/CustomTooltip";
import { renderCandlestick, renderOHLC, CustomCursor } from "./chart/ChartRenderers";
import RSIChart from "./chart/RSIChart";
import MACDChart from "./chart/MACDChart";
import KeyboardShortcutsHelp from "./chart/KeyboardShortcutsHelp";

const StockChart: React.FC = () => {
  // カスタムフックを使用してデータとチャート操作を管理
  const {
    stockData,
    stockDataWithIndicators,
    visibleData,
    loading,
    error,
    setXAxisDomain,
    updateVisibleData,
    xAxisDomain,
    indicators,
    toggleIndicator,
    bollingerPeriod,
    setBollingerPeriod,
    bollingerStdDev,
    setBollingerStdDev,
    rsiPeriod,
    setRsiPeriod,
    macdParams,
    setMacdParams,
  } = useStockData();

  const {
    isDragging,
    showCrosshair,
    toggleCrosshair,
    crosshairValues,
    setCrosshairValues,
    drawingMode,
    toggleDrawingMode,
    drawingLines,
    setDrawingLines,
    drawingStart,
    drawingEnd,
    selectedLine,
    setSelectedLine,
    lineColors,
    chartStyle,
    setChartStyle,
    showKeyboardShortcuts,
    setShowKeyboardShortcuts,
    chartRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    deleteLine
  } = useChartInteraction({
    stockData,
    updateVisibleData,
    setXAxisDomain,
    xAxisDomain
  });

  // 統計情報を計算
  const getStats = (): StockStats => {
    if (visibleData.length === 0) return { high: 0, low: 0, avg: "0" };

    const high = Math.max(...visibleData.map((item) => item.high));
    const low = Math.min(...visibleData.map((item) => item.low));
    const avg = visibleData.reduce((sum, item) => sum + item.close, 0) / visibleData.length;

    return { high, low, avg: avg.toFixed(2) };
  };

  const stats = getStats();

  // ドメイン（Y軸の範囲）を計算
  const calculateDomain = (): [number, number] => {
    let minPrice = Math.min(...visibleData.map((item) => item.low));
    let maxPrice = Math.max(...visibleData.map((item) => item.high));

    // テクニカル指標の値も考慮
    if (indicators.ma20) {
      const ma20Values = visibleData
        .filter((d) => d.ma20 !== null)
        .map((d) => d.ma20 as number);
      if (ma20Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma20Values);
        maxPrice = Math.max(maxPrice, ...ma20Values);
      }
    }

    // 他の移動平均線も同様に処理...

    // ボリンジャーバンドの値も考慮
    if (indicators.bollingerBands) {
      const upperValues = visibleData
        .filter((d) => d.bollingerUpper !== null)
        .map((d) => d.bollingerUpper as number);
      const lowerValues = visibleData
        .filter((d) => d.bollingerLower !== null)
        .map((d) => d.bollingerLower as number);

      if (upperValues.length > 0) {
        maxPrice = Math.max(maxPrice, ...upperValues);
      }

      if (lowerValues.length > 0) {
        minPrice = Math.min(minPrice, ...lowerValues);
      }
    }

    // パディングを追加
    const padding = (maxPrice - minPrice) * 0.05;
    return [minPrice - padding, maxPrice + padding];
  };

  const domain = calculateDomain();

  // 描画線のレンダリング
  const renderDrawingLines = () => {
    const allLines = [...drawingLines];

    // 描画モード中なら、現在の描画線も追加
    if (drawingMode && drawingStart && drawingEnd) {
      allLines.push({
        id: "current