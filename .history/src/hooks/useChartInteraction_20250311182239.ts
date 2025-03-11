import { useState, useRef, useEffect } from "react";
import { DrawingLine, ChartStyleType, StockData } from "../types/stockTypes";

interface UseChartInteractionProps {
  stockData: StockData[];
  updateVisibleData: (start: number, end: number) => void;
  setXAxisDomain: (domain: [number, number] | null) => void;
  xAxisDomain: [number, number] | null;
}

export const useChartInteraction = ({
  stockData,
  updateVisibleData,
  setXAxisDomain,
  xAxisDomain,
}: UseChartInteractionProps) => {
  // チャート操作の状態
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [showCrosshair, setShowCrosshair] = useState<boolean>(true);
  const [crosshairValues, setCrosshairValues] = useState<{
    x: number;
    y: number;
    xValue: string;
    yValue: number;
  } | null>(null);

  // 描画ツールの状態
  const [drawingMode, setDrawingMode] = useState<
    "trendline" | "horizontalline" | null
  >(null);
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([]);
  const [drawingStart, setDrawingStart] = useState<{
    index: number;
    price: number;
  } | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<{
    index: number;
    price: number;
  } | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [lineColors] = useState<string[]>([
    "#FF5722",
    "#2196F3",
    "#4CAF50",
    "#9C27B0",
    "#E91E63",
  ]);

  // チャートスタイルの状態
  const [chartStyle, setChartStyle] = useState<ChartStyleType>("candlestick");
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] =
    useState<boolean>(false);

  const chartRef = useRef<HTMLDivElement>(null);

  // クロスヘアー表示切替関数
  const toggleCrosshair = () => {
    setShowCrosshair(!showCrosshair);
  };

  // 描画モード切替関数
  const toggleDrawingMode = (mode: "trendline" | "horizontalline" | null) => {
    setDrawingMode(drawingMode === mode ? null : mode);
  };

  // ズームリセット
  const resetZoom = () => {
    setXAxisDomain(null);
    updateVisibleData(0, stockData.length - 1);
  };

  // 描画線を削除する関数
  const deleteLine = (id: string) => {
    setDrawingLines(drawingLines.filter((line) => line.id !== id));
    setSelectedLine(null);
  };

  // ホイールイベントハンドラ（ズーム）
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (stockData.length === 0) return;

    // 現在の表示範囲を取得
    const start = xAxisDomain ? xAxisDomain[0] : 0;
    const end = xAxisDomain ? xAxisDomain[1] : stockData.length - 1;
    const range = end - start;

    // ズーム方向に基づいて新しい範囲を計算
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // ズームアウトまたはズームイン
    const newRange = Math.max(
      5,
      Math.min(stockData.length, range * zoomFactor)
    );

    // 現在のビューの中心点を比率として計算
    const center = e.nativeEvent.offsetX / e.currentTarget.clientWidth;

    // 中心点に基づいて新しい開始と終了を計算
    let newStart = Math.max(0, start + (range - newRange) * center);
    const newEnd = Math.min(stockData.length - 1, newStart + newRange);

    // 終了が最大の場合は開始を調整
    if (newEnd === stockData.length - 1) {
      newStart = Math.max(0, newEnd - newRange);
    }

    setXAxisDomain([newStart, newEnd]);
    updateVisibleData(newStart, newEnd);
  };

  // マウスダウンイベントハンドラ
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode) {
      // チャートの寸法と座標を取得
      const chartRect = chartRef.current?.getBoundingClientRect();
      if (!chartRect) return;

      // チャート内の相対位置を計算
      const relativeX = e.clientX - chartRect.left;
      const relativeY = e.clientY - chartRect.top;

      // データ座標に変換
      const chartWidth = chartRect.width;
      const chartHeight = chartRect.height;

      const visibleStartIndex = xAxisDomain ? Math.floor(xAxisDomain[0]) : 0;
      const visibleEndIndex = xAxisDomain
        ? Math.ceil(xAxisDomain[1])
        : stockData.length - 1;
      const visibleRange = visibleEndIndex - visibleStartIndex;

      const indexPosition =
        visibleStartIndex + (relativeX / chartWidth) * visibleRange;
      const indexRounded = Math.round(indexPosition);

      // Y位置から価格を計算（反転）
      // 注意: domainはここでは使用できないため、実際の実装では別の方法が必要
      const minPrice = 0; // 仮の値
      const maxPrice = 1000; // 仮の値
      const priceRange = maxPrice - minPrice;
      const price = maxPrice - (relativeY / chartHeight) * priceRange;

      // 描画開始点を設定
      setDrawingStart({ index: indexRounded, price });
      setDrawingEnd(null);
    } else {
      // 元のパン機能
      setIsDragging(true);
      setDragStartX(e.clientX);
    }
  };

  // マウス移動イベントハンドラ
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 描画モード中の処理
    if (drawingMode && drawingStart) {
      // チャートの寸法と座標を取得
      const chartRect = chartRef.current?.getBoundingClientRect();
      if (!chartRect) return;

      // チャート内の相対位置を計算
      const relativeX = e.clientX - chartRect.left;
      const relativeY = e.clientY - chartRect.top;

      // データ座標に変換
      const chartWidth = chartRect.width;
      const chartHeight = chartRect.height;

      const visibleStartIndex = xAxisDomain ? Math.floor(xAxisDomain[0]) : 0;
      const visibleEndIndex = xAxisDomain
        ? Math.ceil(xAxisDomain[1])
        : stockData.length - 1;
      const visibleRange = visibleEndIndex - visibleStartIndex;

      const indexPosition =
        visibleStartIndex + (relativeX / chartWidth) * visibleRange;
      const indexRounded = Math.round(indexPosition);

      // Y位置から価格を計算（反転）
      // 注意: domainはここでは使用できないため、実際の実装では別の方法が必要
      const minPrice = 0; // 仮の値
      const maxPrice = 1000; // 仮の値
      const priceRange = maxPrice - minPrice;
      const price = maxPrice - (relativeY / chartHeight) * priceRange;

      // 描画終了点を更新
      if (drawingMode === "horizontalline") {
        // 水平線の場合、両方の点で同じ価格を保持
        setDrawingEnd({ index: indexRounded, price: drawingStart.price });
      } else {
        setDrawingEnd({ index: indexRounded, price });
      }
    }
    // ドラッグ中のパン処理
    else if (isDragging && dragStartX !== null && xAxisDomain) {
      const chartWidth = chartRef.current?.clientWidth || 1;
      const moveRatio = (dragStartX - e.clientX) / chartWidth;
      const domainRange = xAxisDomain[1] - xAxisDomain[0];
      const moveDelta = moveRatio * domainRange;

      // 新しいドメインを計算
      let newStart = Math.max(0, xAxisDomain[0] + moveDelta);
      let newEnd = Math.min(stockData.length - 1, xAxisDomain[1] + moveDelta);

      // ドメイン範囲を一定に保つ
      if (newStart === 0) {
        newEnd = Math.min(stockData.length - 1, newStart + domainRange);
      } else if (newEnd === stockData.length - 1) {
        newStart = Math.max(0, newEnd - domainRange);
      }

      setXAxisDomain([newStart, newEnd]);
      updateVisibleData(newStart, newEnd);
      setDragStartX(e.clientX);
    }
  };

  // マウスアップイベントハンドラ
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode && drawingStart && drawingEnd) {
      // 新しい描画線を追加
      const newLine: DrawingLine = {
        id: `line-${Date.now()}`,
        type: drawingMode,
        startIndex: drawingStart.index,
        startPrice: drawingStart.price,
        endIndex: drawingEnd.index,
        endPrice: drawingEnd.price,
        color: lineColors[drawingLines.length % lineColors.length],
      };

      setDrawingLines([...drawingLines, newLine]);

      // 描画点をリセット
      setDrawingStart(null);
      setDrawingEnd(null);
    } else {
      // 元のパン機能終了
      setIsDragging(false);
      setDragStartX(null);
    }
  };

  // キーボードショートカットハンドラー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 処理するキーのデフォルト動作を防止
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "-",
          "c",
          "t",
          "h",
          "r",
          "m",
          "b",
          "1",
          "2",
          "3",
          "4",
          "?",
          "Escape",
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      // ナビゲーションショートカット
      if (e.key === "ArrowLeft") {
        // 左にパン
        if (xAxisDomain) {
          const domainRange = xAxisDomain[1] - xAxisDomain[0];
          const panAmount = domainRange * 0.1;
          const newStart = Math.max(0, xAxisDomain[0] - panAmount);
          const newEnd = newStart + domainRange;

          if (newEnd <= stockData.length - 1) {
            setXAxisDomain([newStart, newEnd]);
            updateVisibleData(newStart, newEnd);
          }
        }
      } else if (e.key === "ArrowRight") {
        // 右にパン
        if (xAxisDomain) {
          const domainRange = xAxisDomain[1] - xAxisDomain[0];
          const panAmount = domainRange * 0.1;
          const newEnd = Math.min(
            stockData.length - 1,
            xAxisDomain[1] + panAmount
          );
          const newStart = newEnd - domainRange;

          if (newStart >= 0) {
            setXAxisDomain([newStart, newEnd]);
            updateVisibleData(newStart, newEnd);
          }
        }
      } else if (e.key === "+" || e.key === "=") {
        // ズームイン
        if (xAxisDomain) {
          const start = xAxisDomain[0];
          const end = xAxisDomain[1];
          const range = end - start;
          const newRange = range * 0.8;

          // 中心からズームイン
          const center = (start + end) / 2;
          const newStart = Math.max(0, center - newRange / 2);
          const newEnd = Math.min(stockData.length - 1, center + newRange / 2);

          setXAxisDomain([newStart, newEnd]);
          updateVisibleData(newStart, newEnd);
        }
      } else if (e.key === "-" || e.key === "_") {
        // ズームアウト
        if (xAxisDomain) {
          const start = xAxisDomain[0];
          const end = xAxisDomain[1];
          const range = end - start;
          const newRange = range * 1.2;

          // 中心からズームアウト
          const center = (start + end) / 2;
          const newStart = Math.max(0, center - newRange / 2);
          const newEnd = Math.min(stockData.length - 1, center + newRange / 2);

          setXAxisDomain([newStart, newEnd]);
          updateVisibleData(newStart, newEnd);
        }
      } else if (e.key === "Escape") {
        // ズームリセット
        resetZoom();
        // 描画モードをクリア
        setDrawingMode(null);
      } else if (e.key === "c") {
        // クロスヘアー切替
        toggleCrosshair();
      } else if (e.key === "t") {
        // トレンドライン描画モード切替
        toggleDrawingMode(drawingMode === "trendline" ? null : "trendline");
      } else if (e.key === "h") {
        // 水平線描画モード切替
        toggleDrawingMode(
          drawingMode === "horizontalline" ? null : "horizontalline"
        );
      } else if (e.key === "1") {
        // ローソク足に切替
        setChartStyle("candlestick");
      } else if (e.key === "2") {
        // OHLCに切替
        setChartStyle("ohlc");
      } else if (e.key === "3") {
        // ラインに切替
        setChartStyle("line");
      } else if (e.key === "4") {
        // エリアに切替
        setChartStyle("area");
      } else if (e.key === "?") {
        // キーボードショートカットヘルプ表示切替
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
      }
    };

    // イベントリスナーを追加
    window.addEventListener("keydown", handleKeyDown);

    // クリーンアップ
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    xAxisDomain,
    stockData.length,
    showCrosshair,
    drawingMode,
    chartStyle,
    showKeyboardShortcuts,
    resetZoom,
    toggleCrosshair,
    updateVisibleData,
    toggleDrawingMode,
  ]);

  return {
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
    deleteLine,
  };
};
